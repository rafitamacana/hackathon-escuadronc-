'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Clock, Users, CheckCircle } from 'lucide-react';
import type { Reporte } from '@/types/reporte';

// Exportamos Reporte para que app/dashboard/page.tsx no entre en conflicto
export type { Reporte };

export interface MapaProps {
  reportes: Reporte[];
  onMarcarAtendida: (id: string) => void;
  centro?: [number, number];
  alertaSeleccionada?: Reporte | null;
}

// Controlador para mover la cámara suavemente al hacer clic en una alerta
function ControladorCamara({ coord }: { coord?: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coord) {
      map.flyTo(coord, 16, { duration: 1.2 });
    }
  }, [coord, map]);
  return null;
}

// Generación de pines tácticos con pulso animado
const crearIconoTactico = (tipo: string, estado: string) => {
  let colorHex = '#64748b'; // OTRO (Gris)
  let ringColor = 'rgba(100, 116, 139, 0.45)';
  let icono = '⚠️';

  if (tipo === 'MEDICA') {
    colorHex = '#f43f5e'; // Rojo / Rosa Neón
    ringColor = 'rgba(244, 63, 94, 0.45)';
    icono = '🚑';
  } else if (tipo === 'AGUA') {
    colorHex = '#0ea5e9'; // Azul Neón
    ringColor = 'rgba(14, 165, 233, 0.45)';
    icono = '💧';
  } else if (tipo === 'RESCATE') {
    colorHex = '#f59e0b'; // Ámbar / Naranja
    ringColor = 'rgba(245, 158, 11, 0.45)';
    icono = '🛟';
  }

  const esCritico = estado === 'PENDIENTE';
  const esEnProceso = estado === 'EN_PROCESO';

  return L.divIcon({
    className: 'tactical-pin-wrapper',
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
          transform: ${esCritico ? 'scale(1.05)' : 'scale(1)'};
          transition: transform 0.2s;
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

export default function Mapa({
  reportes,
  onMarcarAtendida,
  centro = [25.7904, -108.9959],
  alertaSeleccionada = null,
}: MapaProps) {
  const reportesVisibles = reportes.filter((r) => r.estado !== 'ATENDIDA');

  return (
    <div className="w-full h-full relative z-0">
      <style>{`
        @keyframes radar-ping {
          0% { transform: scale(0.6); opacity: 0.9; }
          70% { transform: scale(2.2); opacity: 0.1; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        .leaflet-popup-content-wrapper {
          background: rgba(15, 23, 42, 0.94) !important;
          backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          border-radius: 18px !important;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6) !important;
          color: #f1f5f9 !important;
          padding: 4px !important;
        }
        .leaflet-popup-tip {
          background: rgba(15, 23, 42, 0.94) !important;
        }
      `}</style>

      <MapContainer
        center={centro}
        zoom={14}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {alertaSeleccionada && (
          <ControladorCamara
            coord={[alertaSeleccionada.latitud, alertaSeleccionada.longitud]}
          />
        )}

        {reportesVisibles.map((rep) => (
          <Marker
            key={rep.id}
            position={[rep.latitud, rep.longitud]}
            icon={crearIconoTactico(rep.tipo_emergencia, rep.estado)}
          >
            <Popup>
              <div className="p-2 min-w-[220px]">
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
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      rep.estado === 'EN_PROCESO'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {rep.estado}
                  </span>
                </div>

                <p className="text-xs text-slate-200 font-medium mb-3 leading-relaxed">
                  {rep.descripcion || 'Sin descripción detallada.'}
                </p>

                <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-3 bg-slate-900/60 p-2 rounded-xl">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {rep.personas_afectadas ?? 1} afectadas
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(rep.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <button
                  onClick={() => onMarcarAtendida(rep.id)}
                  className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-950 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Marcar como Atendida
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}