'use client';


import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { supabase } from '../lib/supabase';
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
  Loader2
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
  const [viewMode, setViewMode] = useState<'emergencies' | 'support'>('emergencies');
  const [userPos, setUserPos] = useState<any>(DEFAULT_FALLBACK_COORDS);
  const [selectedPoint, setSelectedPoint] = useState<any | null>(null);
  const [isGpsLocked, setIsGpsLocked] = useState(true);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

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

  return (
    <div className="app-viewport select-none text-slate-100">
      <div ref={mapContainerRef} className="maplibre-container" />

      {/* BARRA SUPERIOR */}
      <header className="absolute top-0 left-0 right-0 z-20 p-3 flex flex-col gap-2.5 pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="glass-panel px-3 py-1.5 rounded-full flex items-center gap-2 text-xs">
            {isLoading ? (
              <Loader2 className="w-3 h-3 text-sky-400 animate-spin" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            )}
            <span className="text-emerald-300 font-semibold tracking-wide">
              SUPABASE REALTIME
            </span>
          </div>

          <div className="glass-panel px-3 py-1.5 rounded-full text-xs text-slate-300">
            Margen GPS: ±{userPos.accuracy}m
          </div>
        </div>

        {/* TOGGLE SWITCH */}
        <div className="self-center pointer-events-auto glass-panel p-1 rounded-full shadow-2xl flex items-center max-w-xs w-full">
          <button
            onClick={() => {
              setViewMode('emergencies');
              setSelectedPoint(null);
            }}
            className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-300 ${
              viewMode === 'emergencies'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Emergencias</span>
            <span className="ml-1 text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full">
              {emergencies.length}
            </span>
          </button>

          <button
            onClick={() => {
              setViewMode('support');
              setSelectedPoint(null);
            }}
            className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-300 ${
              viewMode === 'support'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Centros Apoyo</span>
            <span className="ml-1 text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full">
              {supportCenters.length}
            </span>
          </button>
        </div>
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