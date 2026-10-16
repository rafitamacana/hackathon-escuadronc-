export type TipoCentro =
  | 'HOSPITAL'
  | 'CRUZ_ROJA'
  | 'BOMBEROS'
  | 'PROTECCION_CIVIL'
  | 'ALBERGUE'
  | 'FARMACIA';

export type EstadoCentro = 'DISPONIBLE' | 'SATURADO' | 'CERRADO';

export interface CentroApoyoLocal {
  id: string;
  nombre: string;
  tipo: TipoCentro;
  direccion: string;
  latitud: number;
  longitud: number;
  capacidad_total: number;
  ocupacion_actual: number;
  estado: EstadoCentro;
  servicios: string[];
  contacto: string;
}


export const AVISO_OFFLINE_CENTROS =
  'Mostrando datos guardados en el dispositivo (modo offline). La ocupación de albergues y el estado de los centros pueden no estar actualizados en tiempo real.';


export const CENTROS_GUASAVE_LOCALES: CentroApoyoLocal[] = [
  {
    id: 'local-1',
    nombre: 'Cruz Roja Mexicana - Delegación Guasave',
    tipo: 'CRUZ_ROJA',
    direccion: 'Calle Francisco González Bocanegra s/n, Col. Ángel Flores',
    latitud: 25.5683,
    longitud: -108.4675,
    capacidad_total: 30,
    ocupacion_actual: 8,
    estado: 'DISPONIBLE',
    servicios: ['URGENCIAS', 'AMBULANCIA', 'PRIMEROS_AUXILIOS', 'CURACIONES'],
    contacto: '687-872-0423',
  },
  {
    id: 'local-2',
    nombre: 'Hospital General de Guasave',
    tipo: 'HOSPITAL',
    direccion: 'Carretera a Las Glorias km 1.5, Col. Constelación',
    latitud: 25.5531,
    longitud: -108.4747,
    capacidad_total: 75,
    ocupacion_actual: 62,
    estado: 'SATURADO',
    servicios: ['URGENCIAS', 'QUIRÓFANO', 'HOSPITALIZACIÓN', 'BANCO_SANGRE'],
    contacto: '687-871-4197',
  },
  {
    id: 'local-3',
    nombre: 'IMSS Hospital General de Subzona No. 32',
    tipo: 'HOSPITAL',
    direccion: 'Blvd. 16 de Septiembre y Juan Carrasco, Col. Centro',
    latitud: 25.5651,
    longitud: -108.4645,
    capacidad_total: 60,
    ocupacion_actual: 48,
    estado: 'DISPONIBLE',
    servicios: ['URGENCIAS', 'HOSPITALIZACIÓN', 'FARMACIA_INTERNA'],
    contacto: '687-872-0210',
  },
  {
    id: 'local-4',
    nombre: 'ISSSTE Clínica Hospital Guasave',
    tipo: 'HOSPITAL',
    direccion: 'Av. Adolfo López Mateos s/n, Col. del Bosque',
    latitud: 25.5602,
    longitud: -108.4789,
    capacidad_total: 25,
    ocupacion_actual: 12,
    estado: 'DISPONIBLE',
    servicios: ['ATENCIÓN_MÉDICA', 'URGENCIAS', 'ESTABILIZACIÓN'],
    contacto: '687-872-0940',
  },
  {
    id: 'local-5',
    nombre: 'Estación de Bomberos Guasave',
    tipo: 'BOMBEROS',
    direccion: 'Blvd. Central y Macario Gaxiola, Col. del Bosque',
    latitud: 25.5595,
    longitud: -108.4795,
    capacidad_total: 0,
    ocupacion_actual: 0,
    estado: 'DISPONIBLE',
    servicios: ['RESCATE_ACUÁTICO', 'COMBATE_INCENDIOS', 'EXTRICACIÓN_VEHICULAR'],
    contacto: '687-872-1377',
  },
  {
    id: 'local-6',
    nombre: 'Coordinación Municipal de Protección Civil',
    tipo: 'PROTECCION_CIVIL',
    direccion: 'Palacio Municipal, Av. Adolfo López Mateos s/n, Col. Centro',
    latitud: 25.567,
    longitud: -108.471,
    capacidad_total: 0,
    ocupacion_actual: 0,
    estado: 'DISPONIBLE',
    servicios: ['COORDINACIÓN_OPERATIVA', 'EVALUACIÓN_DAÑOS', 'EVACUACIÓN'],
    contacto: '687-872-8888',
  },
  {
    id: 'local-7',
    nombre: 'Albergue Gimnasio Luis Estrada Medina',
    tipo: 'ALBERGUE',
    direccion: 'Calle Corregidora y Teófilo Noris, Col. Centro',
    latitud: 25.56555,
    longitud: -108.47182,
    capacidad_total: 300,
    ocupacion_actual: 85,
    estado: 'DISPONIBLE',
    servicios: ['CAMAS', 'AGUA_POTABLE', 'ALIMENTOS_CALIENTES', 'PLANTA_LUZ'],
    contacto: '687-872-0888',
  },
  {
    id: 'local-8',
    nombre: 'Albergue Temporal Esc. Sec. Técnica No. 28',
    tipo: 'ALBERGUE',
    direccion: 'Blvd. 20 de Noviembre s/n, Col. Ejidal',
    latitud: 25.575,
    longitud: -108.465,
    capacidad_total: 200,
    ocupacion_actual: 30,
    estado: 'DISPONIBLE',
    servicios: ['TECHUMBRE', 'SANITARIOS', 'VÍVERES', 'ZONA_DESCANSO'],
    contacto: '687-872-1540',
  },
  {
    id: 'local-9',
    nombre: 'Farmacias Guadalajara - Blvd. Central (24 Horas)',
    tipo: 'FARMACIA',
    direccion: 'Blvd. Central No. 109 esq. Río Baluarte, Col. Centro',
    latitud: 25.5608,
    longitud: -108.4712,
    capacidad_total: 0,
    ocupacion_actual: 0,
    estado: 'DISPONIBLE',
    servicios: ['SERVICIO_24_HORAS', 'MATERIAL_CURACIÓN', 'SUERO_ORAL', 'MEDICAMENTOS'],
    contacto: '687-871-0418',
  },
  {
    id: 'local-10',
    nombre: 'Farmacias Guadalajara - 20 de Noviembre (24 Horas)',
    tipo: 'FARMACIA',
    direccion: 'Blvd. 20 de Noviembre No. 627 Pte., Col. Ejidal',
    latitud: 25.5762,
    longitud: -108.4635,
    capacidad_total: 0,
    ocupacion_actual: 0,
    estado: 'DISPONIBLE',
    servicios: ['SERVICIO_24_HORAS', 'MATERIAL_CURACIÓN', 'ANALGÉSICOS', 'ALIMENTOS'],
    contacto: '687-871-7436',
  },
];


export function obtenerEnlaceGoogleMaps(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}


export function formatearTelefonoHref(tel: string): string {
  return `tel:${tel.replace(/\D/g, '')}`;
}