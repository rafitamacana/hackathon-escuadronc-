'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Reporte } from '@/types/reporte';
import { CentroApoyo } from '@/components/dashboard/Mapa';
import {
  ShieldAlert,
  Users,
  Clock,
  Loader2,
  CheckCircle2,
  Radio,
  Navigation,
  HeartPulse,
  Phone,
  Layers,
} from 'lucide-react';
import { supabase, obtenerReportes, marcarAtendida } from '@/lib/supabase';

const Mapa = dynamic(() => import('@/components/dashboard/Mapa'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-rose-500/20 border-t-rose-500 animate-spin"></div>
        <Radio className="w-5 h-5 text-rose-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>
      <span className="text-xs font-semibold tracking-wider text-slate-300">
        INICIALIZANDO RADAR GUASAVE...
      </span>
    </div>
  ),
});

export default function DashboardPage() {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [centros, setCentros] = useState<CentroApoyo[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);

  // Switch principal: Emergencias o Centros de Apoyo
  const [pestanaActiva, setPestanaActiva] = useState<'EMERGENCIAS' | 'CENTROS'>('EMERGENCIAS');

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [filtroTipoCentro, setFiltroTipoCentro] = useState<string>('TODOS');

  // Elemento enfocado en el mapa
  const [elementoEnfocado, setElementoEnfocado] = useState<Reporte | CentroApoyo | null>(null);

  const cargarDatos = useCallback(async () => {
    try {
      if (typeof obtenerReportes === 'function') {
        const dataRep = await obtenerReportes();
        if (dataRep) setReportes(dataRep as Reporte[]);
      }

      if (supabase) {
        const { data: dataCentros, error } = await supabase
          .from('centros_apoyo')
          .select('*')
          .order('nombre', { ascending: true });
        if (dataCentros && !error) {
          setCentros(dataCentros as CentroApoyo[]);
        }
      }
    } catch (err) {
      console.warn('Error al sincronizar con Supabase:', err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();

    if (supabase) {
      const canal = supabase
        .channel('dashboard_realtime_dual')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'reportes' },
          () => cargarDatos()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'centros_apoyo' },
          () => cargarDatos()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(canal);
      };
    }
  }, [cargarDatos]);

  const handleMarcarAtendida = async (id: string) => {
    setReportes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, estado: 'ATENDIDA' } : r))
    );

    try {
      if (typeof marcarAtendida === 'function') {
        await marcarAtendida(id);
      }
    } catch (err) {
      console.error('Error al marcar atendida en Supabase:', err);
      cargarDatos();
    }
  };

  const reportesFiltrados = useMemo(() => {
    return reportes.filter((rep) => {
      const cumpleTipo = filtroTipo === 'TODOS' || rep.tipo_emergencia === filtroTipo;
      const cumpleEstado = filtroEstado === 'TODOS' || rep.estado === filtroEstado;
      return cumpleTipo && cumpleEstado;
    });
  }, [reportes, filtroTipo, filtroEstado]);

  const centrosFiltrados = useMemo(() => {
    return centros.filter((cen) => {
      if (filtroTipoCentro === 'TODOS') return true;
      return cen.tipo === filtroTipoCentro;
    });
  }, [centros, filtroTipoCentro]);

  const totalAfectadosActivos = useMemo(() => {
    return reportes
      .filter((r) => r.estado !== 'ATENDIDA')
      .reduce((acc, curr) => acc + (curr.personas_afectadas ?? 1), 0);
  }, [reportes]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-rose-500/30">
      {/* SECCIÓN IZQUIERDA: MAPA */}
      <div className="flex-1 h-full relative">
        <header className="absolute top-4 left-16 z-[1000] bg-slate-900/90 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-2xl">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping absolute"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          </div>
          <div>
            <div className="text-[10px] font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
              <span>RADAR GUASAVE</span>
              <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
              <span className="text-emerald-400 font-bold">MODO TÁCTICO</span>
            </div>
            <h1 className="text-xs font-black tracking-wider text-white">
              RESCUENET / CENTRO DE MANDO
            </h1>
          </div>
          <div className="h-6 w-[1px] bg-white/10 mx-1"></div>
          <div className="bg-rose-500/20 border border-rose-500/40 px-3 py-1 rounded-xl flex items-center gap-1.5">
            <Users className="w-4 h-4 text-rose-400 animate-pulse" />
            <span className="text-xs font-black text-rose-300">
              {totalAfectadosActivos} Afectados
            </span>
          </div>
        </header>

        {/* Pasamos solo la lista que corresponda a la pestaña activa */}
        <Mapa
          reportes={pestanaActiva === 'EMERGENCIAS' ? reportesFiltrados : []}
          centros={pestanaActiva === 'CENTROS' ? centrosFiltrados : []}
          onMarcarAtendida={handleMarcarAtendida}
          elementoSeleccionado={elementoEnfocado}
          centro={[25.568, -108.470]}
        />
      </div>

      {/* SECCIÓN DERECHA: PANEL LATERAL */}
      <div className="w-[430px] h-full flex flex-col border-l border-white/10 bg-slate-900/90 backdrop-blur-xl z-10 shadow-2xl">
        <div className="p-4 border-b border-white/10 space-y-3 bg-slate-950/40">
          <div className="flex bg-slate-950 p-1 rounded-2xl border border-white/5">
            <button
              onClick={() => {
                setPestanaActiva('EMERGENCIAS');
                setElementoEnfocado(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                pestanaActiva === 'EMERGENCIAS'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Emergencias ({reportes.filter((r) => r.estado !== 'ATENDIDA').length})</span>
            </button>
            <button
              onClick={() => {
                setPestanaActiva('CENTROS');
                setElementoEnfocado(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                pestanaActiva === 'CENTROS'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HeartPulse className="w-3.5 h-3.5" />
              <span>Centros Apoyo ({centros.length})</span>
            </button>
          </div>

          {pestanaActiva === 'EMERGENCIAS' ? (
            <>
              <div className="grid grid-cols-5 gap-1 text-[10px] font-bold">
                {['TODOS', 'MEDICA', 'AGUA', 'RESCATE', 'OTRO'].map((tipo) => (
                  <button
                    key={tipo}
                    onClick={() => setFiltroTipo(tipo)}
                    className={`py-1.5 rounded-lg transition-all ${
                      filtroTipo === tipo
                        ? 'bg-slate-700 text-white border border-slate-500 shadow'
                        : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {tipo}
                  </button>
                ))}
              </div>

              <div className="flex gap-1 bg-slate-950 p-1 rounded-xl text-[10px] font-bold text-slate-400">
                {['TODOS', 'PENDIENTE', 'EN_PROCESO', 'ATENDIDA'].map((est) => (
                  <button
                    key={est}
                    onClick={() => setFiltroEstado(est)}
                    className={`flex-1 py-1 rounded-lg transition-all ${
                      filtroEstado === est
                        ? 'bg-slate-800 text-white font-black'
                        : 'hover:text-slate-200'
                    }`}
                  >
                    {est}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-4 gap-1 text-[10px] font-bold">
              {['TODOS', 'HOSPITAL', 'ALBERGUE', 'FARMACIA'].map((tc) => (
                <button
                  key={tc}
                  onClick={() => setFiltroTipoCentro(tc)}
                  className={`py-1.5 rounded-lg transition-all ${
                    filtroTipoCentro === tc
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {tc}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          {cargando ? (
            <div className="h-48 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
              <span>Sincronizando con Supabase...</span>
            </div>
          ) : pestanaActiva === 'EMERGENCIAS' ? (
            reportesFiltrados.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-3xl">
                <CheckCircle2 className="w-7 h-7 text-emerald-500/40 mb-1" />
                <span>No hay emergencias en este filtro</span>
              </div>
            ) : (
              reportesFiltrados.map((rep) => {
                const personas = rep.personas_afectadas ?? 1;
                return (
                  <div
                    key={rep.id}
                    onClick={() => setElementoEnfocado(rep)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      rep.estado === 'ATENDIDA'
                        ? 'bg-slate-950/40 border-slate-800/40 opacity-50'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-600 shadow-lg'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          {rep.tipo_emergencia}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                          {rep.estado}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {new Date(rep.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="my-2 bg-rose-950/40 border border-rose-500/30 px-3 py-1.5 rounded-xl flex items-center justify-between">
                      <span className="text-xs font-black text-rose-300 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-rose-400" />
                        {personas === 0 ? 'Sin lesionados reportados' : `${personas} Personas Afectadas`}
                      </span>
                      {personas > 2 && (
                        <span className="text-[9px] font-bold bg-rose-600 text-white px-2 py-0.2 rounded-full uppercase">
                          Alta Prioridad
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-200 font-semibold mb-3 leading-relaxed">
                      {rep.descripcion || 'Sin descripción ingresada.'}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                      <button className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1">
                        <Navigation className="w-3.5 h-3.5 text-sky-400" /> Enfocar
                      </button>

                      {rep.estado !== 'ATENDIDA' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarcarAtendida(rep.id);
                          }}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black shadow-md shadow-emerald-950 transition-all active:scale-95"
                        >
                          Atender
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )
          ) : (
            centrosFiltrados.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-3xl">
                <span>No hay centros registrados en esta categoría</span>
              </div>
            ) : (
              centrosFiltrados.map((cen, idx) => (
                <div
                  key={cen.id || `c-${idx}`}
                  onClick={() => setElementoEnfocado(cen)}
                  className="p-3.5 rounded-2xl border border-slate-800 bg-slate-900/90 hover:border-emerald-500/50 transition-all cursor-pointer shadow-lg"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {cen.tipo}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        cen.estado === 'SATURADO'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {cen.estado || 'DISPONIBLE'}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-white mb-0.5">{cen.nombre}</h3>
                  <p className="text-[11px] text-slate-400 mb-2">{cen.direccion}</p>

                  {cen.capacidad_total ? (
                    <div className="bg-slate-950 p-2 rounded-xl border border-white/5 mb-2">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">Ocupación:</span>
                        <span className="font-bold text-slate-200">
                          {cen.ocupacion_actual || 0} / {cen.capacidad_total} camas/espacios
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (((cen.ocupacion_actual || 0) / cen.capacidad_total) * 100))}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between pt-1 text-xs">
                    {cen.contacto ? (
                      <a
                        href={`tel:${cen.contacto}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-emerald-400 font-bold flex items-center gap-1 hover:underline text-[11px]"
                      >
                        <Phone className="w-3 h-3" /> {cen.contacto}
                      </a>
                    ) : <span />}

                    <button className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-sky-400" /> Ubicar
                    </button>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}