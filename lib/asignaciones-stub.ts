// STUB TEMPORAL — Alexis va a crear el archivo real con la lógica de Supabase.
// Borrar este archivo cuando lib/asignaciones.ts de Alexis esté listo.
import type { Asignacion } from "@/types/asignacion";

// toma un caso para el rescatista
export async function tomarCaso(
  reporteId: string,
  rescatistaId: string,
  nombre: string
): Promise<{ ok: true } | { ok: false; motivo: "ya_tomado" | "error" }> {
  console.warn("[stub] tomarCaso llamado — esperando implementación de Alexis");
  return { ok: true };
}

// suelta un caso que el rescatista habia tomado
export async function soltarCaso(
  asignacionId: string,
  rescatistaId: string
): Promise<unknown> {
  console.warn("[stub] soltarCaso llamado — esperando implementación de Alexis");
  return {};
}

// marca un caso como resuelto
export async function resolverCaso(
  asignacionId: string,
  rescatistaId: string
): Promise<unknown> {
  console.warn("[stub] resolverCaso llamado — esperando implementación de Alexis");
  return {};
}

// trae todas las asignaciones activas
export async function getAsignacionesActivas(): Promise<Asignacion[]> {
  console.warn("[stub] getAsignacionesActivas — esperando implementación de Alexis");
  return [];
}
