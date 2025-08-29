import { Module } from '@nestjs/common';
import { CartsService } from './carts.service';
import { CartsController } from './carts.controller';
import { SupabaseService } from '../../supabase/supabase/supabase.service';

@Module({
  controllers: [CartsController],
  providers: [CartsService, SupabaseService],
})
export class CartsModule {}
