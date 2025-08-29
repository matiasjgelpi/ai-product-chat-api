import { Injectable, NotFoundException } from '@nestjs/common';

import { SupabaseService } from '../../supabase/supabase/supabase.service';

@Injectable()
export class CartsService {
  constructor(private supabaseService: SupabaseService) {}

  async createCart(items: { product_id: number; qty: number }[]) {
    // 1. Crear carrito
    const { data: cart, error: cartError } = await this.supabaseService
      .getSupabaseClient()
      .from('carts')
      .insert({})
      .select()
      .single();

    if (cartError) throw new Error(cartError.message);

    // 2. Insertar ítems
    for (const item of items) {
      const { error: itemError } = await this.supabaseService
        .getSupabaseClient()
        .from('cart_items')
        .insert({
          cart_id: cart.id,
          product_id: item.product_id,
          qty: item.qty,
        });

      if (itemError) throw new Error(itemError.message);
    }

    return cart;
  }

  async updateCart(
    cartId: number,
    items: { product_id: number; qty: number }[],
  ) {
    // validar que exista el carrito
    const { data: cart } = await this.supabaseService
      .getSupabaseClient()
      .from('carts')
      .select()
      .eq('id', cartId)
      .single();

    if (!cart) throw new NotFoundException(`Cart ${cartId} not found`);

    for (const item of items) {
      if (item.qty === 0) {
        // borrar el item
        await this.supabaseService
          .getSupabaseClient()
          .from('cart_items')
          .delete()
          .eq('cart_id', cartId)
          .eq('product_id', item.product_id);
      } else {
        // upsert (update si existe, insert si no)

        const upsert = await this.supabaseService
          .getSupabaseClient()
          .from('cart_items')
          .upsert(
            {
              cart_id: cartId,
              product_id: item.product_id,
              qty: item.qty,
            },
            {
              onConflict: 'cart_id', // ← ¡CORRECTO!
            },
          );

        if (upsert.error) {
          console.error('Upsert error:', upsert.error);
          console.error('Data:', {
            cart_id: cartId,
            product_id: item.product_id,
            qty: item.qty,
          });
        }
      }

      return { message: 'Cart updated', cartId };
    }
  }
}
