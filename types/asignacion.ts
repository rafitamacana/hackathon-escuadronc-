// tipo para las asignaciones de casos a rescatistas
export interface Asignacion {
  id: string;
  reporte_id: string;
  rescatista_id: string;
  rescatista_nombre: string;
  estado: "en_camino" | "resuelto" | "liberado";
  created_at: string;
  updated_at: string;
}
