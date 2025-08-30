import { Module } from '@nestjs/common';
import { CartsService } from './carts.service';
import { SupabaseService } from '../supabase/supabase/supabase.service';
import { CartsController } from './carts.controller';

@Module({
  controllers: [CartsController],
  providers: [CartsService, SupabaseService],
})
export class CartsModule {}
