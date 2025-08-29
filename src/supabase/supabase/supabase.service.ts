import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabaseClient: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.supabaseClient = createClient(
      this.configService.get<string>('SUPABASE_URL'),
      this.configService.get<string>('SUPABASE_KEY'),
    );
  }

  getSupabaseClient(): SupabaseClient {
    return this.supabaseClient;
  }

  async checkConnection(): Promise<boolean | any> {
    try {
      // Intentar una consulta simple
      const { data, error } = await this.supabaseClient
        .from('products') // Tabla que probablemente no existe
        .select('*');

      // Si hay error pero es de "tabla no existe", la conexión está bien
      if (error && error.code === 'PGRST205') {
        return true; // Tabla no existe, pero conexión OK
      }

      return data;
    } catch (error) {
      console.error('Error de conexión con Supabase:', error);
      return false;
    }
  }
}
