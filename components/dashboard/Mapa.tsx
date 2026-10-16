'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Clock, Users, CheckCircle } from 'lucide-react';

export interface Reporte {
  id: string;
  tipo_emergencia: 'MEDICA' | 'AGUA' | 'RESCATE' | 'OTRO';
  latitud: number;
  longitud: number;
  descripcion?: string;
  personas_afectadas?: number;
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'ATENDIDA';
  created_at: string;
}

interface MapaProps {
  reportes: Reporte[];
  onMarcarAtendida: (id: string) => void;
  centro?: [number, number];
}

const crearIcono = (tipo: string, estado: string) => {
  let bg = '#64748b'; // OTRO (Gris)
  let icono = '⚠️';

  if (tipo === 'MEDICA') {
    bg = '#ef4444'; // Rojo
    icono = '🚑';
  } else if (tipo === 'AGUA') {
    bg = '#0284c7'; // Azul
    icono = '💧';
  } else if (tipo === 'RESCATE') {
    bg = '#f59e0b'; // Amarillo
    icono = '🛟';
  }

  const esEnProceso = estado === 'EN_PROCESO';

  return L.divIcon({
    className: 'custom-pin',
    html: `
      <div style="
        background-color: ${bg};
        width: 36px;
        height: 36px;
        border-radius: 9999px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: ${esEnProceso ? '3px dashed #ffffff' : '2.5px solid #ffffff'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.45);
        font-size: 16px;
        position: relative;
      ">
        ${icono}
        ${
          esEnProceso
            ? '<span style="position:absolute;top:-4px;right:-4px;width:10px;height:10px;background:#3b82f6;border-radius:9999px;border:1px solid white;"></span>'
            : ''
        }
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

export default function Mapa({
  reportes,
  onMarcarAtendida,
  centro = [25.7904, -108.9959],
}: MapaProps) {
  // Los reportes con estado ATENDIDA no se pintan en el mapa
  const reportesVisibles = reportes.filter((r) => r.estado !== 'ATENDIDA');

  return (
    <div className="w-full h-full relative z-0">
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

        {reportesVisibles.map((rep) => (
          <Marker
            key={rep.id}
            position={[rep.latitud, rep.longitud]}
            icon={crearIcono(rep.tipo_emergencia, rep.estado)}
          >
            <Popup>
              <div className="p-1 min-w-[210px] text-slate-800">
                <div className="flex items-center justify-between border-b pb-1 mb-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
                      rep.tipo_emergencia === 'MEDICA'
                        ? 'bg-red-600'
                        : rep.tipo_emergencia === 'AGUA'
                        ? 'bg-sky-600'
                        : rep.tipo_emergencia === 'RESCATE'
                        ? 'bg-amber-500'
                        : 'bg-slate-600'
                    }`}
                  >
                    {rep.tipo_emergencia}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      rep.estado === 'EN_PROCESO'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {rep.estado}
                  </span>
                </div>

                <p className="text-xs font-medium text-slate-700 mb-2">
                  {rep.descripcion || 'Sin descripción.'}
                </p>

                <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {rep.personas_afectadas ?? 1}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />{' '}
                    {new Date(rep.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <button
                  onClick={() => onMarcarAtendida(rep.id)}
                  className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Marcar Atendida
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}