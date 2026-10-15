export type TipoEemergencia = "MEDICA" | "AGUA" | "RESCATE";

export type EstadoReporte = "PENDIENTE" | "ANTENDIDA";

export interface Reporte {
    id: string;
    tipo_emergencia: TipoEemergencia;
    latitud: number;
    longitud: number;
    descripcion: string;
    personas_afectadas: number;
    estado: EstadoReporte;
    timestamp: string;
}