'use client';


import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { marcarAtendida, supabase } from '../lib/supabase';
import EmergencyReportModal from './EmergencyReportModal';
import { Plus } from 'lucide-react';

import {
  AlertTriangle,
  ShieldAlert,
  PhoneCall,
  Navigation,
  Compass,
  Crosshair,
  Radio,
  Loader2,
  ChevronDown,
  X
} from 'lucide-react';

const OPENFREEMAP_DARK_STYLE = 'https://tiles.openfreemap.org/styles/dark';
const DEFAULT_FALLBACK_COORDS = { lat: 25.7904, lng: -108.9959, accuracy: 20 };

type TipoEmergencia = 'MEDICA' | 'AGUA' | 'RESCATE' | 'OTRO';
type EstadoReporte = 'PENDIENTE' | 'EN_PROCESO' | 'ATENDIDA';

interface EmergencyRow {
  id: string;
  tipo_emergencia: TipoEmergencia;
  latitud: number;
  longitud: number;
  descripcion: string | null;
  personas_afectadas: number;
  estado: EstadoReporte;
  created_at: string;
}

interface SupportCenterRow {
  id: string;
  nombre: string;
  tipo: string;
  direccion: string;
  latitud: number;
  longitud: number;
  capacidad_total: number | null;
  ocupacion_actual: number | null;
  estado: 'DISPONIBLE' | 'SATURADO' | 'CERRADO';
  servicios: string[] | null;
  contacto: string | null;
}

interface MapPoint {
  id: string;
  title: string;
  type: string;
  lat: number;
  lng: number;
  address: string;
  detail: string;
  status?: string;
  phone?: string | null;
  severity?: string;
}

const mapEmergency = (row: EmergencyRow): MapPoint => {
  const emergencyTypes: Record<TipoEmergencia, string> = {
    MEDICA: 'medical',
    AGUA: 'water',
    RESCATE: 'rescue',
    OTRO: 'other'
  };

  return {
    id: row.id,
    title: `Emergencia: ${row.tipo_emergencia}`,
    type: emergencyTypes[row.tipo_emergencia],
    lat: row.latitud,
    lng: row.longitud,
    address: `Cerca de lat: ${row.latitud.toFixed(4)}, lng: ${row.longitud.toFixed(4)}`,
    detail: `[Personas involucradas: ${row.personas_afectadas}] ${row.descripcion || 'Sin descripción adicional'}`,
    status: row.estado,
    severity: row.estado
  };
};

const mapSupportCenter = (row: SupportCenterRow): MapPoint => ({
  id: row.id,
  title: row.nombre,
  type: row.tipo.toLowerCase(),
  lat: row.latitud,
  lng: row.longitud,
  address: row.direccion,
  detail: [
    `Estado: ${row.estado}`,
    row.capacidad_total !== null ? `Capacidad: ${row.ocupacion_actual ?? 0}/${row.capacidad_total}` : '',
    row.servicios?.length ? `Servicios: ${row.servicios.join(', ')}` : ''
  ].filter(Boolean).join(' · '),
  status: row.estado,
  phone: row.contacto
});

maplibregl.setWorkerUrl(
  `https://unpkg.com/maplibre-gl@${maplibregl.getVersion()}/dist/maplibre-gl-worker.mjs`
);

const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

