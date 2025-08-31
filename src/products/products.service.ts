import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase/supabase.service';

@Injectable()
export class ProductsService {
  constructor(private supabaseService: SupabaseService) {}

  private normalizeText(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // elimina tildes
      .toLowerCase()
      .trim();
  }

  private getSearchVariants(text: string): string[] {
    const normalized = this.normalizeText(text);
    const variants = [normalized, text.toLowerCase()];

    // Mapeo de variantes comunes con/sin tilde
    const commonVariants: { [key: string]: string[] } = {
      pantalon: ['pantalón', 'pantalones'],
      camiseta: ['camisetas'],
      zapato: ['zapatos'],
      blusa: ['blusas'],
      vestido: ['vestidos'],
      chaqueta: ['chaquetas'],
      falda: ['faldas'],
      sudader: ['sudadera', 'sudaderas'],
      accesorio: ['accesorios'],
    };

    Object.keys(commonVariants).forEach((key) => {
      if (normalized.includes(key)) {
        variants.push(...commonVariants[key]);
      }
    });

    return [...new Set(variants)]; // Eliminar duplicados
  }

  async getProducts(filters?: {
    type?: string;
    size?: string;
    color?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    minStock?: number;
    available?: boolean;
  }) {
    console.log('Filtros:', filters);
    let query = this.supabaseService
      .getSupabaseClient()
      .from('products')
      .select('*');

    if (filters?.type) {
      const typeVariants = this.getSearchVariants(filters.type);
      const orConditions = typeVariants
        .map((variant) => `type.ilike.%${variant}%`)
        .join(',');

      query = query.or(orConditions);
    }

    if (filters?.size) {
      query = query.ilike('size', `%${filters.size}%`);
    }

    if (filters?.color) {
      query = query.ilike('color', `%${filters.color}%`);
    }

    if (filters?.category) {
      query = query.ilike('category', `%${filters.category}%`);
    }

    if (filters?.minPrice !== undefined) {
      query = query.gte('price', filters.minPrice);
    }

    if (filters?.maxPrice !== undefined) {
      query = query.lte('price', filters.maxPrice);
    }

    if (filters?.minStock !== undefined) {
      query = query.gte('stock', filters.minStock);
    }

    if (filters?.available !== undefined) {
      query = query.eq('available', filters.available);
    }

    // Ordenar por tipo y precio
    query = query
      .order('type', { ascending: true })
      .order('price', { ascending: true });

    const { data, error } = await query;

    console.log('Resultados encontrados:', data?.length || 0);
    if (error) throw error;
    return data;
  }

  async findById(id: number) {
    const { data, error } = await this.supabaseService
      .getSupabaseClient()
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      throw error;
    }

    return data;
  }

  a;
}
