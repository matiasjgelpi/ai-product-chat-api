import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private client: OpenAI;

  constructor(private configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });
  }

  async ask(question: string) {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente útil para responder preguntas de prueba.',
        },
        { role: 'user', content: question },
      ],
    });

    return response.choices[0].message?.content || 'No tengo respuesta.';
  }
}
