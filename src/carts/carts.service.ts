import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase/supabase.service';

@Injectable()
export class CartsService {
  constructor(private supabaseService: SupabaseService) {}

  async createCart(
    session_id: string,
    items: { product_id: number; qty: number }[],
  ) {
    console.log('Items:', items);
    if (!items || items.length === 0) {
      throw new BadRequestException('Cart must contain at least one item');
    }

    // 1. Crear carrito
    const { data: cart, error: cartError } = await this.supabaseService
      .getSupabaseClient()
      .from('carts')
      .insert({
        session_id,
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
          product:products(id, type, price)
        `,
          )
          .single();

      if (itemError) {
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

  async deleteCartBySessionId(sessionId: string) {
    // Verificar que existe
    const { data: cart } = await this.supabaseService
      .getSupabaseClient()
      .from('carts')
      .select('session_id')
      .eq('session_id', sessionId)
      .single();

    console.log('cart', cart);

    if (!cart) {
      return { message: 'Carrito eliminado', sessionId };
    }

    // Eliminar items primero (por la foreign key)
    await this.supabaseService
      .getSupabaseClient()
      .from('cart_items')
      .delete()
      .eq('session_id', sessionId);

    // Eliminar carrito
    const { error: deleteError } = await this.supabaseService
      .getSupabaseClient()
      .from('carts')
      .delete()
      .eq('session_id', sessionId);

    if (deleteError) {
      return { message: 'Hubo un error eliminando el carrito', sessionId };
    }

    return { message: 'Carrito eliminado', sessionId };
  }

  async updateCart(
    sessionId: string,
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
      .eq('session_id', sessionId)
      .single();

    if (!cart) {
      throw new NotFoundException(`Cart ${sessionId} not found`);
    }

    // Actualizar timestamp del carrito
    await this.supabaseService
      .getSupabaseClient()
      .from('carts')
      .update({ updated_at: new Date().toISOString() })
      .eq('session_id', sessionId);

    // Procesar cada item
    const updatedItems = [];
    for (const item of items) {
      if (item.qty === 0) {
        // Eliminar el item
        const { error: deleteError } = await this.supabaseService
          .getSupabaseClient()
          .from('cart_items')
          .delete()
          .eq('cart_id', cart?.id)
          .eq('product_id', item.product_id);

        if (deleteError) {
          console.error('Delete error:', deleteError);
        }
      } else {
        const { data: upsertedItem, error: upsertError } =
          await this.supabaseService
            .getSupabaseClient()
            .from('cart_items')
            .upsert(
              {
                cart_id: cart?.id,
                product_id: item.product_id,
                qty: item.qty,
              },
              {
                onConflict: 'cart_id,product_id',
              },
            )
            .select(
              `
            *,
            product:products(id, type, description, price, stock)
          `,
            )
            .single();

        if (upsertError) {
          console.error('Upsert error:', upsertError);
          console.error('Data:', {
            cart_id: cart?.id,
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
    return await this.findOne(cart?.id);
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
      product:products(id, type, description, price, stock)
    )
  `,
      )
      .eq('id', cartId)
      .single();

    if (cartError || !cart) {
      throw new NotFoundException(`Cart ${cartId} not found`);
    }

    // Normalizar items: convertir objeto a array si es necesario
    let itemsArray = [];
    if (cart.items) {
      if (Array.isArray(cart.items)) {
        itemsArray = cart.items;
      } else {
        // Si es un objeto individual, convertirlo a array
        itemsArray = [cart.items];
      }
    }

    // Calcular total del carrito
    const total = itemsArray.reduce((sum, item) => {
      return sum + (item.product?.price || 0) * item.qty;
    }, 0);

    return {
      ...cart,
      items: itemsArray, // Devolver como array siempre
      total,
      itemCount: itemsArray.length,
    };
  }

  async getCart(sessionId: string) {
    const { data: cart, error } = await this.supabaseService
      .getSupabaseClient()
      .from('carts')
      .select(
        `
      *,
      cart_items(
        *,
        product:products(*)
      )
    `,
      )
      .eq('session_id', sessionId)
      .single();

    if (error) {
      console.error('Error fetching cart:', error);
      return { reply: 'No hay carrito para este id' };
    }

    return cart;
  }
}
