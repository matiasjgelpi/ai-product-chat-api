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

  async findBy(
    field: string,
    value: any,
    options: { exactMatch?: boolean } = {},
  ) {
    console.log('Buscando:', field, value);

    let query = this.supabaseService
      .getSupabaseClient()
      .from('products')
      .select('*');

    try {
      if (typeof value === 'string' && value.trim() !== '') {
        const searchValue = options.exactMatch ? value : `%${value}%`;

        // Intentar usar columna normalizada si existe
        const normalizedField = `${field}_normalized`;
        const normalizedValue = this.normalizeText(value);
        const normalizedSearchValue = options.exactMatch
          ? normalizedValue
          : `%${normalizedValue}%`;

        // Usar ilike para búsqueda case-insensitive
        query = query.ilike(field, searchValue);

        // Nota: Para ignorar tildes completamente, necesitarías tener
        // una columna precomputada con texto normalizado en tu BD
      } else if (value !== null && value !== undefined) {
        query = query.eq(field, value);
      } else {
        throw new Error('Valor de búsqueda no válido');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error en Supabase query:', error);
        throw new Error(`Error al buscar: ${error.message}`);
      }

      console.log(`Encontrados ${data?.length || 0} resultados`);
      return data || [];
    } catch (error) {
      console.error('Error en findBy:', error);
      throw error;
    }
  }

  async getAll() {
    const { data, error } = await this.supabaseService
      .getSupabaseClient()
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
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
    const { data, error } = await this.supabaseService
      .getSupabaseClient()
      .from('products')
      .select('*')
      .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      .order('name', { ascending: true });

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
