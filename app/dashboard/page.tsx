'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Reporte } from '@/components/dashboard/Mapa';
import {
  ShieldAlert,
  Users,
  Clock,
  Loader2,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import { supabase, obtenerReportes, marcarAtendida } from '@/lib/supabase';

// Carga dinámica obligatoria para Leaflet en Next.js (evita error de window)
const Mapa = dynamic(() => import('@/components/dashboard/Mapa'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin text-rose-500 mr-2" />
      <span>Cargando mapa táctico...</span>
    </div>
  ),
});

export default function DashboardPage() {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');

  // Consulta los reportes reales de Supabase
  const cargarDatos = useCallback(async () => {
    try {
      if (typeof obtenerReportes === 'function') {
        const data = await obtenerReportes();
        if (data) {
          setReportes(data as Reporte[]);
        }
      }
    } catch (err) {
      console.warn('Error al cargar datos desde Supabase:', err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();

    // Supabase Realtime para que los nuevos reportes aparezcan solos
    if (supabase) {
      const channel = supabase
        .channel('reportes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'reportes' },
          () => {
            cargarDatos();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [cargarDatos]);

  // Acción del botón "Atender"
  const handleMarcarAtendida = async (id: string) => {
    // 1. Actualización visual inmediata
    setReportes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, estado: 'ATENDIDA' } : r))
    );

    // 2. Notificación a Supabase
    try {
      if (typeof marcarAtendida === 'function') {
        await marcarAtendida(id);
      }
    } catch (err) {
      console.error('Error al marcar atendida en Supabase:', err);
      cargarDatos();
    }
  };

  // Filtrado de la lista lateral y del mapa
  const reportesFiltrados = useMemo(() => {
    return reportes.filter((rep) => {
      const cumpleTipo = filtroTipo === 'TODOS' || rep.tipo_emergencia === filtroTipo;
      const cumpleEstado =
        filtroEstado === 'TODOS' || rep.estado === filtroEstado;
      return cumpleTipo && cumpleEstado;
    });
  }, [reportes, filtroTipo, filtroEstado]);

  const totalPendientes = useMemo(
    () => reportes.filter((r) => r.estado !== 'ATENDIDA').length,
    [reportes]
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* SECCIÓN IZQUIERDA: MAPA */}
      <div className="flex-1 h-full relative">
        {/* Barra superior con left-16 para NO tapar los botones de zoom (+ y -) */}
        <header className="absolute top-3 left-16 z-[1000] bg-slate-900/90 backdrop-blur border border-slate-700/60 px-3 py-2 rounded-2xl flex items-center gap-3 shadow-xl">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <span className="text-xs font-black tracking-wider text-white">
              CENTRO DE CONTROL / RESCUENET
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="text-xs text-slate-300">
            Pendientes:{' '}
            <span className="font-bold text-amber-400">{totalPendientes}</span>
          </div>
        </header>

        {/* Pasamos los reportes filtrados al mapa */}
        <Mapa reportes={reportesFiltrados} onMarcarAtendida={handleMarcarAtendida} />
      </div>

      {/* SECCIÓN DERECHA: PANEL LATERAL DE ALERTAS */}
      <div className="w-[390px] h-full flex flex-col border-l border-slate-800 bg-slate-900/95 z-10 shadow-2xl">
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-sm flex items-center gap-2 text-white">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              Gestión de Alertas
            </h2>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">
              {reportesFiltrados.length}
            </span>
          </div>

          {/* Filtros por tipo de emergencia */}
          <div className="grid grid-cols-5 gap-1 text-[10px] font-bold">
            {['TODOS', 'MEDICA', 'AGUA', 'RESCATE', 'OTRO'].map((tipo) => (
              <button
                key={tipo}
                onClick={() => setFiltroTipo(tipo)}
                className={`py-1 rounded-md transition-colors ${
                  filtroTipo === tipo
                    ? tipo === 'MEDICA'
                      ? 'bg-rose-600 text-white'
                      : tipo === 'AGUA'
                      ? 'bg-sky-600 text-white'
                      : tipo === 'RESCATE'
                      ? 'bg-amber-500 text-black'
                      : tipo === 'OTRO'
                      ? 'bg-slate-500 text-white'
                      : 'bg-slate-700 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {tipo}
              </button>
            ))}
          </div>

          {/* Filtros por estado */}
          <div className="flex gap-1 text-[10px] font-semibold text-slate-400">
            {['TODOS', 'PENDIENTE', 'EN_PROCESO', 'ATENDIDA'].map((est) => (
              <button
                key={est}
                onClick={() => setFiltroEstado(est)}
                className={`flex-1 py-1 px-1 rounded-md border ${
                  filtroEstado === est
                    ? 'border-slate-500 bg-slate-800 text-white'
                    : 'border-transparent bg-slate-950/40 text-slate-400 hover:text-slate-300'
                }`}
              >
                {est}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de alertas */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {cargando ? (
            <div className="h-40 flex items-center justify-center text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Cargando alertas...
            </div>
          ) : reportesFiltrados.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center text-xs text-slate-500 p-4 border border-dashed border-slate-800 rounded-2xl">
              <CheckCircle2 className="w-6 h-6 text-emerald-500/50 mb-1" />
              <span>No hay reportes con este filtro</span>
            </div>
          ) : (
            reportesFiltrados.map((rep) => (
              <div
                key={rep.id}
                className={`p-3 rounded-2xl border transition-all ${
                  rep.estado === 'ATENDIDA'
                    ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                    : rep.estado === 'EN_PROCESO'
                    ? 'bg-slate-950 border-blue-900/60 shadow-lg'
                    : 'bg-slate-950 border-slate-800 shadow-md'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-md ${
                        rep.tipo_emergencia === 'MEDICA'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : rep.tipo_emergencia === 'AGUA'
                          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                          : rep.tipo_emergencia === 'RESCATE'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                      }`}
                    >
                      {rep.tipo_emergencia}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        rep.estado === 'EN_PROCESO'
                          ? 'text-blue-400 bg-blue-950/50 border border-blue-800/40'
                          : rep.estado === 'PENDIENTE'
                          ? 'text-amber-400 bg-amber-950/50 border border-amber-800/40'
                          : 'text-emerald-400'
                      }`}
                    >
                      {rep.estado}
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {new Date(rep.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <p className="text-xs text-slate-200 font-medium mb-2">
                  {rep.descripcion || 'Sin descripción'}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    {rep.personas_afectadas ?? 1} pers.
                  </span>

                  {rep.estado !== 'ATENDIDA' && (
                    <button
                      onClick={() => handleMarcarAtendida(rep.id)}
                      className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-lg text-[10px] font-bold transition-all"
                    >
                      Atender
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}