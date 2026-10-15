import { createClient } from '@supabase/supabase-js';

export type TipoEmergencia = 'MEDICA' | 'AGUA' | 'RESCATE' | 'OTRO';
export type EstadoReporte = 'PENDIENTE' | 'EN_PROCESO' | 'ATENDIDA';

export interface Reporte {
  id: string;
  tipo_emergencia: TipoEmergencia;
  latitud: number;
  longitud: number;
  descripcion?: string | null;
  personas_afectadas: number;
  estado: EstadoReporte;
  created_at: string;
}

export type NuevoReporte = {
  id?: string;
  tipo_emergencia: TipoEmergencia;
  latitud: number;
  longitud: number;
  descripcion?: string;
  personas_afectadas?: number;
  estado?: EstadoReporte;
  created_at?: string;
};


const metaEnv = (import.meta as any).env || {};

const supabaseUrl = metaEnv.VITE_SUPABASE_URL || 'https://doywsoxbtjeodvnstdve.supabase.co';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || 'sb_publishable_H2TDEHP8I3HxgCTbfQT9Xw_FDvz72PH';


export const supabase = createClient(supabaseUrl, supabaseAnonKey);


export async function enviarReporte(reporte: NuevoReporte): Promise<Reporte> {
  const { data, error } = await supabase
    .from('reportes')
    .upsert([
      {
        ...reporte,
        personas_afectadas: reporte.personas_afectadas ?? 1,
        estado: reporte.estado ?? 'PENDIENTE',
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error al enviar reporte a Supabase:', error.message);
    throw error;
  }

  return data as Reporte;
}


export async function obtenerReportes(): Promise<Reporte[]> {
  const { data, error } = await supabase
    .from('reportes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error al obtener reportes:', error.message);
    throw error;
  }

  return (data as Reporte[]) ?? [];
}


export async function marcarAtendida(id: string): Promise<Reporte> {
  const { data, error } = await supabase
    .from('reportes')
    .update({ estado: 'ATENDIDA' })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error al marcar reporte ${id} como atendido:`, error.message);
    throw error;
  }

  return data as Reporte;
}