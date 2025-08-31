import { Body, Controller, Logger, Post, Req, Res } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { Request, Response } from 'express';
import { CartsService } from '../carts/carts.service';
import { GeminiService } from './gemini.service';

@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);
  constructor(
    private geminiService: GeminiService,
    private productsService: ProductsService,
    private cartsService: CartsService,
  ) {}

  @Post()
  async ask(@Body() body: { message: string }) {
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
      // {
      //   name: 'update_cart',
      //   description:
      //     'Modifica un carrito existente (agrega, cambia o quita productos)',
      //   parameters: {
      //     type: 'object',
      //     properties: {
      //       items: {
      //         type: 'array',
      //         items: {
      //           type: 'object',
      //           properties: {
      //             type: {
      //               type: 'string',
      //               description: 'Tipo de producto (camiseta, pantalón, etc.)',
      //             },
      //             size: {
      //               type: 'string',
      //               description: 'Talla: S, M, L, XL, etc.',
      //             },
      //             color: {
      //               type: 'string',
      //               description: 'Color: rojo, azul, negro, etc.',
      //             },
      //             category: {
      //               type: 'string',
      //               description: 'Categoría: casual, formal, deportivo, etc.',
      //             },
      //             qty: { type: 'integer', description: 'Cantidad solicitada' },
      //           },
      //           required: ['type', 'qty'],
      //         },
      //       },
      //     },
      //     required: ['items'],
      //   },
      // },
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

    console.log('Resp:', aiResp);

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
        console.log('Items:', args.items);

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
        const existingCart = await this.cartsService.getCart('3194014');

        console.log('Existente cart:', existingCart);
        let cart;
        if (existingCart && existingCart.cart_items) {
          console.log('Existente cart:', existingCart);
          cart = await this.cartsService.updateCart('3194014', resolvedItems);
        } else {
          cart = await this.cartsService.createCart('3194014', resolvedItems);
        }

        const final = await this.geminiService.continueWithFunctionResult(
          aiResp,
          cart,
        );
        return { reply: final };
      }

      if (name === 'delete_cart') {
        await this.cartsService.deleteCartBySessionId('3194014');
        const final = await this.geminiService.continueWithFunctionResult(
          aiResp,
          { success: true },
        );
        return { reply: final };
      }

      if (name === 'get_cart') {
        const cart = await this.cartsService.getCart('3194014');
        const final = await this.geminiService.continueWithFunctionResult(
          aiResp,
          cart,
        );
        return { reply: final };
      }
    }

    return { reply: aiResp.text };
  }

  @Post('webhookv')
  verifyWebhook(@Req() req: Request, @Res() res: Response) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const body = req.body;

    console.log('Recibido:', JSON.stringify(body, null, 2));

    console.log('Mode:', req.query);

    // Tu token de verificación (debes cambiarlo)
    const VERIFY_TOKEN =
      'EAAK4gA3DsuUBPQwA5EVCR2WRS3LK6K8u17q2yleLVrfZAkwQ50NTi1294Mm9ew90LjsQSF27oIxnrdppqTsg1qsUW9aStsPLV8dWYQZBsMXqhTUt4TyWNtcsTa6qqG3ZBbotaWxLJfq1dIvJJ4RRvlnqC0ZCVJcgAzAXfRF5raIDf9kkv4AbyQofH4dihticsDZAGxljO6116h44o0FCNeKQhvu5gskWT4dIwaMP8MQZDZD';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      this.logger.log('Webhook verificado correctamente');
      return res.status(200).send(challenge);
    } else {
      this.logger.error('Verificación fallida');
      return res.sendStatus(403);
    }
  }

  // Para recibir mensajes
  @Post('webhook')
  receiveMessage(@Req() req: Request, @Res() res: Response) {
    try {
      const body = req.body;

      console.log('Recibido:', JSON.stringify(body, null, 2));

      this.logger.log('Mensaje recibido:');
      this.logger.log(JSON.stringify(body, null, 2));

      // Verifica que es un mensaje válido de WhatsApp
      if (body.object === 'whatsapp_business_account') {
        const entries = body.entry;
        if (entries && entries.length > 0) {
          entries.forEach((entry) => {
            const changes = entry.changes;
            changes.forEach((change) => {
              if (change.field === 'messages') {
                const message = change.value.messages[0];
                if (message) {
                  this.logger.log(`Mensaje de: ${message.from}`);
                  this.logger.log(`Tipo: ${message.type}`);
                  this.logger.log(`Contenido: ${JSON.stringify(message)}`);
                }
              }
            });
          });
        }
      }

      res.status(200);
    } catch (error) {
      this.logger.error('Error procesando webhook:', error);
      res.send('ERROR');
    }
  }
}
