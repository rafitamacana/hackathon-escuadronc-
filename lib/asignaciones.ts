import { supabase } from '@/lib/supabase';
import type { Asignacion, EstadoAsignacion } from '@/types/asignacion';

export async function getAsignacionesActivas(): Promise<Asignacion[]> {
  const { data, error } = await supabase
    .from('asignaciones')
    .select('*')
    .in('estado', ['en_camino', 'resuelto'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error al obtener asignaciones activas:', error.message);
    throw error;
  }

  return (data as Asignacion[]) ?? [];
}

export async function tomarCaso(
  reporteId: string,
  rescatistaId: string,
  rescatistaNombre: string
): Promise<Asignacion> {
  const { data, error } = await supabase
    .from('asignaciones')
    .insert([
      {
        reporte_id: reporteId,
        rescatista_id: rescatistaId,
        rescatista_nombre: rescatistaNombre,
        estado: 'en_camino',
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Este reporte ya fue tomado por otro rescatista.');
    }
    console.error('Error al tomar caso:', error.message);
    throw error;
  }


  await supabase
    .from('reportes')
    .update({ estado: 'EN_PROCESO' })
    .eq('id', reporteId);

  return data as Asignacion;
}

export async function soltarCaso(
  asignacionId: string,
  reporteId: string
): Promise<Asignacion> {
  const { data, error } = await supabase
    .from('asignaciones')
    .update({
      estado: 'liberado',
      updated_at: new Date().toISOString(),
    })
    .eq('id', asignacionId)
    .select()
    .single();

  if (error) {
    console.error('Error al soltar caso:', error.message);
    throw error;
  }

  await supabase
    .from('reportes')
    .update({ estado: 'PENDIENTE' })
    .eq('id', reporteId);

  return data as Asignacion;
}

export async function resolverCaso(
  asignacionId: string,
  reporteId: string
): Promise<Asignacion> {
  const { data, error } = await supabase
    .from('asignaciones')
    .update({
      estado: 'resuelto',
      updated_at: new Date().toISOString(),
    })
    .eq('id', asignacionId)
    .select()
    .single();

  if (error) {
    console.error('Error al resolver caso:', error.message);
    throw error;
  }

  // Actualizar el reporte a 'ATENDIDA'
  await supabase
    .from('reportes')
    .update({ estado: 'ATENDIDA' })
    .eq('id', reporteId);

  return data as Asignacion;
}