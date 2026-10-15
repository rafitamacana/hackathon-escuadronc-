import type { Reporte } from "@/types/reporte";
import { guardarLocal, obtenerPendientes, borrarLocal } from "./db-local";
import { enviarReporte } from "./supabase";

// intenta mandar el reporte a Supabase, si falla lo guarda en el celular
// regresa "enviado" o "local" para que se muestre el mensaje correcto
export async function crearReporte(reporte: Reporte): Promise<"enviado" | "local"> {
  try {
    await enviarReporte(reporte);
    return "enviado";
  } catch {
    await guardarLocal(reporte);
    return "local";
  }
}

// sube todo lo guardado, y solo borra lo que sí se pudo enviar
export async function sincronizar() {
  const pendientes = await obtenerPendientes();
  for (const r of pendientes) {
    try {
      await enviarReporte(r);
      await borrarLocal(r.id);
    } catch {
      // si falla uno, se queda guardado y se reintenta la próxima vez
    }
  }
}

// escucha cuando vuelve la red y sincroniza, regresa una función para quitar el listener
export function iniciarSync() {
  const alVolverRed = () => {
    sincronizar();
  };
  window.addEventListener("online", alVolverRed);
  sincronizar(); // por si ya hay red al abrir la app
  return () => window.removeEventListener("online", alVolverRed);
}
