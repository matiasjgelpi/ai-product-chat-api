import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { GeminiService } from '../ai/services/gemini.service';
import { ProductsService } from './products.service';
import { ProductFiltersDto } from './product-filter.dto';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);
  constructor(
    private geminiService: GeminiService,
    private productsService: ProductsService,
  ) {}

  @Post()
  async ask(@Body() body: { message: string }) {
    // 1. Interpretar intención
    const intent = await this.geminiService.interpret(body.message);

    console.log('Intento:', intent);

    if (intent.action === 'buscar_precio' && intent.field && intent.value) {
      const result = await this.productsService.findBy('type', intent.value);
      console.log(result);
      if (result.length > 0) {
        return {
          reply: `El precio de ${intent.value} tiene los siguientes precios segun la cantidad a adquirir 
          por 50 unidades: ${result[0].price}, por 100 unidades: ${result[0].price_100} y por 200 unidades: ${result[0].PRECIO_200_U}`,
        };
      }
      return { reply: `No encontré el producto ${intent.value}` };
    }

    if (intent.action === 'saludo') {
      return {
        reply:
          '¡Hola! ¿Cómo te puedo ayudar? ¿quieres que te diga algo sobre los productos que tenemos?',
      };
    }

    if (intent.action === 'buscar_producto_detalle' && intent.filters) {
      const results = await this.productsService.findByFilters(intent.filters);

      if (results.length > 0) {
        const p = results;
        console.log(p);
        return {
          reply: `Encontré el producto con estas características:
      Tipo: }
    
      `,
        };
      }

      return { reply: `No encontré un producto con esos criterios.` };
    }

    if (intent.action === 'mostrar_productos') {
      const result = await this.productsService.getAll();

      if (result.length > 0) {
        // agrupamos por tipo
        const grouped = result.reduce(
          (acc, item) => {
            if (!acc[item.type]) {
              acc[item.type] = [];
            }
            acc[item.type].push(item);
            return acc;
          },
          {} as Record<string, any[]>,
        );

        // armamos el mensaje para el chat
        const mensaje = Object.entries(grouped)
          .map(([tipo, productos]) => {
            const items = (productos as any[])
              .map(
                (p) => `
   - ${p.color} (Talle ${p.size})
     • Precio mínimo: ${p.price}
     • Precio 100 unidades: ${p.price_100}
     • Precio 200 unidades: ${p.price_200}`,
              )
              .join('\n');

            return `👉 *${tipo}*\n${items}`;
          })
          .join('\n\n');

        // acá ya tenés el texto armado para responder en el chat
        return mensaje;
      }
    }

    if (intent.action === 'otro') {
      const aiReply = await this.geminiService.respond(
        'No pude interpretar bien tu pregunta, pero te respondo esto: ' +
          body.message,
      );
      return { reply: aiReply };
    }
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

  @Get()
  @ApiOperation({ summary: 'Get all products with optional filters' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search query for name/description',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by category',
  })
  @ApiQuery({
    name: 'min_price',
    required: false,
    description: 'Minimum price filter',
  })
  @ApiQuery({
    name: 'max_price',
    required: false,
    description: 'Maximum price filter',
  })
  @ApiQuery({
    name: 'in_stock',
    required: false,
    description: 'Filter products in stock',
  })
  async findAll(@Query() query: ProductFiltersDto) {
    try {
      const { q, ...filters } = query;

      // Si hay parámetro de búsqueda 'q', usar búsqueda por texto
      if (q) {
        const products = await this.productsService.searchByText(q);
        return {
          success: true,
          data: products,
          count: products?.length || 0,
        };
      }

      // Si hay filtros, usar findByFilters
      if (Object.keys(filters).length > 0) {
        const cleanFilters = this.cleanFilters(filters);
        const products = await this.productsService.findByFilters(cleanFilters);
        return {
          success: true,
          data: products,
          count: products?.length || 0,
          filters: cleanFilters,
        };
      }

      // Si no hay filtros, obtener todos
      const products = await this.productsService.getAll();
      return {
        success: true,
        data: products,
        count: products?.length || 0,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error retrieving products',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private cleanFilters(filters: Record<string, any>): Record<string, any> {
    const cleaned = {};

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        // Conversión de tipos para filtros especiales
        if (key === 'min_price' || key === 'max_price') {
          const numValue = parseFloat(value as string);
          if (!isNaN(numValue)) {
            // Para rangos de precio, necesitarás lógica especial en el service
            cleaned[key] = numValue;
          }
        } else if (key === 'in_stock') {
          // Convertir a boolean para filtro de stock
          cleaned['stock'] = value === 'true' ? { gt: 0 } : { eq: 0 };
        } else {
          cleaned[key] = value;
        }
      }
    }

    return cleaned;
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product found' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      const product = await this.productsService.findById(id);

      if (!product) {
        throw new HttpException(
          {
            success: false,
            message: `Product with ID ${id} not found`,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: product,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: 'Error retrieving product',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
