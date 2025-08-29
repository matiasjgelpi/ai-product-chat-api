import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiService } from './ai/services/ai.service';
import { GeminiService } from './ai/services/gemini.service';
import { ExcelService } from './ai/services/excel.service';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { SupabaseService } from './supabase/supabase/supabase.service';
import { ProductsModule } from './products/products/products.module';
import { ProductsController } from './products/products/products.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Disponible en toda la app
      validationSchema: Joi.object({
        OPENAI_API_KEY: Joi.string().required(),
        GEMINI_API_KEY: Joi.string().required(),
        PORT: Joi.number().default(3000),
        SUPABASE_URL: Joi.string().required(),
        SUPABASE_KEY: Joi.string().required(),
      }),
    }),
    ProductsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AiService,
    GeminiService,
    ExcelService,
    SupabaseService,
  ],
})
export class AppModule {}
