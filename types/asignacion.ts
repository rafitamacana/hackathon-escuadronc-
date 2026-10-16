export type EstadoAsignacion = 'en_camino' | 'resuelto' | 'liberado';

export interface Asignacion {
  id: string;
  reporte_id: string;
  rescatista_id: string;
  rescatista_nombre: string;
  estado: EstadoAsignacion;
  created_at: string;
  updated_at: string;
}

export type NuevaAsignacion = {
  reporte_id: string;
  rescatista_id: string;
  rescatista_nombre: string;
  estado?: EstadoAsignacion;
};