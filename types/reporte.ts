export type TipoEmergencia = "MEDICA" | "AGUA" | "RESCATE" | "OTRO";

export type EstadoReporte = "PENDIENTE" | "EN_PROCESO" | "ATENDIDA";

export interface Reporte {
  id: string;
  tipo_emergencia: TipoEmergencia;
  latitud: number;
  longitud: number;
  descripcion?: string | null;
  personas_afectadas: number;
  estado: EstadoReporte;
  created_at: string;
}