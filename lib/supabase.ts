import { createClient } from "@supabase/supabase-js";
import type { Reporte } from "@/types/reporte";

export interface ColumnaReporte {
  column_name: string;
  data_type: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function enviarReporte(reporte: Reporte, signal?: AbortSignal): Promise<Reporte> {
  const { data, error } = await supabase
    .from("reportes")
    .upsert([reporte])
    .abortSignal(signal ?? new AbortController().signal)
    .select()
    .single();

  if (error) {
    console.error("Error al enviar reporte a Supabase:", error.message);
    throw error;
  }

  return data as Reporte;
}

export async function obtenerReportes(): Promise<Reporte[]> {
  const { data, error } = await supabase
    .from("reportes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al obtener reportes:", error.message);
    throw error;
  }

  return (data as Reporte[]) ?? [];
}

export async function marcarAtendida(id: string): Promise<Reporte> {
  const { data, error } = await supabase
    .from("reportes")
    .update({ estado: "ATENDIDA" })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(`Error al marcar reporte ${id} como atendida:`, error.message);
    throw error;
  }

  return data as Reporte;
}

export async function obtenerColumnasReportes(): Promise<ColumnaReporte[]> {
  const { data, error } = await supabase.rpc("obtener_columnas_reportes");

  if (error) {
    console.error("Error al consultar estructura de columnas:", error.message);
    throw error;
  }

  return (data as ColumnaReporte[]) ?? [];
}