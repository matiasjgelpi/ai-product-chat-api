import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

import { ProductsModule } from './products/products.module';
import { CartsModule } from './carts/carts.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        GEMINI_API_KEY: Joi.string().required(),
        PORT: Joi.number().default(3000),
        SUPABASE_URL: Joi.string().required(),
        SUPABASE_KEY: Joi.string().required(),
        WP_ACCESS_TOKEN: Joi.string().required(),
        WP_VERIFY_TOKEN: Joi.string().required(),
        WP_PHONE_NUMBER_ID: Joi.string().required(),
      }),
    }),
    ProductsModule,
    CartsModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
