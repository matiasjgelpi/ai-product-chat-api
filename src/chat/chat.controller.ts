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

  // @Post()
  // async ask(@Body() body: { message: string }) {
  //   // 1. Interpretar intención
  //   const intent = await this.geminiService.interpret(body.message);

  //   console.log('Intento:', intent);

  //   if (intent.action === 'buscar_precio' && intent.field && intent.value) {
  //     const result = await this.productsService.findBy('type', intent.value);
  //     console.log(result);
  //     if (result.length > 0) {
  //       return {
  //         reply: `El precio de ${intent.value} tiene los siguientes precios segun la cantidad a adquirir
  //         por 50 unidades: ${result[0].price}, por 100 unidades: ${result[0].price_100} y por 200 unidades: ${result[0].PRECIO_200_U}`,
  //       };
  //     }
  //     return { reply: `No encontré el producto ${intent.value}` };
  //   }

  //   if (intent.action === 'saludo') {
  //     return {
  //       reply:
  //         '¡Hola! ¿Cómo te puedo ayudar? ¿quieres que te diga algo sobre los productos que tenemos?',
  //     };
  //   }

  //   if (intent.action === 'buscar_producto_detalle' && intent.filters) {
  //     const results = await this.productsService.findByFilters(intent.filters);

  //     if (results.length > 0) {
  //       const p = results;
  //       console.log(p);
  //       return {
  //         reply: `Encontré el producto con estas características:
  //     Tipo: }

  //     `,
  //       };
  //     }

  //     return { reply: `No encontré un producto con esos criterios.` };
  //   }

  //   if (intent.action === 'mostrar_productos') {
  //     const result = await this.productsService.getAll();

  //     if (result.length > 0) {
  //       // agrupamos por tipo
  //       const grouped = result.reduce(
  //         (acc, item) => {
  //           if (!acc[item.type]) {
  //             acc[item.type] = [];
  //           }
  //           acc[item.type].push(item);
  //           return acc;
  //         },
  //         {} as Record<string, any[]>,
  //       );

  //       // armamos el mensaje para el chat
  //       const mensaje = Object.entries(grouped)
  //         .map(([tipo, productos]) => {
  //           const items = (productos as any[])
  //             .map(
  //               (p) => `
  //  - ${p.color} (Talle ${p.size})
  //    • Precio mínimo: ${p.price}
  //    • Precio 100 unidades: ${p.price_100}
  //    • Precio 200 unidades: ${p.price_200}`,
  //             )
  //             .join('\n');

  //           return `👉 *${tipo}*\n${items}`;
  //         })
  //         .join('\n\n');

  //       // acá ya tenés el texto armado para responder en el chat
  //       return mensaje;
  //     }
  //   }

  //   if (intent.action === 'otro') {
  //     const aiReply = await this.geminiService.respond(
  //       'No pude interpretar bien tu pregunta, pero te respondo esto: ' +
  //         body.message,
  //     );
  //     return { reply: aiReply };
  //   }
  // }

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
                  product_id: { type: 'integer' },
                  qty: { type: 'integer' },
                },
                required: ['product_id', 'qty'],
              },
            },
          },
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
        // args puede contener: q, type, size, color, category, minPrice, maxPrice, etc.
        const products = await this.productsService.getAll(args);
        const final = await this.geminiService.continueWithFunctionResult(
          aiResp,
          products,
        );
        return { reply: final };
      }

      if (name === 'create_cart') {
        const cart = await this.cartsService.createCart(args.items);
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
