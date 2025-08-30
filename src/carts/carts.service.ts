import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase/supabase.service';

@Injectable()
export class CartsService {
  constructor(private supabaseService: SupabaseService) {}

  async createCart(items: { product_id: number; qty: number }[]) {
    if (!items || items.length === 0) {
      throw new BadRequestException('Cart must contain at least one item');
    }

    // 1. Crear carrito
    const { data: cart, error: cartError } = await this.supabaseService
      .getSupabaseClient()
      .from('carts')
      .insert({
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (cartError) {
      throw new Error(`Failed to create cart: ${cartError.message}`);
    }

    // 2. Insertar ítems
    const cartItems = [];
    for (const item of items) {
      const { data: insertedItem, error: itemError } =
        await this.supabaseService
          .getSupabaseClient()
          .from('cart_items')
          .insert({
            cart_id: cart.id,
            product_id: item.product_id,
            qty: item.qty,
          })
          .select(
            `
          *,
          product:products(id, name, description, price, stock)
        `,
          )
          .single();

      if (itemError) {
        // Si falla la inserción de algún item, limpiar el carrito creado
        await this.deleteCart(cart.id);
        throw new Error(`Failed to add item to cart: ${itemError.message}`);
      }

      cartItems.push(insertedItem);
    }

    return {
      ...cart,
      items: cartItems,
    };
  }

  async deleteCart(cartId: number) {
    // Verificar que existe
    const { data: cart } = await this.supabaseService
      .getSupabaseClient()
      .from('carts')
      .select('id')
      .eq('id', cartId)
      .single();

    if (!cart) {
      throw new NotFoundException(`Cart ${cartId} not found`);
    }

    // Eliminar items primero (por la foreign key)
    await this.supabaseService
      .getSupabaseClient()
      .from('cart_items')
      .delete()
      .eq('cart_id', cartId);

    // Eliminar carrito
    const { error: deleteError } = await this.supabaseService
      .getSupabaseClient()
      .from('carts')
      .delete()
      .eq('id', cartId);

    if (deleteError) {
      throw new Error(`Failed to delete cart: ${deleteError.message}`);
    }

    return { message: 'Cart deleted successfully', cartId };
  }

  async updateCart(
    cartId: number,
    items: { product_id: number; qty: number }[],
  ) {
    if (!items || items.length === 0) {
      throw new BadRequestException('Items array cannot be empty');
    }

    // Validar que exista el carrito
    const { data: cart } = await this.supabaseService
      .getSupabaseClient()
      .from('carts')
      .select()
      .eq('id', cartId)
      .single();

    if (!cart) {
      throw new NotFoundException(`Cart ${cartId} not found`);
    }

    // Validar productos antes de actualizar
    // const validItems = items.filter((item) => item.qty > 0);
    // if (validItems.length > 0) {
    //   await this.validateProducts(validItems);
    // }

    // Actualizar timestamp del carrito
    await this.supabaseService
      .getSupabaseClient()
      .from('carts')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', cartId);

    // Procesar cada item
    const updatedItems = [];
    for (const item of items) {
      if (item.qty === 0) {
        // Eliminar el item
        const { error: deleteError } = await this.supabaseService
          .getSupabaseClient()
          .from('cart_items')
          .delete()
          .eq('cart_id', cartId)
          .eq('product_id', item.product_id);

        if (deleteError) {
          console.error('Delete error:', deleteError);
        }
      } else {
        // Upsert (update si existe, insert si no)
        const { data: upsertedItem, error: upsertError } =
          await this.supabaseService
            .getSupabaseClient()
            .from('cart_items')
            .upsert(
              {
                cart_id: cartId,
                product_id: item.product_id,
                qty: item.qty,
              },
              {
                onConflict: 'cart_id,product_id', // Corrección: ambos campos para el conflicto
              },
            )
            .select(
              `
            *,
            product:products(id, name, description, price, stock)
          `,
            )
            .single();

        if (upsertError) {
          console.error('Upsert error:', upsertError);
          console.error('Data:', {
            cart_id: cartId,
            product_id: item.product_id,
            qty: item.qty,
          });
          throw new Error(`Failed to update item: ${upsertError.message}`);
        }

        if (upsertedItem) {
          updatedItems.push(upsertedItem);
        }
      }
    }

    // Obtener el carrito actualizado completo
    return await this.findOne(cartId);
  }

  async findOne(cartId: number) {
    const { data: cart, error: cartError } = await this.supabaseService
      .getSupabaseClient()
      .from('carts')
      .select(
        `
        *,
        items:cart_items(
          *,
          product:products(id, name, description, price, stock)
        )
      `,
      )
      .eq('id', cartId)
      .single();

    if (cartError || !cart) {
      throw new NotFoundException(`Cart ${cartId} not found`);
    }

    // Calcular total del carrito
    const total =
      cart.items?.reduce((sum, item) => {
        return sum + item.product.price * item.qty;
      }, 0) || 0;

    return {
      ...cart,
      total,
      itemCount: cart.items?.length || 0,
    };
  }
}
