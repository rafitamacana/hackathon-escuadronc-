"use client";

// identidad del rescatista guardada en localStorage
// seguro en SSR: nunca toca localStorage directamente, solo desde handlers o useEffect

const ID_KEY = "rescatista_id";
const NOMBRE_KEY = "rescatista_nombre";

// genera o recupera el id y nombre del rescatista
export function getRescatista(): { id: string; nombre: string } {
  if (typeof window === "undefined") {
    // en SSR devolvemos valores vacios para no romper la hidratacion
    return { id: "", nombre: "" };
  }

  let id = localStorage.getItem(ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ID_KEY, id);
  }

  const nombre = localStorage.getItem(NOMBRE_KEY) || "";
  return { id, nombre };
}

// guarda el alias / nombre del rescatista
export function setNombreRescatista(nombre: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOMBRE_KEY, nombre);
}
