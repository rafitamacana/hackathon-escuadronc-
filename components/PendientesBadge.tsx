"use client";

import React, { useEffect, useState } from "react";
import { WifiOff, CloudUpload } from "lucide-react";
import { obtenerPendientes } from "@/lib/db-local";

// aviso visible cuando hay alertas guardadas en el celular esperando internet
export default function PendientesBadge() {
  const [pendientes, setPendientes] = useState(0);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let activo = true;

    const revisar = async () => {
      try {
        const lista = await obtenerPendientes();
        if (activo) setPendientes(lista.length);
      } catch {
        // si IndexedDB falla no rompemos la pantalla
      }
    };

    const actualizarRed = () => {
      setOnline(navigator.onLine);
      void revisar();
    };

    setOnline(navigator.onLine);
    void revisar();
    const intervalo = window.setInterval(revisar, 2000);
    window.addEventListener("online", actualizarRed);
    window.addEventListener("offline", actualizarRed);

    return () => {
      activo = false;
      window.clearInterval(intervalo);
      window.removeEventListener("online", actualizarRed);
      window.removeEventListener("offline", actualizarRed);
    };
  }, []);

  if (pendientes === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute left-1/2 -translate-x-1/2 bottom-[12.5rem] z-30 w-[min(22rem,calc(100%-1.5rem))] flex items-center gap-3 rounded-2xl border border-amber-400/60 bg-amber-950/90 px-4 py-3 text-amber-100 shadow-2xl backdrop-blur-md"
    >
      {online ? (
        <CloudUpload className="h-6 w-6 shrink-0 animate-pulse text-amber-300" />
      ) : (
        <WifiOff className="h-6 w-6 shrink-0 text-amber-300" />
      )}
      <div className="text-xs leading-snug">
        <p className="font-black uppercase tracking-wide">
          {pendientes === 1
            ? "1 alerta pendiente de enviar"
            : `${pendientes} alertas pendientes de enviar`}
        </p>
        <p className="text-amber-200/90">
          {online
            ? "Enviando ahora que hay conexión..."
            : "Sin internet: se enviará automáticamente cuando vuelva la conexión."}
        </p>
      </div>
    </div>
  );
}
