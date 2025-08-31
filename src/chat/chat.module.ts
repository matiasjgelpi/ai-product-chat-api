import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ProductsService } from '../products/products.service';
import { SupabaseService } from '../supabase/supabase/supabase.service';
import { CartsService } from '../carts/carts.service';
import { GeminiService } from './services/gemini.service';
import { ChatService } from './services/chat.service';

@Module({
  controllers: [ChatController],
  providers: [
    GeminiService,
    ProductsService,
    SupabaseService,
    CartsService,
    ChatService,
  ],
})
export class ChatModule {}
