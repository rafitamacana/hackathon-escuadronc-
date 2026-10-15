'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Circle, Polyline } from '@react-google-maps/api';

import {
  AlertTriangle,
  ShieldAlert,
  PhoneCall,
  Navigation,
  Compass,
  Crosshair,
  Radio
} from 'lucide-react';

const GOOGLE_MAPS_API_KEY = 'AIzaSyBHzd96f20j6svPHaeIxzNbgkoqagDQE2w';

// Coordenadas iniciales por defecto si no hay GPS activo
const INITIAL_COORDS = { lat: 25.7904, lng: -108.9959, accuracy: 20 };

type Coordinates = {
  lat: number;
  lng: number;
  accuracy: number;
};

type MapPoint = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  address: string;
  detail: string;
};

type Emergency = MapPoint & {
  type: 'fire' | 'medical' | 'gas';
  severity: string;
  time: string;
};

type SupportCenter = MapPoint & {
  type: 'hospital' | 'fire_station' | 'shelter';
  phone: string;
  capacity: string;
  status: string;
};

type SelectedPoint =
  | (Emergency & { isEmergency: true })
  | (SupportCenter & { isEmergency: false });

// Estilos oscuros tácticos para Google Maps
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#171c26' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#171c26' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8d9bb0' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d1d5db' }]
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#1a2721' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#273142' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2937' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#334155' }]
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#090d16' }]
  }
];

