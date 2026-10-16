'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Clock, Users, CheckCircle, Phone } from 'lucide-react';
import type { Reporte } from '@/types/reporte';

export type { Reporte };

export interface CentroApoyo {
  id?: string;
  nombre: string;
  tipo: string;
  direccion: string;
  latitud: number;
  longitud: number;
  capacidad_total?: number | null;
  ocupacion_actual?: number | null;
  estado?: string;
  servicios?: string[] | null;
  contacto?: string | null;
  created_at?: string;
}

export interface MapaProps {
  reportes: Reporte[];
  centros?: CentroApoyo[];
  onMarcarAtendida: (id: string) => void;
  centro?: [number, number];
  alertaSeleccionada?: Reporte | CentroApoyo | null;
  elementoSeleccionado?: Reporte | CentroApoyo | null;
}

// Mueve la cámara suavemente a la alerta que toques
function ControladorCamara({ coord }: { coord?: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coord) {
      map.flyTo(coord, 16, { duration: 1.2 });
    }
  }, [coord, map]);
  return null;
}

// Pines de Emergencia con radar animado
const crearIconoEmergencia = (tipo: string, estado: string) => {
  let colorHex = '#64748b';
  let ringColor = 'rgba(100, 116, 139, 0.5)';
  let icono = '⚠️';

  if (tipo === 'MEDICA') {
    colorHex = '#f43f5e';
    ringColor = 'rgba(244, 63, 94, 0.5)';
    icono = '🚑';
  } else if (tipo === 'AGUA') {
    colorHex = '#0ea5e9';
    ringColor = 'rgba(14, 165, 233, 0.5)';
    icono = '💧';
  } else if (tipo === 'RESCATE') {
    colorHex = '#f59e0b';
    ringColor = 'rgba(245, 158, 11, 0.5)';
    icono = '🛟';
  }

  const esCritico = estado === 'PENDIENTE';
  const esEnProceso = estado === 'EN_PROCESO';

  return L.divIcon({
    className: 'custom-emergency-pin',
    html: `
      <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
        ${
          esCritico
            ? `<div style="
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 9999px;
                background: ${ringColor};
                animation: radar-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
              "></div>`
            : ''
        }
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 9999px;
          background: ${colorHex};
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2.5px solid #ffffff;
          box-shadow: 0 0 16px ${colorHex}99, 0 4px 10px rgba(0,0,0,0.6);
          font-size: 16px;
          z-index: 2;
        ">
          ${icono}
        </div>
        ${
          esEnProceso
            ? `<span style="
                position: absolute;
                top: 0;
                right: 0;
                width: 12px;
                height: 12px;
                background: #3b82f6;
                border: 2px solid white;
                border-radius: 9999px;
                z-index: 3;
              "></span>`
            : ''
        }
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -20],
  });
};

