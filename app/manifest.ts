import type { MetadataRoute } from "next";

// manifest de la PWA para que se pueda instalar en el celular
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RescuENet",
    short_name: "RescuENet",
    description: "Reporta y coordina emergencias, incluso sin internet",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#dc2626",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
