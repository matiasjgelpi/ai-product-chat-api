import { Injectable } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { ProductsService } from '../../products/products.service';
import { CartsService } from '../../carts/carts.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ChatService {
  constructor(
    private geminiService: GeminiService,
    private productsService: ProductsService,
    private cartsService: CartsService,
    private configService: ConfigService,
  ) {}

  async ask(body: { message: string }, from = '3194014') {
    const functions = [
      {
        name: 'get_products',
        description:
          'Busca y filtra productos específicos por tipo, tamaño, color, categoría, precio, disponibilidad o términos de búsqueda general. Úsalo cuando el usuario pregunte por productos específicos.',
        parameters: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description:
                'Término de búsqueda general para buscar en tipo, categoría y descripción',
            },
            type: {
              type: 'string',
              description:
                'Tipo específico de producto: camiseta, pantalón, chaqueta, falda, sudadera, etc.',
            },
            size: {
              type: 'string',
              description: 'Talla del producto: S, M, L, XL, XXL',
            },
            color: {
              type: 'string',
              description:
                'Color del producto: rojo, azul, verde, negro, blanco, etc.',
            },
            category: {
              type: 'string',
              description: 'Categoría: casual, formal, deportivo, etc.',
            },
            minPrice: {
              type: 'number',
              description: 'Precio mínimo',
            },
            maxPrice: {
              type: 'number',
              description: 'Precio máximo',
            },
            available: {
              type: 'boolean',
              description: 'Si está disponible en stock',
            },
          },
        },
      },
      {
        name: 'create_cart',
        description: 'Crea un carrito con items',
        parameters: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    description: 'Tipo de producto (camiseta, pantalón, etc.)',
                  },
                  size: {
                    type: 'string',
                    description: 'Talla: S, M, L, XL, etc.',
                  },
                  color: {
                    type: 'string',
                    description: 'Color: rojo, azul, negro, etc.',
                  },
                  category: {
                    type: 'string',
                    description: 'Categoría: casual, formal, deportivo, etc.',
                  },
                  qty: { type: 'integer', description: 'Cantidad solicitada' },
                },
                required: ['type', 'qty'],
              },
            },
          },
          required: ['items'],
        },
      },

      {
        name: 'get_cart',
        description:
          'Obtiene la información completa del carrito de un usuario',
        parameters: {
          type: 'object',
        },
      },
      {
        name: 'delete_cart',
        description: 'Elimina el carrito actual del usuario (vaciar carrito)',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
    ];

    const aiResp = await this.geminiService.callWithFunctions(
      body.message,
      functions,
    );

    if (aiResp.function_call) {
      const { name, args } = aiResp.function_call;

      if (name === 'get_products') {
        const products = await this.productsService.getProducts(args);
        const final = await this.geminiService.continueWithFunctionResult(
          aiResp,
          products,
        );
        return { reply: final };
      }

      if (name === 'create_cart') {
        const resolvedItems = [];
        for (const item of args.items) {
          const found = await this.productsService.getProducts({
            type: item.type,
            size: item.size,
            color: item.color,
          });

          if (found.length === 0) {
            return {
              reply: `No encontré un producto que coincida con: ${item.type} ${item.color || ''} ${item.size || ''}`,
            };
          }

          const product = found[0];
          resolvedItems.push({ product_id: product.id, qty: item.qty });
        }

        // 👇 primero revisa si ya existe carrito
        const existingCart = await this.cartsService.getCart(from);

        let cart;
        if (existingCart && existingCart.cart_items) {
          cart = await this.cartsService.updateCart(from, resolvedItems);
        } else {
          cart = await this.cartsService.createCart(from, resolvedItems);
        }

        const final = await this.geminiService.continueWithFunctionResult(
          aiResp,
          cart,
        );
        return { reply: final };
      }

      if (name === 'delete_cart') {
        await this.cartsService.deleteCartBySessionId(from);
        const final = await this.geminiService.continueWithFunctionResult(
          aiResp,
          { success: true },
        );
        return { reply: final };
      }

      if (name === 'get_cart') {
        const cart = await this.cartsService.getCart(from);
        const final = await this.geminiService.continueWithFunctionResult(
          aiResp,
          cart,
        );
        return { reply: final };
      }
    }

    return { reply: aiResp.text };
  }

  private async sendWhatsAppMessage(to: string, text: string) {
    const token = this.configService.get('WP_ACCESS_TOKEN'); // Tu token permanente de Meta
    const phoneNumberId = this.configService.get('WP_PHONE_NUMBER_ID'); // El ID de tu número de WA Business

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Error enviando mensaje: ${error}`);
    } else {
      console.log(`Mensaje enviado a ${to}`);
    }
  }
}
