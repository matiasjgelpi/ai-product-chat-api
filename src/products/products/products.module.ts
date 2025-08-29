import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { SupabaseService } from '../../supabase/supabase/supabase.service';
import { ProductsService } from './products.service';
import { GeminiService } from '../../ai/services/gemini.service';

@Module({
  controllers: [ProductsController],
  providers: [SupabaseService, ProductsService, GeminiService],
})
export class ProductsModule {}
