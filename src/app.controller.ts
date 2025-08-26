import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AiService } from './ai/services/ai.service';
import { GeminiService } from './ai/services/gemini.service';
import { ExcelService } from './ai/services/excel.service';

@Controller()
export class AppController {
  constructor(
    private readonly aiService: AiService,
    private geminiService: GeminiService,
    private excelService: ExcelService,
  ) {}

  @Post('generate')
  async generateContent(@Body() body: { prompt: string }) {
    try {
      const result = await this.geminiService.generateContent(body.prompt);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @Post('stream')
  async generateStream(@Body() body: { prompt: string }) {
    try {
      const stream = await this.geminiService.generateContentStream(
        body.prompt,
      );
      return stream;
    } catch (error) {
      throw error;
    }
  }

  @Get('all')
  getAll() {
    return this.excelService.getAll();
  }

  @Get('find')
  findBy(@Query('field') field: string, @Query('value') value: string) {
    return this.excelService.findBy(field, value);
  }

  @Post()
  async ask(@Body() body: { message: string }) {
    // 1. Interpretar intención
    const intent = await this.geminiService.interpret(body.message);

    if (intent.action === 'buscar_precio' && intent.field && intent.value) {
      const result = this.excelService.findBy(intent.field, intent.value);
      if (result.length > 0) {
        return {
          reply: `El precio de ${intent.value} tiene los siguientes precios segun la cantidad a adquirir 
          por 50 unidades: ${result[0].PRECIO_50_U}, por 100 unidades: ${result[0].PRECIO_100_U} y por 200 unidades: ${result[0].PRECIO_200_U}`,
        };
      }
      return { reply: `No encontré el producto ${intent.value}` };
    }

    if (
      intent.action === 'buscar_producto_detalle' &&
      intent.field &&
      intent.value
    ) {
      const result = this.excelService.findBy(intent.field, intent.value);
      if (result.length > 0) {
        return {
          reply: `El producto ${intent.value} tiene los siguientes detalles:
          Tipo de prenda: ${result[0].TIPO_PRENDA}
          Talla: ${result[0].TALLA}
          Color: ${result[0].COLOR}
          Cantidad disponible: ${result[0].CANTIDAD_DISPONIBLE}
          Disponible: ${result[0].DISPONIBLE}
          Categoría: ${result[0].CATEGORÍA}
          Descripción: ${result[0].DESCRIPCIÓN}
          Precios:
          - Precio 50 unidades: $${result[0].PRECIO_50_U}
          - Precio 100 unidades: $${result[0].PRECIO_100_U}
          - Precio 200 unidades: $${result[0].PRECIO_200_U}
          `,
        };
      }
      return { reply: `No encontré el producto ${intent.value}` };
    }

    if (intent.action === 'mostrar_productos') {
      const result = this.excelService.getAll();
      if (result.length > 0) {
        const listaDeProductos = result.map((producto) => {
          return `
        - ${producto.TIPO_PRENDA}: ${producto.ID}
        - Precio 50 unidades: ${producto.PRECIO_50_U}
        - Precio 100 unidades: ${producto.PRECIO_100_U}
        - Precio 200 unidades: ${producto.PRECIO_200_U}
        `;
        });

        const respuestaCompleta = `Aquí tienes la lista de productos:\n${listaDeProductos.join('\n')}`;
        return respuestaCompleta;
      }
      return { reply: `No encontré el producto ${intent.value}` };
    }
    if (intent.action === 'otro') {
      const aiReply = await this.geminiService.respond(
        'No pude interpretar bien tu pregunta, pero te respondo esto: ' +
          body.message,
      );
      return { reply: aiReply };
    }
  }
}
