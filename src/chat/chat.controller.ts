import { Body, Controller, Get, Logger, Post, Req, Res } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { Request, Response } from 'express';
import { CartsService } from '../carts/carts.service';
import { GeminiService } from './services/gemini.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChatService } from './services/chat.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);
  constructor(
    private chatService: ChatService,
    private configService: ConfigService,
    private geminiService: GeminiService,
    private productsService: ProductsService,
    private cartsService: CartsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Procesar mensaje del usuario',
    description:
      'Endpoint para procesar mensajes y ejecutar funciones específicas basadas en la intención del usuario',
  })
  @ApiResponse({
    status: 200,
    description: 'Respuesta exitosa',
    schema: {
      type: 'object',
      properties: {
        reply: {
          type: 'string',
          description: 'Respuesta generada por el asistente',
          example: 'Aquí tienes las camisetas rojas talla M disponibles',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Solicitud inválida - mensaje faltante',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async ask(@Body() body: { message: string }) {
    return await this.chatService.ask(body);
  }

  @Get('webhook')
  verifyWebhook(@Req() req: Request, @Res() res: Response) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('Verificación recibida:', { mode, token, challenge });

    // Tu token de verificación (debe coincidir con el de Meta)
    const VERIFY_TOKEN = this.configService.get('WP_VERIFY_TOKEN');
    console.log('Tu token de verificación:', VERIFY_TOKEN);

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      this.logger.log('Webhook verificado correctamente');
      return res.status(200).send(challenge);
    } else {
      this.logger.error('Verificación fallida');
      return res.sendStatus(403);
    }
  }

  // @Post('webhook')
  // receiveMessage(@Req() req: Request, @Res() res: Response) {
  //   try {
  //     const body = req.body;
  //     console.log('Mensaje recibido:', JSON.stringify(body, null, 2));

  //     // Verifica que es un mensaje válido de WhatsApp
  //     if (body.object === 'whatsapp_business_account') {
  //       const entries = body.entry;
  //       if (entries && entries.length > 0) {
  //         entries.forEach((entry) => {
  //           const changes = entry.changes;
  //           changes.forEach((change) => {
  //             if (change.field === 'messages') {
  //               const message = change.value.messages[0];
  //               if (message) {
  //                 this.logger.log(`Mensaje de: ${message.from}`);
  //                 this.logger.log(`Tipo: ${message.type}`);
  //                 this.logger.log(`Contenido: ${JSON.stringify(message)}`);
  //               }
  //             }
  //           });
  //         });
  //       }
  //     }

  //     res.status(200).send('EVENT_RECEIVED');
  //   } catch (error) {
  //     this.logger.error('Error procesando webhook:', error);
  //     res.status(500).send('ERROR');
  //   }
  // }
  @Post('webhook')
  async receiveMessage(@Req() req: Request, @Res() res: Response) {
    try {
      const body = req.body;
      console.log('Mensaje recibido:', JSON.stringify(body, null, 2));

      if (body.object === 'whatsapp_business_account') {
        const entries = body.entry;
        if (entries && entries.length > 0) {
          for (const entry of entries) {
            for (const change of entry.changes) {
              if (change.field === 'messages') {
                const message = change.value?.messages
                  ? change.value.messages[0]
                  : null;
                if (message && message.type === 'text') {
                  const from = message.from; // Número del usuario
                  const text = message.text.body; // Texto del usuario

                  this.logger.log(`Mensaje de: ${from}`);
                  this.logger.log(`Texto: ${text}`);

                  // 👉 Generar respuesta con tu servicio
                  const reply = await this.chatService.ask({ message: text });

                  // 👉 Enviar respuesta a WhatsApp Cloud API
                  await this.sendWhatsAppMessage(from, reply.reply);
                }
              }
            }
          }
        }
      }

      res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
      this.logger.error('Error procesando webhook:', error);
      res.status(500).send('ERROR');
    }
  }

  // 👉 Método para enviar mensaje a WhatsApp
  private async sendWhatsAppMessage(
    to: string,
    templateName: string = 'hello_world',
  ) {
    const token = this.configService.get('WP_ACCESS_TOKEN');
    const phoneNumberId = this.configService.get('WP_PHONE_NUMBER_ID');

    const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to: this.removeNinthDigit(to),
      type: 'text',
      text: {
        body: templateName,
      },
    };

    console.log('Enviando mensaje:', payload);

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
      this.logger.error(`Error enviando mensaje: ${error}`);
      console.log('Error details:', error); // Para debugging
    } else {
      const result = await response.json();
      this.logger.log(`Mensaje enviado a ${to}:`, result);
    }
  }

  private removeNinthDigit(argentinianInternationalNumber) {
    // Ejemplo: Convierte "5492236687794" en "542236687794"

    // 1. Asegurarse de que es un número argentino que comienza con '549'
    if (argentinianInternationalNumber.startsWith('549')) {
      // 2. Quitar el '9' después del '54'
      // Esto crea: "54" + "2236687794"
      return '54' + argentinianInternationalNumber.substring(3);
    }

    // 3. Si no coincide, devolver el número original
    return argentinianInternationalNumber;
  }
}
