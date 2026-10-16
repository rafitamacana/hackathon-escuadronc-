"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, Loader2, Lock } from "lucide-react";
import { setNombreRescatista } from "@/lib/rescatista";

const OK_KEY = "rescatista_ok";
const NOMBRE_KEY = "rescatista_nombre";

interface PinGateProps {
  children: React.ReactNode;
}

// protege la pagina de rescatistas con un codigo compartido
// funciona 100% offline (compara contra la variable de entorno publica)
export default function PinGate({ children }: PinGateProps) {
  const [autorizado, setAutorizado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [pin, setPin] = useState("");
  const [alias, setAlias] = useState("");
  const [error, setError] = useState("");

  // al montar, checa si ya se habia autenticado
  useEffect(() => {
    // limpia el flag viejo que se guardaba para siempre en localStorage
    localStorage.removeItem(OK_KEY);
    const guardado = sessionStorage.getItem(OK_KEY);
    if (guardado === "1") {
      setAutorizado(true);
    }
    setCargando(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // PIN 1009 siempre válido; también el de la variable de entorno si existe
    const pinEnv = process.env.NEXT_PUBLIC_PIN_RESCATISTA;
    const pinIngresado = pin.trim();
    if (pinIngresado !== "1009" && (!pinEnv || pinIngresado !== pinEnv)) {
      setError("Código incorrecto. Verifica con tu coordinador.");
      return;
    }

    const brigada = alias.trim();
    if (brigada.length < 2) {
      setError("Indica a qué brigada perteneces.");
      return;
    }
    sessionStorage.setItem(OK_KEY, "1");
    setNombreRescatista(brigada);
    setAutorizado(true);
  };

  // pantalla de carga para no parpadear
  if (cargando) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950">
        <Loader2 className="w-6 h-6 text-rose-500 animate-spin" />
      </div>
    );
  }

  // ya autorizado, muestra el contenido
  if (autorizado) {
    return <>{children}</>;
  }

  // formulario de acceso
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-950 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5"
      >
        {/* cabecera */}
        <div className="text-center space-y-1">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-3">
            <ShieldAlert className="w-7 h-7 text-rose-400" />
          </div>
          <h1 className="text-lg font-black text-white tracking-wide">
            Acceso Rescatistas
          </h1>
          <p className="text-xs text-slate-400">
            Ingresa el código y tu brigada
          </p>
        </div>

        {/* campo del codigo */}
        <div>
          <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            <Lock className="w-3 h-3 inline mr-1" />
            Código de acceso
          </label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Ingresa el código"
            autoComplete="off"
            inputMode="numeric"
            required
            className="w-full bg-slate-950/70 text-white placeholder-slate-500 text-sm rounded-xl px-4 py-3 border border-slate-700 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>

        {/* campo del alias */}
        <div>
          <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Brigada
          </label>
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder='Ej. "Brigada Norte"'
            autoComplete="off"
            required
            className="w-full bg-slate-950/70 text-white placeholder-slate-500 text-sm rounded-xl px-4 py-3 border border-slate-700 focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>

        {/* error */}
        {error && (
          <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-500/30 rounded-xl p-2.5 text-center">
            {error}
          </p>
        )}

        {/* boton */}
        <button
          type="submit"
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-sm tracking-wide uppercase shadow-lg shadow-rose-950/40 active:scale-[0.98] transition-all"
        >
          Ingresar al panel
        </button>

        <p className="text-[10px] text-slate-500 text-center">
          Si no tienes código, contacta a tu coordinador de zona.
        </p>
      </form>
    </div>
  );
}
