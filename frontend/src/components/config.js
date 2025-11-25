// Cambia automáticamente localhost a la IP real en red local
export const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://10.226.92.153:3000"   // tu IP actual
    : `http://${window.location.hostname}:3000`;
