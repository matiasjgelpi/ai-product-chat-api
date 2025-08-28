import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL'),
      this.configService.get<string>('SUPABASE_KEY'),
    );
  }

  async onModuleInit() {
    //   try {
    //     const { data, error } = await this.supabase
    //       .from('products')
    //       .select('count', { count: 'exact', head: true });
    //     if (error && error.code !== 'PGRST116') {
    //       console.error('Error conectando a Supabase:', error);
    //     } else {
    //       console.log('✅ Conexión a Supabase establecida correctamente');
    //     }
    //   } catch (error) {
    //     console.error('❌ Error al conectar con Supabase:', error);
    //   }
  }

  getSupabaseClient(): SupabaseClient {
    return this.supabase;
  }

  async checkConnection(): Promise<boolean> {
    try {
      // Intentar una consulta simple
      const { data, error } = await this.supabase
        .from('_dummy_table_') // Tabla que probablemente no existe
        .select('*')
        .limit(1);

      // Si hay error pero es de "tabla no existe", la conexión está bien
      if (error && error.code === 'PGRST205') {
        return true; // Tabla no existe, pero conexión OK
      }

      return !error;
    } catch (error) {
      console.error('Error de conexión con Supabase:', error);
      return false;
    }
  }
}