// Cálculo trigonométrico de distancia (Haversine) en metros
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
  const [viewMode, setViewMode] = useState<'emergencies' | 'support'>('emergencies');
  const [userPos, setUserPos] = useState<Coordinates>(INITIAL_COORDS);
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);
  const [isGpsLocked, setIsGpsLocked] = useState(true);

  const mapRef = useRef<google.maps.Map | null>(null);

  // Carga de la API de Google Maps
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  // Datos de emergencias simuladas (relativas a la posición del usuario)
  const emergencies: Emergency[] = [
    {
      id: 'e1',
      title: 'Incendio Estructural',
      type: 'fire',
      severity: 'Crítica',
      lat: userPos.lat + 0.0025,
      lng: userPos.lng + 0.003,
      address: 'Calle Juárez #320',
      time: 'Hace 6 min',
      detail: 'Fuego activo en segundo piso. Unidades de bomberos en camino.'
    },
    {
      id: 'e2',
      title: 'Colisión Vehicular Múltiple',
      type: 'medical',
      severity: 'Alta',
      lat: userPos.lat - 0.0032,
      lng: userPos.lng + 0.0021,
      address: 'Blvd. Central y Av. Morelos',
      time: 'Hace 12 min',
      detail: 'Choque entre dos autos con personas lesionadas. Tráfico obstruido.'
    },
    {
      id: 'e3',
      title: 'Fuga de Gas LP',
      type: 'gas',
      severity: 'Moderada',
      lat: userPos.lat + 0.0041,
      lng: userPos.lng - 0.0035,
      address: 'Colonia Del Bosque, Calle 4',
      time: 'Hace 19 min',
      detail: 'Fuga en tanque estacionario de 300L. Perímetro evacuado.'
    }
  ];

  // Datos de centros de apoyo simulados
  const supportCenters: SupportCenter[] = [
    {
      id: 's1',
      title: 'Hospital General de Trauma',
      type: 'hospital',
      phone: '911-01',
      lat: userPos.lat + 0.0048,
      lng: userPos.lng + 0.0042,
      address: 'Av. Las Palmas #500',
      capacity: '76% Ocupación',
      status: '12 Camas Disponibles',
      detail: 'Urgencias 24h, quirófano activo y banco de sangre.'
    },
    {
      id: 's2',
      title: 'Estación Central de Bomberos #1',
      type: 'fire_station',
      phone: '911-02',
      lat: userPos.lat - 0.0042,
      lng: userPos.lng - 0.0045,
      address: 'Calzada Insurgentes #12',
      capacity: 'Operativo',
      status: '3 Motobombas Activas',
      detail: 'Equipo HazMat para químicos y brigada de rescate pesado.'
    },
    {
      id: 's3',
      title: 'Albergue Temporal Deportivo',
      type: 'shelter',
      phone: '911-03',
      lat: userPos.lat + 0.0055,
      lng: userPos.lng - 0.0028,
      address: 'Polideportivo Norte',
      capacity: '35% Ocupación',
      status: '80 Espacios Libres',
      detail: 'Catres, comedor comunitario, agua potable y paramédicos.'
    }
  ];

  // Detección continua de GPS del dispositivo móvil
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
        },
        (err) => console.warn('GPS no disponible, usando posición base:', err.message),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    }
    return () => {
      if (watcher !== null) navigator.geolocation.clearWatch(watcher);
    };
  }, []);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Recentrar cámara en la posición del móvil
  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.panTo({ lat: userPos.lat, lng: userPos.lng });
      mapRef.current.setZoom(15);
      setIsGpsLocked(true);
      setSelectedPoint(null);
    }
  };

  // Creación de íconos en formato SVG para los pines de Google Maps
  const createPinIcon = (color: string, textEmoji: string): google.maps.Icon => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="17" fill="${color}" stroke="#ffffff" stroke-width="2.5" />
        <text x="20" y="25" font-size="16" text-anchor="middle" dominant-baseline="middle">${textEmoji}</text>
      </svg>
    `;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(40, 40),
      anchor: new window.google.maps.Point(20, 20)
    };
  };

  const userMarkerIcon: google.maps.Symbol | undefined = isLoaded
    ? {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillColor: '#38bdf8',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2.5
      }
    : undefined;

  if (loadError) {
    return (
      <div className="app-viewport flex items-center justify-center p-6 text-center text-rose-400">
        <div>
          <AlertTriangle className="w-10 h-10 mx-auto mb-3" />
          <p className="font-semibold text-lg">Error cargando Google Maps</p>
          <p className="text-xs text-slate-400 mt-1">Verifica las restricciones de tu API Key.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="app-viewport flex items-center justify-center text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <Compass className="w-8 h-8 text-sky-400 animate-spin" />
          <span className="text-sm font-medium">Iniciando radar satelital...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app-viewport select-none text-slate-100">
      {/* ====================================================================
          BARRA SUPERIOR: ESTADO GPS Y TOGGLE SWITCH TÁCTICO
          ==================================================================== */}
      <header className="absolute top-0 left-0 right-0 z-20 p-3 flex flex-col gap-2.5 pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="glass-panel px-3 py-1.5 rounded-full flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-emerald-300 font-semibold">GPS ACTIVO</span>
          </div>

          <div className="glass-panel px-3 py-1.5 rounded-full text-xs text-slate-300">
            Margen: ±{userPos.accuracy}m
          </div>
        </div>

        {/* TOGGLE SWITCH: Emergencias vs Centros de Apoyo */}
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

      {/* ====================================================================
          MAPA DE GOOGLE
          ==================================================================== */}
      <main className="map-canvas-container flex-1">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={{ lat: userPos.lat, lng: userPos.lng }}
          zoom={15}
          onLoad={onLoad}
          options={{
            styles: DARK_MAP_STYLE,
            disableDefaultUI: true,
            zoomControl: false,
            gestureHandling: 'greedy'
          }}
        >
          {/* Marcador del Dispositivo */}
          <Marker position={{ lat: userPos.lat, lng: userPos.lng }} icon={userMarkerIcon} />

          {/* Radio de Incertidumbre del GPS */}
          <Circle
            center={{ lat: userPos.lat, lng: userPos.lng }}
            radius={userPos.accuracy}
            options={{
              fillColor: '#38bdf8',
              fillOpacity: 0.12,
              strokeColor: '#38bdf8',
              strokeOpacity: 0.6,
              strokeWeight: 1
            }}
          />

          {/* Modo Emergencias */}
          {viewMode === 'emergencies' &&
            emergencies.map((item) => (
              <Marker
                key={item.id}
                position={{ lat: item.lat, lng: item.lng }}
                icon={createPinIcon(
                  item.type === 'fire' ? '#e11d48' : item.type === 'medical' ? '#dc2626' : '#d97706',
                  item.type === 'fire' ? '🔥' : item.type === 'medical' ? '🚑' : '⚠️'
                )}
                onClick={() => {
                  setSelectedPoint({ ...item, isEmergency: true });
                  setIsGpsLocked(false);
                }}
              />
            ))}

          {/* Modo Centros de Apoyo */}
          {viewMode === 'support' &&
            supportCenters.map((item) => (
              <Marker
                key={item.id}
                position={{ lat: item.lat, lng: item.lng }}
                icon={createPinIcon(
                  item.type === 'hospital' ? '#059669' : item.type === 'fire_station' ? '#ea580c' : '#0284c7',
                  item.type === 'hospital' ? '🏥' : item.type === 'fire_station' ? '🚒' : '⛺'
                )}
                onClick={() => {
                  setSelectedPoint({ ...item, isEmergency: false });
                  setIsGpsLocked(false);
                }}
              />
            ))}

          {/* Trazo Directo hacia el punto seleccionado */}
          {selectedPoint && (
            <Polyline
              path={[
                { lat: userPos.lat, lng: userPos.lng },
                { lat: selectedPoint.lat, lng: selectedPoint.lng }
              ]}
              options={{
                strokeColor: selectedPoint.isEmergency ? '#f43f5e' : '#38bdf8',
                strokeOpacity: 0.9,
                strokeWeight: 2.5
              }}
            />
          )}
        </GoogleMap>

        {/* Botón Flotante para recentrar ubicación */}
        <button
          onClick={handleRecenter}
          className={`absolute right-4 bottom-32 z-10 p-3.5 rounded-full shadow-2xl glass-panel transition-transform active:scale-90 ${
            isGpsLocked ? 'text-sky-400 border-sky-400/40' : 'text-slate-300'
          }`}
          aria-label="Recentrar en mi ubicación"
        >
          <Crosshair className="w-5 h-5" />
        </button>
      </main>

      {/* ====================================================================
          BOTTOM SHEET (TARJETA DESLIZABLE)
          ==================================================================== */}
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
                  {selectedPoint.isEmergency ? `Severidad: ${selectedPoint.severity}` : selectedPoint.status}
                </span>
                <h3 className="text-base font-bold text-white mt-1">{selectedPoint.title}</h3>
                <p className="text-xs text-slate-400">{selectedPoint.address}</p>
              </div>

              {/* Distancia calculada */}
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Distancia</span>
                <span className="text-sm font-black text-white">
                  {getDistanceMeters(userPos.lat, userPos.lng, selectedPoint.lat, selectedPoint.lng)} m
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-3 bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
              {selectedPoint.detail}
            </p>

            {/* Acciones principales */}
            <div className="grid grid-cols-2 gap-2">
              {!selectedPoint.isEmergency ? (
                <a
                  href={`tel:${selectedPoint.phone}`}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg active:scale-95"
                >
                  <PhoneCall className="w-3.5 h-3.5" /> Llamar Base
                </a>
              ) : (
                <button
                  onClick={() => alert('Reporte de auxilio canalizado al C4/C5.')}
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
                <Navigation className="w-3.5 h-3.5" /> Navegar (GPS)
              </a>
            </div>
          </div>
        ) : (
          <div className="glass-panel p-3.5 rounded-2xl flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-sky-400 animate-spin-slow" />
              Toca un punto en el mapa para ver distancia y auxilio
            </span>
            <span className="font-semibold text-slate-300">
              {viewMode === 'emergencies' ? 'Modo: Incidentes' : 'Modo: Refugios'}
            </span>
          </div>
        )}
      </footer>
    </div>
  );
}