// Pines de Centros de Apoyo (Hospitales, Albergues, Farmacias)
const crearIconoCentro = (tipo: string) => {
  let color = '#10b981';
  let icono = '🏥';

  if (tipo === 'ALBERGUE') {
    color = '#8b5cf6';
    icono = '⛺';
  } else if (tipo === 'FARMACIA') {
    color = '#06b6d4';
    icono = '💊';
  } else if (tipo === 'ACOPIO' || tipo === 'DISTRIBUCION_VIVERES') {
    color = '#f97316';
    icono = '📦';
  } else if (tipo === 'PROTECCION_CIVIL') {
    color = '#3b82f6';
    icono = '🛡️';
  }

  return L.divIcon({
    className: 'custom-center-pin',
    html: `
      <div style="
        width: 34px;
        height: 34px;
        border-radius: 12px;
        background: ${color};
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #ffffff;
        box-shadow: 0 0 12px ${color}99, 0 4px 8px rgba(0,0,0,0.6);
        font-size: 15px;
      ">
        ${icono}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
};

export default function Mapa({
  reportes,
  centros = [],
  onMarcarAtendida,
  centro = [25.568, -108.470], // Guasave Centro
  alertaSeleccionada = null,
  elementoSeleccionado = null,
}: MapaProps) {
  const objetivo = elementoSeleccionado || alertaSeleccionada;

  return (
    <div className="w-full h-full relative z-0">
      <style>{`
        /* Convierte el mapa estándar en modo oscuro táctico sin tocar pines ni popups */
        .leaflet-tile-pane {
          filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
        }

        @keyframes radar-ping {
          0% { transform: scale(0.6); opacity: 0.9; }
          70% { transform: scale(2.2); opacity: 0.1; }
          100% { transform: scale(2.6); opacity: 0; }
        }

        .leaflet-popup-content-wrapper {
          background: rgba(15, 23, 42, 0.96) !important;
          backdrop-filter: blur(14px) !important;
          border: 1px solid rgba(255, 255, 255, 0.14) !important;
          border-radius: 20px !important;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.7) !important;
          color: #f1f5f9 !important;
          padding: 6px !important;
        }
        .leaflet-popup-tip {
          background: rgba(15, 23, 42, 0.96) !important;
        }
      `}</style>

      <MapContainer
        center={centro}
        zoom={14}
        scrollWheelZoom={true}
        className="w-full h-full bg-slate-950"
      >
        {/* OpenStreetMap Oficial: 100% gratis, sin API Key y nunca falla */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {objetivo && (
          <ControladorCamara coord={[objetivo.latitud, objetivo.longitud]} />
        )}

        {/* 1. PINES DE EMERGENCIAS */}
        {reportes.map((rep) => {
          const personas = rep.personas_afectadas ?? 1;
          return (
            <Marker
              key={rep.id}
              position={[rep.latitud, rep.longitud]}
              icon={crearIconoEmergencia(rep.tipo_emergencia, rep.estado)}
            >
              <Popup>
                <div className="p-2 min-w-[240px]">
                  <div className="flex items-center justify-between border-b border-slate-700/60 pb-2 mb-2">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        rep.tipo_emergencia === 'MEDICA'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : rep.tipo_emergencia === 'AGUA'
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                          : rep.tipo_emergencia === 'RESCATE'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-700 text-slate-300 border border-slate-600'
                      }`}
                    >
                      {rep.tipo_emergencia}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {rep.estado}
                    </span>
                  </div>

                  <div className="mb-2 bg-rose-500/20 border border-rose-500/40 p-2 rounded-xl flex items-center justify-between">
                    <span className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-rose-400" />
                      {personas === 0 ? 'Sin lesionados' : `${personas} Afectados`}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(rep.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 font-medium mb-3 leading-relaxed">
                    {rep.descripcion || 'Sin descripción detallada.'}
                  </p>

                  {rep.estado !== 'ATENDIDA' && (
                    <button
                      onClick={() => onMarcarAtendida(rep.id)}
                      className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-950 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Marcar como Atendida
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 2. PINES DE CENTROS DE APOYO */}
        {centros.map((cen, idx) => (
          <Marker
            key={cen.id || `centro-${idx}`}
            position={[cen.latitud, cen.longitud]}
            icon={crearIconoCentro(cen.tipo)}
          >
            <Popup>
              <div className="p-2 min-w-[240px]">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
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

                <h3 className="text-xs font-bold text-white mb-1">{cen.nombre}</h3>
                <p className="text-[11px] text-slate-400 mb-2">{cen.direccion}</p>

                {cen.capacidad_total ? (
                  <div className="bg-slate-900/80 p-2 rounded-xl border border-white/5 mb-2.5">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Ocupación</span>
                      <span className="font-bold text-slate-200">
                        {cen.ocupacion_actual || 0} / {cen.capacidad_total}
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

                {cen.contacto && (
                  <a
                    href={`tel:${cen.contacto}`}
                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                  >
                    <Phone className="w-3 h-3 text-emerald-400" /> Llamar: {cen.contacto}
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}