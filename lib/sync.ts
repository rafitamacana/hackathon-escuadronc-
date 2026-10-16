import type { Reporte } from "@/types/reporte";
import { guardarLocal, obtenerPendientes, borrarLocal } from "./db-local";
import { enviarReporte } from "./supabase";

const TIEMPO_MAXIMO_ENVIO_MS = 10_000;
const INTERVALO_REINTENTO_MS = 15_000;

export const guardarReporteLocal = (reporte: Reporte) => guardarLocal(reporte);

async function enviarConTiempoLimite(reporte: Reporte): Promise<void> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), TIEMPO_MAXIMO_ENVIO_MS);

  try {
    await enviarReporte(reporte, controller.signal);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

// intenta mandar el reporte a Supabase, si falla lo guarda en el celular
// regresa "enviado" o "local" para que se muestre el mensaje correcto
export async function crearReporte(reporte: Reporte): Promise<"enviado" | "local"> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await guardarReporteLocal(reporte);
    return "local";
  }

  try {
    await enviarConTiempoLimite(reporte);
    return "enviado";
  } catch (error) {
    console.warn("No se pudo enviar el reporte; se guardará para sincronizarlo después:", error);
    await guardarReporteLocal(reporte);
    return "local";
  }
}

// sube todo lo guardado, y solo borra lo que sí se pudo enviar
export async function sincronizar(): Promise<number> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return 0;

  const pendientes = await obtenerPendientes();
  let enviados = 0;

  for (const r of pendientes) {
    try {
      await enviarConTiempoLimite(r);
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
export function iniciarSync(alSincronizar?: (idsEnviados: string[]) => void) {
  let sincronizacionEnCurso = false;

  const sincronizarYNotificar = async () => {
    if (sincronizacionEnCurso) return;
    sincronizacionEnCurso = true;

    try {
      const pendientesAntes = await obtenerPendientes();
      const cantidadEnviados = await sincronizar();
      if (cantidadEnviados > 0) {
        const idsPendientes = new Set((await obtenerPendientes()).map(({ id }) => id));
        const idsEnviados = pendientesAntes
          .filter(({ id }) => !idsPendientes.has(id))
          .map(({ id }) => id);
        alSincronizar?.(idsEnviados);
      }
    } catch (error) {
      console.error("No se pudieron leer los reportes pendientes para sincronizarlos:", error);
    } finally {
      sincronizacionEnCurso = false;
    }
  };

  window.addEventListener("online", sincronizarYNotificar);
  const intervalo = window.setInterval(sincronizarYNotificar, INTERVALO_REINTENTO_MS);
  void sincronizarYNotificar(); // por si ya hay red al abrir la app
  return () => {
    window.removeEventListener("online", sincronizarYNotificar);
    window.clearInterval(intervalo);
  };
}
