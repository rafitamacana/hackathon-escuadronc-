"use client";

import React, { useState, useEffect } from "react";
import { Loader2, UserCheck, RotateCcw, CheckCircle, WifiOff } from "lucide-react";
import type { Reporte } from "@/types/reporte";
import type { Asignacion } from "@/types/asignacion";
import { getRescatista } from "@/lib/rescatista";
import {
  tomarCaso,
  soltarCaso,
  resolverCaso,
} from "@/lib/asignaciones";

const mensajeReporteTomado =
  "Este reporte ya fue tomado por otro rescatista.";

interface BotonCasoProps {
  reporte: Reporte;
  asignacion?: Asignacion | null;
  onCambio: () => void; // para recargar las asignaciones
}

// boton para tomar, resolver o soltar un caso
export default function BotonCaso({ reporte, asignacion, onCambio }: BotonCasoProps) {
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [online, setOnline] = useState(true);

  // escuchar cambios de conectividad
  useEffect(() => {
    setOnline(navigator.onLine);

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const rescatista = getRescatista();
  const esMio = asignacion && asignacion.rescatista_id === rescatista.id;

  const handleTomar = async () => {
    if (!online || cargando) return;
    setCargando(true);
    setMensaje("");
    try {
      await tomarCaso(reporte.id, rescatista.id, rescatista.nombre);
      onCambio();
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === mensajeReporteTomado
      ) {
        window.alert(error.message);
        onCambio();
      } else {
        setMensaje("Error de conexión");
      }
    } finally {
      setCargando(false);
    }
  };

  const handleResolver = async () => {
    if (!online || cargando || !asignacion) return;
    setCargando(true);
    try {
      await resolverCaso(asignacion.id, reporte.id);
      onCambio();
    } catch {
      setMensaje("Error al resolver");
    } finally {
      setCargando(false);
    }
  };

  const handleSoltar = async () => {
    if (!online || cargando || !asignacion) return;
    setCargando(true);
    try {
      await soltarCaso(asignacion.id, reporte.id);
      onCambio();
    } catch {
      setMensaje("Error al soltar");
    } finally {
      setCargando(false);
    }
  };

  // sin conexion
  if (!online) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-800/60 rounded-lg px-2.5 py-1.5">
        <WifiOff className="w-3 h-3" />
        Sin conexión: no se puede asignar
      </div>
    );
  }

  // caso resuelto
  if (asignacion?.estado === "resuelto") {
    return (
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 rounded-lg px-2.5 py-1.5">
        <CheckCircle className="w-3 h-3" />
        Resuelto por {asignacion.rescatista_nombre}
      </div>
    );
  }

  // caso en camino
  if (asignacion?.estado === "en_camino") {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-300 bg-amber-950/40 border border-amber-500/30 rounded-lg px-2.5 py-1.5">
          <UserCheck className="w-3 h-3" />
          En camino: {asignacion.rescatista_nombre}
        </div>
        {esMio && (
          <div className="flex gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); handleResolver(); }}
              disabled={cargando}
              className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50"
            >
              {cargando ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
              Resuelto
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleSoltar(); }}
              disabled={cargando}
              className="py-1.5 px-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3" />
              Soltar
            </button>
          </div>
        )}
        {mensaje && (
          <p className="text-[10px] text-rose-400 mt-1">{mensaje}</p>
        )}
      </div>
    );
  }

  // sin asignacion — caso libre
  return (
    <div className="space-y-1.5">
      <button
        onClick={(e) => { e.stopPropagation(); handleTomar(); }}
        disabled={cargando}
        className="w-full py-1.5 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 shadow-md shadow-rose-950 transition-all active:scale-95 disabled:opacity-50"
      >
        {cargando ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
        Tomar caso
      </button>
      {process.env.NODE_ENV === "development" && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            window.alert(mensajeReporteTomado);
          }}
          className="w-full py-1 px-2 text-slate-400 hover:text-slate-200 text-[10px] underline underline-offset-2"
        >
          Simular alerta (solo desarrollo)
        </button>
      )}
      {mensaje && (
        <p className="text-[10px] text-rose-400">{mensaje}</p>
      )}
    </div>
  );
}
