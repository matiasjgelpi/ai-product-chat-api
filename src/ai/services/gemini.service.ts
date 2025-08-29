import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(private configService: ConfigService) {
    // Obtener API key de environment variables
    const apiKey = this.configService.get('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY no está configurada en las variables de entorno',
      );
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  async generateContent(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      throw new HttpException(
        `Error en Gemini: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async generateContentStream(prompt: string) {
    try {
      const result = await this.model.generateContentStream(prompt);
      return result.stream;
    } catch (error) {
      throw new HttpException(
        `Error en Gemini: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async interpret(message: string): Promise<{
    action: string;
    field?: string;
    value?: string;
    filters?: Record<string, any>;
  }> {
    const prompt = `
Eres un traductor de texto a JSON. No eres un asistente.
Tenuna tabla de productos en mi base de datos con la siguiente estructura:
{
  "fields": {
    "id": { "type": "bigint", "javascriptType": "number" },
    "type": { "type": "text", "javascriptType": "string" },
    "size": { "type": "text", "javascriptType": "string" },
    "color": { "type": "text", "javascriptType": "string" },
    "stock": { "type": "bigint", "javascriptType": "number" },
    "price": { "type": "bigint", "javascriptType": "number" },
    "price_100": { "type": "bigint", "javascriptType": "number" },
    "price_200": { "type": "bigint", "javascriptType": "number" },
    "category": { "type": "text", "javascriptType": "string" },
    "description": { "type": "text", "javascriptType": "string" },
    "available": { "type": "boolean", "javascriptType": "boolean" }
  }
}

Interpreta si los nombre de los productos deberían llevar tilde o no ya que las búsquedas serán generalmente en español.
Si preguntan por ejemplo por el pantalón sin tiede agregalo al value.
		
El usuario puede preguntar cosas como:
- "¿Cuánto cuesta el Producto B?"
- "Dame el precio del Producto C"
- "Busca el Producto A"
- "Muéstrame todos los productos"
- "Muéstrame los productos de tipo A"
- "¿Qué productos hay en color rojo?"
- "¿Qué productos hay en talla M?"
- "¿Qué productos hay en la categoría Camisetas?"
- "¿Qué productos hay disponibles?"
- "Muestrame el detalle de producto C"
- "Agrega el Producto A al carrito"
- "Hola"
- "Productos rojos en talla M"
- "Camisetas disponibles en color azul"
- "Chaquetas talla L"



Tu única tarea es devolver un JSON con esta forma exacta:

{
  "action": "buscar_precio" | "buscar_producto_detalle" | "otro | mostrar_productos | saludo",
  "field": string | null,
  "value": string | null
    "filters": { "campo": "valor" }
  
}

No escribas texto adicional, no expliques nada, no agregues comillas triples ni Markdown.
Devuelve **solo JSON válido**.

Pregunta del usuario: "${message}"
    `;

    const result = await this.model.generateContent(prompt);

    let text = result.response.text().trim();

    // 🔹 Limpieza para quitar ```json ... ```
    text = text.replace(/```json|```/g, '').trim();

    try {
      return JSON.parse(text);
    } catch {
      return { action: 'otro' };
    }
  }

  async respond(message: string): Promise<string> {
    const result = await this.model.generateContent(message);
    return result.response.text();
  }
}
