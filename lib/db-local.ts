import Dexie, { type Table } from "dexie";
import type { Reporte } from "@/types/reporte";

// base de datos local del celular (IndexedDB) para reportes sin enviar
class DbLocal extends Dexie {
  pendientes!: Table<Reporte, string>;

  constructor() {
    super("rescuenet");
    this.version(1).stores({ pendientes: "id" });
  }
}

export const db = new DbLocal();

export const guardarLocal = (r: Reporte) => db.pendientes.put(r);
export const obtenerPendientes = () => db.pendientes.toArray();
export const borrarLocal = (id: string) => db.pendientes.delete(id);