export default function EmergencyMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const activeMarkersRef = useRef<any[]>([]);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'emergencies' | 'support'>('emergencies');
  const [userPos, setUserPos] = useState<any>(DEFAULT_FALLBACK_COORDS);
  const [selectedPoint, setSelectedPoint] = useState<any | null>(null);
  const [isGpsLocked, setIsGpsLocked] = useState(true);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isCancellingEmergency, setIsCancellingEmergency] = useState(false);
  const [cancellationError, setCancellationError] = useState('');

  // Estados de la base de datos
  const [emergencies, setEmergencies] = useState<MapPoint[]>([]);
  const [supportCenters, setSupportCenters] = useState<MapPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Carga inicial de datos desde Supabase
  const fetchData = useCallback(async () => {
    try {
      const [emergenciesRes, centersRes] = await Promise.all([
        supabase
          .from('reportes')
          .select('*')
          .neq('estado', 'ATENDIDA')
          .order('created_at', { ascending: false }),
        supabase
          .from('centros_apoyo')
          .select('*')
          .neq('estado', 'CERRADO')
      ]);

      if (emergenciesRes.error) {
        console.error('Error al consultar reportes en Supabase:', emergenciesRes.error.message);
      } else {
        setEmergencies((emergenciesRes.data as EmergencyRow[]).map(mapEmergency));
      }

      if (centersRes.error) {
        console.error('Error al consultar centros de apoyo en Supabase:', centersRes.error.message);
      } else {
        setSupportCenters((centersRes.data as SupportCenterRow[]).map(mapSupportCenter));
      }
    } catch (err) {
      console.error('Error al consultar Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 2. Suscripción en tiempo real (WebSockets de Supabase)
  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('realtime_emergency_map')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reportes' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'centros_apoyo' },
        () => fetchData()
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Error en la suscripción Realtime de Supabase:', err ?? status);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // 3. Inicialización del mapa MapLibre GL
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: OPENFREEMAP_DARK_STYLE,
      center: [userPos.lng, userPos.lat],
      zoom: 14.8,
      attributionControl: false
    });

    mapRef.current = map;
    const transparentPixel = {
      width: 1,
      height: 1,
      data: new Uint8Array(4)
    };

    map.setMissingStyleImageResolver((id) => {
      if (id === 'wood-pattern' && !map.hasImage(id)) {
        map.addImage(id, transparentPixel);
      }
    });

    map.on('load', () => setIsMapLoaded(true));

    const userEl = document.createElement('div');
    userEl.className = 'user-marker-container';
    userEl.innerHTML = `
      <div class="user-marker-pulse"></div>
      <div class="user-marker-dot"></div>
    `;

    userMarkerRef.current = new maplibregl.Marker({ element: userEl })
      .setLngLat([userPos.lng, userPos.lat])
      .addTo(map);

    map.on('load', () => {
      map.addSource('route-line', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: []
          }
        }
      });

      map.addLayer({
        id: 'route-line-layer',
        type: 'line',
        source: 'route-line',
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': '#38bdf8',
          'line-width': 3,
          'line-dasharray': [2, 2]
        }
      });
    });

    return () => map.remove();
  }, []);

  // 4. Geolocalización por hardware continua
  useEffect(() => {
    let watcher = null;
    if ('geolocation' in navigator) {
      watcher = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy)
          };
          setUserPos(coords);

          if (userMarkerRef.current) {
            userMarkerRef.current.setLngLat([coords.lng, coords.lat]);
          }

          if (isGpsLocked && mapRef.current) {
            mapRef.current.easeTo({
              center: [coords.lng, coords.lat],
              duration: 800
            });
          }
        },
        (err) => console.warn('GPS no disponible, usando fallback:', err.message),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    }
    return () => {
      if (watcher !== null) navigator.geolocation.clearWatch(watcher);
    };
  }, [isGpsLocked]);

  // 5. Renderizar marcadores dinámicos traídos desde la base de datos
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    activeMarkersRef.current.forEach((m) => m.remove());
    activeMarkersRef.current = [];

    const isEmergencyMode = viewMode === 'emergencies';
    const currentList = isEmergencyMode ? emergencies : supportCenters;

    currentList.forEach((item) => {
      const el = document.createElement('div');
      el.className = `event-pin ${
        isEmergencyMode
          ? item.type === 'rescue'
            ? 'bg-rose-600 pin-critical'
            : item.type === 'medical'
            ? 'bg-red-500'
            : 'bg-amber-500'
          : item.type === 'hospital'
          ? 'bg-emerald-600'
          : item.type === 'fire_station'
          ? 'bg-orange-600'
          : 'bg-sky-600'
      }`;

      el.innerText = isEmergencyMode
        ? item.type === 'rescue'
        ? '🛟'
          : item.type === 'medical'
          ? '🚑'
        : item.type === 'water'
        ? '💧'
        : '⚠️'
        : item.type === 'hospital'
        ? '🏥'
        : item.type === 'fire_station'
        ? '🚒'
        : '⛺';

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setCancellationError('');
        setSelectedPoint({ ...item, isEmergency: isEmergencyMode });
        setIsGpsLocked(false);

        mapRef.current.flyTo({
          center: [item.lng, item.lat],
          zoom: 15.5,
          duration: 900
        });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([item.lng, item.lat])
        .addTo(mapRef.current);

      activeMarkersRef.current.push(marker);
    });
  }, [viewMode, emergencies, supportCenters, isMapLoaded]);

  // 6. Actualización de línea vectorial hacia el objetivo
  useEffect(() => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;

    const source = mapRef.current.getSource('route-line');
    if (!source) return;

    if (selectedPoint) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [userPos.lng, userPos.lat],
            [selectedPoint.lng, selectedPoint.lat]
          ]
        }
      });

      mapRef.current.setPaintProperty(
        'route-line-layer',
        'line-color',
        selectedPoint.isEmergency ? '#f43f5e' : '#38bdf8'
      );
    } else {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: []
        }
      });
    }
  }, [selectedPoint, userPos]);

  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [userPos.lng, userPos.lat],
        zoom: 15,
        duration: 800
      });
      setIsGpsLocked(true);
      setSelectedPoint(null);
    }
  };

  const handleCancelEmergency = async () => {
    if (!selectedPoint?.isEmergency || isCancellingEmergency) return;
    if (!window.confirm('¿Cancelar esta emergencia? El reporte se marcará como atendido y se quitará del mapa.')) {
      return;
    }

    setIsCancellingEmergency(true);
    setCancellationError('');

    try {
      await marcarAtendida(selectedPoint.id);
      setEmergencies((current) => current.filter((emergency) => emergency.id !== selectedPoint.id));
      setSelectedPoint(null);
    } catch (err) {
      console.error('Error al cancelar la emergencia:', err);
      setCancellationError('No se pudo cancelar la emergencia. Intenta nuevamente.');
    } finally {
      setIsCancellingEmergency(false);
    }
  };

  return (
    <div className="app-viewport select-none text-slate-100">
      <div ref={mapContainerRef} className="maplibre-container" />

      {/* BARRA SUPERIOR */}
      <header className="absolute top-0 left-0 right-0 z-20 p-3 flex flex-col gap-2.5 pointer-events-none">
        <div className="order-1 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.5 pointer-events-auto">
          <div className="glass-panel flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[9px] sm:gap-2 sm:px-3 sm:text-xs">
            {isLoading ? (
              <Loader2 className="w-3 h-3 text-sky-400 animate-spin" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            )}
            <span className="whitespace-nowrap font-semibold tracking-wide text-emerald-300">
              <span className="sm:hidden">SUPABASE</span>
              <span className="hidden sm:inline">SUPABASE REALTIME</span>
            </span>
          </div>

          {/* TOGGLE SWITCH */}
          <div className="min-w-0 glass-panel p-0.5 rounded-full shadow-2xl flex items-center">
            <button
              onClick={() => {
                setViewMode('emergencies');
                setSelectedPoint(null);
              }}
              className={`min-w-0 flex-1 py-1.5 px-1 sm:px-2 rounded-full text-[9px] sm:text-[11px] font-semibold flex items-center justify-center gap-0.5 sm:gap-1 transition-all duration-300 ${
                viewMode === 'emergencies'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span className="truncate">
                <span className="sm:hidden">Emerg.</span>
                <span className="hidden sm:inline">Emergencias</span>
              </span>
              <span className="shrink-0 rounded-full bg-black/30 px-1 text-[9px]">
                {emergencies.length}
              </span>
            </button>

            <button
              onClick={() => {
                setViewMode('support');
                setSelectedPoint(null);
              }}
              className={`min-w-0 flex-1 py-1.5 px-1 sm:px-2 rounded-full text-[9px] sm:text-[11px] font-semibold flex items-center justify-center gap-0.5 sm:gap-1 transition-all duration-300 ${
                viewMode === 'support'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="h-3 w-3 shrink-0" />
              <span className="truncate">
                <span className="sm:hidden">Apoyo</span>
                <span className="hidden sm:inline">Centros Apoyo</span>
              </span>
              <span className="shrink-0 rounded-full bg-black/30 px-1 text-[9px]">
                {supportCenters.length}
              </span>
            </button>
          </div>

          <div className="glass-panel whitespace-nowrap rounded-full px-2 py-1.5 text-[10px] text-slate-300 sm:px-3 sm:text-xs">
            <span className="sm:hidden">±{userPos.accuracy}m</span>
            <span className="hidden sm:inline">Margen GPS: ±{userPos.accuracy}m</span>
          </div>
        </div>

        <section className="order-2 self-start pointer-events-auto w-[min(15rem,calc(100vw-1.5rem))]">
          <button
            type="button"
            onClick={() => setIsListOpen((open) => !open)}
            aria-expanded={isListOpen}
            aria-controls="map-points-list"
            className="glass-panel w-full rounded-xl px-3 py-2 flex items-center justify-between text-left shadow-xl"
          >
            <span className="min-w-0">
              <span className="block text-[11px] font-bold text-white">
                {viewMode === 'emergencies' ? 'Emergencias activas' : 'Centros de apoyo'}
              </span>
              <span className="block text-[10px] text-slate-400">
                {viewMode === 'emergencies' ? emergencies.length : supportCenters.length} ubicaciones
              </span>
            </span>
            <ChevronDown
              className={`ml-2 h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform ${
                isListOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isListOpen && (
            <div
              id="map-points-list"
              className="glass-panel-elevated mt-1.5 max-h-[34dvh] overflow-y-auto rounded-xl p-1.5 shadow-2xl"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 p-3 text-[11px] text-slate-300">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />
                  Cargando ubicaciones...
                </div>
              ) : (viewMode === 'emergencies' ? emergencies : supportCenters).length === 0 ? (
                <p className="p-3 text-center text-[11px] text-slate-400">
                  {viewMode === 'emergencies'
                    ? 'No hay emergencias activas.'
                    : 'No hay centros de apoyo disponibles.'}
                </p>
              ) : (
                (viewMode === 'emergencies' ? emergencies : supportCenters).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      const isEmergency = viewMode === 'emergencies';
                      setCancellationError('');
                      setSelectedPoint({ ...item, isEmergency });
                      setIsGpsLocked(false);
                      setIsListOpen(false);
                      mapRef.current?.flyTo({
                        center: [item.lng, item.lat],
                        zoom: 15.5,
                        duration: 900
                      });
                    }}
                    className="mb-1 w-full rounded-lg border border-white/5 px-2.5 py-2 text-left transition-colors last:mb-0 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-semibold text-slate-100">
                          {item.title}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] text-slate-400">
                          {item.address}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] text-slate-300">
                          {item.detail}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                          viewMode === 'emergencies'
                            ? 'bg-rose-500/15 text-rose-300'
                            : 'bg-sky-500/15 text-sky-300'
                        }`}
                      >
                        {item.status}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </section>
      </header>

      {/* BOTÓN FLOTANTE PARA REPORTAR EMERGENCIA */}
      <button
        onClick={() => setIsReportModalOpen(true)}
        className="absolute left-4 bottom-32 z-10 px-4 py-3 rounded-full shadow-2xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-black text-xs flex items-center gap-2 border border-red-400 active:scale-95 tracking-wider uppercase shadow-red-950/60"
      >
        <Plus className="w-4 h-4" />
        <span>Reportar</span>
      </button>

      {/* BOTÓN RECENTRAR GPS */}
      <button
        onClick={handleRecenter}
        className={`absolute right-4 bottom-32 z-10 p-3.5 rounded-full shadow-2xl glass-panel transition-transform active:scale-90 ${
          isGpsLocked ? 'text-sky-400 border-sky-400/40' : 'text-slate-300'
        }`}
        aria-label="Recentrar en mi ubicación"
      >
        <Crosshair className="w-5 h-5" />
      </button>

      {/* ENLACE DISCRETO PARA RESCATISTAS */}
      <Link
        href="/dashboard"
        className="absolute left-1/2 -translate-x-1/2 bottom-[6.5rem] z-10 flex items-center gap-2 text-sm font-bold text-white bg-sky-600/90 hover:bg-sky-500 backdrop-blur-sm px-5 py-2.5 rounded-full border border-sky-300/40 shadow-xl shadow-sky-950/50 active:scale-95 transition-all"
      >
        <ShieldAlert className="w-4 h-4" />
        Soy rescatista →
      </Link>

      {/* BOTTOM SHEET */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 pointer-events-auto p-3">
        {selectedPoint ? (
          <div className="glass-panel-elevated p-4 rounded-3xl slide-up-card">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span
                  className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full ${
                    selectedPoint.isEmergency
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  }`}
                >
                  {selectedPoint.isEmergency
                    ? `Severidad: ${selectedPoint.severity}`
                    : selectedPoint.status}
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  {selectedPoint.title}
                </h3>
                <p className="text-xs text-slate-400">{selectedPoint.address}</p>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setCancellationError('');
                    setSelectedPoint(null);
                  }}
                  className="ml-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  aria-label="Cerrar información del punto"
                >
                  <X className="h-4 w-4" />
                </button>
                <span className="text-[11px] text-slate-400 block">Distancia</span>
                <span className="text-sm font-black text-white">
                  {getDistanceMeters(
                    userPos.lat,
                    userPos.lng,
                    selectedPoint.lat,
                    selectedPoint.lng
                  )}{' '}
                  m
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-3 bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
              {selectedPoint.detail}
            </p>

            {selectedPoint.isEmergency && (
              <>
                {cancellationError && (
                  <p role="alert" className="mb-2 text-xs text-rose-300">
                    {cancellationError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleCancelEmergency}
                  disabled={isCancellingEmergency}
                  className="mb-2 w-full rounded-xl border border-rose-500/40 bg-rose-950/60 px-3 py-2.5 text-xs font-semibold text-rose-200 transition-colors hover:bg-rose-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-wait disabled:opacity-60"
                >
                  {isCancellingEmergency ? 'Cancelando emergencia...' : 'Cancelar emergencia'}
                </button>
              </>
            )}

            <div className="grid grid-cols-2 gap-2">
              {selectedPoint.phone ? (
                <a
                  href={`tel:${selectedPoint.phone}`}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg active:scale-95"
                >
                  <PhoneCall className="w-3.5 h-3.5" /> Llamar Base
                </a>
              ) : (
                <button
                  onClick={() => alert('Alerta enviada a unidades de rescate.')}
                  className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg active:scale-95"
                >
                  <Radio className="w-3.5 h-3.5" /> Pedir Auxilio
                </button>
              )}

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPoint.lat},${selectedPoint.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 active:scale-95"
              >
                <Navigation className="w-3.5 h-3.5" /> Abrir Ruta
              </a>
            </div>
          </div>
        ) : (
          <div className="glass-panel p-3.5 rounded-2xl flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-sky-400 animate-spin-slow" />
              {isLoading ? 'Sincronizando con base de datos...' : 'Toca un marcador para ver reporte'}
            </span>
            <span className="font-semibold text-slate-300">
              {viewMode === 'emergencies' ? 'Emergencias activas' : 'Bases operativas'}
            </span>
          </div>
        )}
      </footer>
      <EmergencyReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        userPos={userPos}
        onReportSuccess={fetchData}
      />
    </div>
  );
}
