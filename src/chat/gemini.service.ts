import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get('GEMINI_API_KEY');

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async callWithFunctions(prompt: string, functions: any[]) {
    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ functionDeclarations: functions }],
      });

      const resp = result.response;

      if (resp.candidates?.[0]?.content?.parts?.[0]?.functionCall) {
        const functionCall = resp.candidates[0].content.parts[0].functionCall;
        return {
          function_call: {
            name: functionCall.name,
            args: functionCall.args,
          },
        };
      }

      return { text: resp.text() };
    } catch (error) {
      throw new HttpException(
        `Error en Gemini: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async continueWithFunctionResult(originalResp: any, functionResult: any) {
    console.log('Original resp:', originalResp);
    console.log('Function result:', functionResult);

    try {
      // DETECTAR OPERACIONES DE CARRITO
      const functionName = originalResp.function_call?.name;
      const isCartOperation =
        functionName?.includes('cart') ||
        functionName?.includes('Carrito') ||
        functionName?.includes('delete');

      // CASO ESPECIAL: ELIMINACIÓN DE CARRITO
      if (
        functionName === 'delete_cart' ||
        (functionResult?.message &&
          functionResult.message.includes('eliminado'))
      ) {
        const prompt = `
OPERACIÓNDE CARRITO - ELIMINACIÓN:

El usuario ha solicitado eliminar su carrito de compras.

RESULTADO DE LA OPERACIÓN:
✅ Carrito eliminado exitosamente
🗑️ Todos los productos fueron removidos
🔄 Carrito vacío y listo para nuevas compras

INSTRUCCIONES DE RESPUESTA:
1. Confirma que el carrito fue eliminado correctamente
2. Usa un tono positivo y reconfortante
3. Invita al usuario a seguir explorando productos
4. Mantén la respuesta breve y amigable
5. Usa emojis apropiados (✅🗑️🔄)

Responde ahora:
`;
        const result = await this.model.generateContent(prompt);
        return result.response.text();
      }

      // CASO ESPECIAL: OPERACIONES GENERALES DE CARRITO
      if (
        isCartOperation &&
        functionResult &&
        typeof functionResult === 'object'
      ) {
        const prompt = `
OPERACIÓNDE CARRITO - RESULTADO:

El usuario realizó una operación en el carrito de compras.

RESULTADO DE LA OPERACIÓN:
${JSON.stringify(functionResult, null, 2)}

INSTRUCCIONES DE RESPUESTA:
1. Analiza el resultado de la operación del carrito
2. Si fue exitosa, confirma la acción realizada
3. Si hubo error, explica amablemente lo ocurrido
4. Para carritos vacíos, sugiere explorar productos
5. Para carritos con items, muestra resumen breve
6. Usa tono amigable y profesional
7. Incluye emojis apropiados

Responde ahora:
`;
        const result = await this.model.generateContent(prompt);
        return result.response.text();
      }

      // CASO NORMAL: BÚSQUEDA DE PRODUCTOS (tu código original)
      const prompt = `
ANÁLISIS Y RESPUESTA DE CATÁLOGO:

📌 Consulta del usuario: "${originalResp.function_call.args?.q || 'productos'}"
📌 Parámetros de búsqueda: ${JSON.stringify(originalResp.function_call.args, null, 2)}

📦 RESULTADOS ENCONTRADOS (${functionResult.length} productos):
${JSON.stringify(functionResult, null, 2)}

INSTRUCCIONES DE RESPUESTA:
1. Responde SIEMPRE en tono claro, conciso y natural
2. Muestra SOLO los primeros 5 productos encontrados
3. Para cada producto muestra: nombre, precio, talla, color, disponibilidad
4. Si no hay resultados, sugiere modificar filtros
5. Si hay pocos resultados, sugiere opciones similares
6. **Caso especial: CARRITO**
  - Si hay productos, lista como máximo 5
  - Muestra cantidad total, detalle por producto y total general
7. Nunca inventes datos
8. Presenta la respuesta en formato fácil de leer

Responde ahora siguiendo estas reglas.
`;

      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Error:', error);
      throw new HttpException(
        `Error procesando respuesta de función: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
