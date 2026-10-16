'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Reporte } from '@/types/reporte';
import type { Asignacion } from '@/types/asignacion';
import {
  ShieldAlert,
  Users,
  Clock,
  Loader2,
  CheckCircle2,
  Radio,
  Navigation,
  Activity,
  Layers,
  List,
  X,
} from 'lucide-react';
import { supabase, obtenerReportes, marcarAtendida } from '@/lib/supabase';
import { getAsignacionesActivas } from '@/lib/asignaciones';
import PinGate from '@/components/PinGate';
import { getRescatista } from '@/lib/rescatista';
import BotonCaso from '@/components/BotonCaso';

const Mapa = dynamic(() => import('@/components/dashboard/Mapa'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-rose-500/20 border-t-rose-500 animate-spin"></div>
        <Radio className="w-5 h-5 text-rose-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>
      <span className="text-xs font-semibold tracking-wider text-slate-300">
        INICIALIZANDO RADAR TÁCTICO...
      </span>
    </div>
  ),
});

export default function DashboardPage() {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [alertaEnfocada, setAlertaEnfocada] = useState<Reporte | null>(null);

  // panel lateral abierto/cerrado (en celular arranca cerrado)
  const [panelAbierto, setPanelAbierto] = useState<boolean>(true);

  useEffect(() => {
    if (window.innerWidth < 768) setPanelAbierto(false);
  }, []);

  // avisa al mapa que cambió su tamaño al abrir/cerrar el panel
  useEffect(() => {
    window.dispatchEvent(new Event('resize'));
  }, [panelAbierto]);

  // vista del panel: todos los incidentes o solo los que yo tomé
  const [vista, setVista] = useState<'todos' | 'mios'>('todos');
  const [miId, setMiId] = useState<string>('');

  useEffect(() => {
    setMiId(getRescatista().id);
  }, []);

  // asignaciones de casos a rescatistas
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);

  const cargarAsignaciones = useCallback(async () => {
    try {
      const data = await getAsignacionesActivas();
      setAsignaciones(data);
    } catch (err) {
      console.warn('Error al cargar asignaciones:', err);
    }
  }, []);

  // mapa rapido de reporte_id -> asignacion
  const asignacionPorReporte = useMemo(() => {
    const m = new Map<string, Asignacion>();
    for (const a of asignaciones) {
      if (a.estado !== 'liberado') {
        m.set(a.reporte_id, a);
      }
    }
    return m;
  }, [asignaciones]);

  const cargarDatos = useCallback(async () => {
    try {
      if (typeof obtenerReportes === 'function') {
        const data = await obtenerReportes();
        if (data) {
          setReportes(data as Reporte[]);
        }
      }
    } catch (err) {
      console.warn('Error al cargar datos:', err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
    cargarAsignaciones();

    if (supabase) {
      const chReportes = supabase
        .channel('reportes_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'reportes' },
          () => cargarDatos()
        )
        .subscribe();

      const chAsignaciones = supabase
        .channel('asignaciones')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'asignaciones' },
          () => cargarAsignaciones()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(chReportes);
        supabase.removeChannel(chAsignaciones);
      };
    }
  }, [cargarDatos, cargarAsignaciones]);

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
      const cumpleEstado =
        filtroEstado === 'TODOS' || rep.estado === filtroEstado;
      return cumpleTipo && cumpleEstado;
    });
  }, [reportes, filtroTipo, filtroEstado]);

  // casos que este rescatista tomó (en camino o resueltos)
  const misReportes = useMemo(() => {
    if (!miId) return [] as Reporte[];
    return reportes.filter((rep) => {
      const a = asignacionPorReporte.get(rep.id);
      return !!a && a.rescatista_id === miId;
    });
  }, [reportes, asignacionPorReporte, miId]);

  const listaVisible = vista === 'mios' ? misReportes : reportesFiltrados;

  const conteoTipos = useMemo(() => {
    const act = reportes.filter((r) => r.estado !== 'ATENDIDA');
    return {
      MEDICA: act.filter((r) => r.tipo_emergencia === 'MEDICA').length,
      AGUA: act.filter((r) => r.tipo_emergencia === 'AGUA').length,
      RESCATE: act.filter((r) => r.tipo_emergencia === 'RESCATE').length,
      OTRO: act.filter((r) => r.tipo_emergencia === 'OTRO').length,
      TOTAL: act.length,
    };
  }, [reportes]);

  return (
    <PinGate>
    <div className="flex h-dvh w-full overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-rose-500/30">
      {/* SECCIÓN IZQUIERDA: MAPA */}
      <div className="flex-1 min-w-0 h-full relative">
        <button
          type="button"
          onClick={() => setPanelAbierto((v) => !v)}
          aria-expanded={panelAbierto}
          aria-label={panelAbierto ? 'Cerrar panel de incidentes' : 'Abrir panel de incidentes'}
          className="absolute bottom-6 right-4 z-[1000] flex items-center gap-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-black px-4 py-3 shadow-2xl border border-rose-300/40 active:scale-95 transition-all"
        >
          {panelAbierto ? <X className="w-4 h-4" /> : <List className="w-4 h-4" />}
          <span>{panelAbierto ? 'Cerrar panel' : `Incidentes (${reportesFiltrados.length})`}</span>
        </button>

        <header className="absolute top-4 left-16 z-[1000] bg-slate-900/80 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-2xl">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping absolute"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          </div>
          <div>
            <div className="text-[10px] font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
              <span>CENTRO DE OPERACIONES</span>
              <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
              <span className="text-emerald-400 font-bold">EN VIVO</span>
            </div>
            <h1 className="text-xs font-black tracking-wider text-white">
              RESCUENET / RADAR DE EMERGENCIAS
            </h1>
          </div>
          <div className="h-6 w-[1px] bg-white/10 mx-1"></div>
          <div className="bg-rose-500/20 border border-rose-500/40 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span className="text-xs font-black text-rose-300">
              {conteoTipos.TOTAL} Críticas
            </span>
          </div>
        </header>

        <Mapa
          reportes={listaVisible}
          onMarcarAtendida={handleMarcarAtendida}
          alertaSeleccionada={alertaEnfocada}
        />
      </div>

      {/* SECCIÓN DERECHA: PANEL LATERAL DE ALERTAS */}
      <div
        className={`${
          panelAbierto ? 'flex' : 'hidden'
        } fixed inset-0 z-[1100] w-full md:static md:inset-auto md:z-10 md:w-[420px] md:shrink-0 h-full flex-col border-l border-white/10 bg-slate-900/95 md:bg-slate-900/90 backdrop-blur-xl shadow-2xl`}
      >
        <div className="p-4 border-b border-white/10 space-y-3.5 bg-slate-950/40">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-black text-sm flex items-center gap-2 text-white tracking-wide">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              COLA DE INCIDENTES
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[11px] bg-slate-800 border border-white/10 text-slate-300 px-2.5 py-0.5 rounded-full font-bold">
                {listaVisible.length} visibles
              </span>
              <button
                type="button"
                onClick={() => setPanelAbierto(false)}
                aria-label="Cerrar panel de incidentes"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white active:scale-95 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Pestañas: todos / mis casos */}
          <div className="grid grid-cols-2 gap-1 bg-slate-950/80 p-1 rounded-xl border border-white/5 text-[11px] font-black">
            <button
              type="button"
              onClick={() => setVista('todos')}
              className={`py-2 rounded-lg transition-all ${
                vista === 'todos'
                  ? 'bg-slate-700 text-white shadow border border-white/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos ({reportesFiltrados.length})
            </button>
            <button
              type="button"
              onClick={() => setVista('mios')}
              className={`py-2 rounded-lg transition-all ${
                vista === 'mios'
                  ? 'bg-rose-600 text-white shadow border border-rose-300/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mis casos ({misReportes.length})
            </button>
          </div>

          {vista === 'todos' && (<>
          {/* Filtros por Categoría */}
          <div className="grid grid-cols-5 gap-1.5">
            <button
              onClick={() => setFiltroTipo('TODOS')}
              className={`py-1.5 px-2 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${
                filtroTipo === 'TODOS'
                  ? 'bg-slate-700 text-white shadow-md border border-slate-500'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Todos</span>
            </button>

            <button
              onClick={() => setFiltroTipo('MEDICA')}
              className={`py-1.5 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${
                filtroTipo === 'MEDICA'
                  ? 'bg-gradient-to-b from-rose-500 to-rose-700 text-white shadow-lg shadow-rose-950 border border-rose-400/50 scale-95'
                  : 'bg-slate-800/60 text-rose-400 hover:bg-rose-950/30'
              }`}
            >
              <span className="text-xs">🚑</span>
              <span>Médica ({conteoTipos.MEDICA})</span>
            </button>

            <button
              onClick={() => setFiltroTipo('AGUA')}
              className={`py-1.5 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${
                filtroTipo === 'AGUA'
                  ? 'bg-gradient-to-b from-sky-500 to-sky-700 text-white shadow-lg shadow-sky-950 border border-sky-400/50 scale-95'
                  : 'bg-slate-800/60 text-sky-400 hover:bg-sky-950/30'
              }`}
            >
              <span className="text-xs">💧</span>
              <span>Agua ({conteoTipos.AGUA})</span>
            </button>

            <button
              onClick={() => setFiltroTipo('RESCATE')}
              className={`py-1.5 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${
                filtroTipo === 'RESCATE'
                  ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-black shadow-lg shadow-amber-950 border border-amber-300 scale-95 font-black'
                  : 'bg-slate-800/60 text-amber-400 hover:bg-amber-950/30'
              }`}
            >
              <span className="text-xs">🛟</span>
              <span>Rescate ({conteoTipos.RESCATE})</span>
            </button>

            <button
              onClick={() => setFiltroTipo('OTRO')}
              className={`py-1.5 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${
                filtroTipo === 'OTRO'
                  ? 'bg-gradient-to-b from-slate-500 to-slate-700 text-white shadow-lg border border-slate-400 scale-95'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <span className="text-xs">⚠️</span>
              <span>Otro ({conteoTipos.OTRO})</span>
            </button>
          </div>

          {/* Selector de Estado */}
          <div className="flex gap-1 bg-slate-950/80 p-1 rounded-xl border border-white/5 text-[10px] font-bold text-slate-400">
            {['TODOS', 'PENDIENTE', 'EN_PROCESO', 'ATENDIDA'].map((est) => (
              <button
                key={est}
                onClick={() => setFiltroEstado(est)}
                className={`flex-1 py-1 rounded-lg transition-all ${
                  filtroEstado === est
                    ? 'bg-slate-800 text-white font-black shadow border border-white/10'
                    : 'hover:text-slate-200'
                }`}
              >
                {est}
              </button>
            ))}
          </div>
          </>)}
        </div>

        {/* Lista de incidentes */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          {cargando ? (
            <div className="h-48 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
              <span>Sincronizando reportes...</span>
            </div>
          ) : listaVisible.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-xs text-slate-500 p-5 border border-dashed border-slate-800 rounded-3xl">
              <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mb-2" />
              <span className="font-semibold text-slate-400">
                {vista === 'mios' ? 'Aún no has tomado ningún caso' : 'Zona despejada de emergencias'}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                {vista === 'mios'
                  ? 'Toma un caso desde la pestaña Todos'
                  : 'No hay incidentes activos en este filtro'}
              </span>
            </div>
          ) : (
            listaVisible.map((rep) => {
              const esMedica = rep.tipo_emergencia === 'MEDICA';
              const esAgua = rep.tipo_emergencia === 'AGUA';
              const esRescate = rep.tipo_emergencia === 'RESCATE';

              return (
                <div
                  key={rep.id}
                  onClick={() => {
                    setAlertaEnfocada(rep);
                    if (window.innerWidth < 768) setPanelAbierto(false);
                  }}
                  className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    rep.estado === 'ATENDIDA'
                      ? 'bg-slate-950/30 border-slate-800/40 opacity-50'
                      : esMedica
                      ? 'bg-gradient-to-br from-slate-900 to-rose-950/20 border-rose-500/30 hover:border-rose-500/60 shadow-lg shadow-rose-950/10'
                      : esAgua
                      ? 'bg-gradient-to-br from-slate-900 to-sky-950/20 border-sky-500/30 hover:border-sky-500/60 shadow-lg shadow-sky-950/10'
                      : esRescate
                      ? 'bg-gradient-to-br from-slate-900 to-amber-950/20 border-amber-500/30 hover:border-amber-500/60 shadow-lg shadow-amber-950/10'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${
                      esMedica
                        ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                        : esAgua
                        ? 'bg-sky-500 shadow-[0_0_8px_#0ea5e9]'
                        : esRescate
                        ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'
                        : 'bg-slate-600'
                    }`}
                  ></div>

                  <div className="flex items-center justify-between mb-2 pl-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          esMedica
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : esAgua
                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                            : esRescate
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {rep.tipo_emergencia}
                      </span>

                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          rep.estado === 'EN_PROCESO'
                            ? 'text-blue-300 bg-blue-950/60 border border-blue-800/50'
                            : rep.estado === 'PENDIENTE'
                            ? 'text-amber-300 bg-amber-950/60 border border-amber-800/50'
                            : 'text-emerald-400 bg-emerald-950/50'
                        }`}
                      >
                        {rep.estado}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(rep.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 font-semibold mb-2.5 pl-2 leading-relaxed group-hover:text-white transition-colors">
                    {rep.descripcion || 'Sin descripción ingresada'}
                  </p>

                  <div className="flex items-center justify-between pt-2.5 border-t border-white/5 text-xs pl-2">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>{rep.personas_afectadas ?? 1} afectadas</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        title="Ver en el mapa"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {(rep.estado !== 'ATENDIDA' || vista === 'mios') && (
                      <div className="mt-2 pt-2 border-t border-white/5">
                        <BotonCaso
                          reporte={rep}
                          asignacion={asignacionPorReporte.get(rep.id) ?? null}
                          onCambio={cargarAsignaciones}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
    </PinGate>
  );
}