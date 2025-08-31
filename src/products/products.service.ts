import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase/supabase.service';

@Injectable()
export class ProductsService {
  constructor(private supabaseService: SupabaseService) {}

  //   async findBy(field: string, value: any) {
  //     console.log(field, value);
  //     let query = this.supabaseService
  //       .getSupabaseClient()
  //       .from('products')
  //       .select('*');

  //     if (typeof value === 'string') {
  //       query = query.ilike(field, `%${value}%`);
  //     } else {
  //       query = query.eq(field, value);
  //     }

  //     const { data, error } = await query;

  //     console.log(error);

  //     return data;
  //   }
  // Función helper para normalizar texto
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

  // async findBy(
  //   field: string,
  //   value: any,
  //   options: { exactMatch?: boolean } = {},
  // ) {
  //   console.log('Buscando:', field, value);

  //   let query = this.supabaseService
  //     .getSupabaseClient()
  //     .from('products')
  //     .select('*');

  //   try {
  //     if (typeof value === 'string' && value.trim() !== '') {
  //       const searchValue = options.exactMatch ? value : `%${value}%`;

  //       // Intentar usar columna normalizada si existe
  //       const normalizedField = `${field}_normalized`;
  //       const normalizedValue = this.normalizeText(value);
  //       const normalizedSearchValue = options.exactMatch
  //         ? normalizedValue
  //         : `%${normalizedValue}%`;

  //       // Usar ilike para búsqueda case-insensitive
  //       query = query.ilike(field, searchValue);

  //       // Nota: Para ignorar tildes completamente, necesitarías tener
  //       // una columna precomputada con texto normalizado en tu BD
  //     } else if (value !== null && value !== undefined) {
  //       query = query.eq(field, value);
  //     } else {
  //       throw new Error('Valor de búsqueda no válido');
  //     }

  //     const { data, error } = await query;

  //     if (error) {
  //       console.error('Error en Supabase query:', error);
  //       throw new Error(`Error al buscar: ${error.message}`);
  //     }

  //     console.log(`Encontrados ${data?.length || 0} resultados`);
  //     return data || [];
  //   } catch (error) {
  //     console.error('Error en findBy:', error);
  //     throw error;
  //   }
  // }

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

  // Función para obtener tipos disponibles
  async getProductTypes() {
    const { data, error } = await this.supabaseService
      .getSupabaseClient()
      .from('products')
      .select('type')
      .not('type', 'is', null)
      .order('type');

    if (error) throw error;
    return [...new Set(data.map((item) => item.type))];
  }

  // Función para obtener colores disponibles
  async getProductColors() {
    const { data, error } = await this.supabaseService
      .getSupabaseClient()
      .from('products')
      .select('color')
      .not('color', 'is', null)
      .order('color');

    if (error) throw error;
    return [...new Set(data.map((item) => item.color))];
  }

  // Función para obtener categorías disponibles
  async getProductCategories() {
    const { data, error } = await this.supabaseService
      .getSupabaseClient()
      .from('products')
      .select('category')
      .not('category', 'is', null)
      .order('category');

    if (error) throw error;
    return [...new Set(data.map((item) => item.category))];
  }

  // Función para obtener tamaños disponibles
  async getProductSizes() {
    const { data, error } = await this.supabaseService
      .getSupabaseClient()
      .from('products')
      .select('size')
      .not('size', 'is', null)
      .order('size');

    if (error) throw error;
    return [...new Set(data.map((item) => item.size))];
  }

  async findByFilters(filters: Record<string, any>) {
    let query = this.supabaseService
      .getSupabaseClient()
      .from('products')
      .select('*');

    for (const [field, value] of Object.entries(filters)) {
      query = query.eq(field, value);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  async searchByText(searchQuery: string) {
    const searchVariants = this.getSearchVariants(searchQuery);

    console.log('Todas las variantes de búsqueda:', searchVariants);

    let query = this.supabaseService
      .getSupabaseClient()
      .from('products')
      .select('*');

    // Crear condiciones OR para cada variante
    const orConditions = searchVariants
      .map(
        (variant) =>
          `type.ilike.%${variant}%,description.ilike.%${variant}%,category.ilike.%${variant}%`,
      )
      .join(',');

    const { data, error } = await query
      .or(orConditions)
      .order('type', { ascending: true });

    if (error) throw error;

    console.log('Resultados encontrados:', data?.length || 0);
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

  async findByIds(ids: number[]) {
    const { data, error } = await this.supabaseService
      .getSupabaseClient()
      .from('products')
      .select('*')
      .in('id', ids);

    if (error) throw error;
    return data;
  }
}
