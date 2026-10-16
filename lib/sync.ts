import type { Reporte } from "@/types/reporte";
import { guardarLocal, obtenerPendientes, borrarLocal } from "./db-local";
import { enviarReporte } from "./supabase";

// intenta mandar el reporte a Supabase, si falla lo guarda en el celular
// regresa "enviado" o "local" para que se muestre el mensaje correcto
export async function crearReporte(reporte: Reporte): Promise<"enviado" | "local"> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await guardarLocal(reporte);
    return "local";
  }

  try {
    await enviarReporte(reporte);
    return "enviado";
  } catch (error) {
    console.warn("No se pudo enviar el reporte; se guardará para sincronizarlo después:", error);
    await guardarLocal(reporte);
    return "local";
  }
}

// sube todo lo guardado, y solo borra lo que sí se pudo enviar
export async function sincronizar(): Promise<number> {
  const pendientes = await obtenerPendientes();
  let enviados = 0;

  for (const r of pendientes) {
    try {
      await enviarReporte(r);
      await borrarLocal(r.id);
      enviados += 1;
    } catch (error) {
      // si falla uno, se queda guardado y se reintenta la próxima vez
      console.error(`No se pudo sincronizar el reporte ${r.id}:`, error);
    }
  }

  return enviados;
}

// escucha cuando vuelve la red y sincroniza, regresa una función para quitar el listener
export function iniciarSync(alSincronizar?: () => void) {
  const sincronizarYNotificar = async () => {
    try {
      const enviados = await sincronizar();
      if (enviados > 0) alSincronizar?.();
    } catch (error) {
      console.error("No se pudieron leer los reportes pendientes para sincronizarlos:", error);
    }
  };

  window.addEventListener("online", sincronizarYNotificar);
  void sincronizarYNotificar(); // por si ya hay red al abrir la app
  return () => window.removeEventListener("online", sincronizarYNotificar);
}
