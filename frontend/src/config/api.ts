/**
 * Centralized API configuration for QBill.
 * Defaults to http://127.0.0.1:8000 for local development,
 * and seamlessly switches to VITE_API_BASE_URL when deployed to Vercel or cloud.
 */

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" &&
   window.location.hostname &&
   window.location.hostname !== "localhost" &&
   window.location.hostname !== "127.0.0.1" &&
   window.location.port !== "8000"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "http://127.0.0.1:8000")
).replace(/\/$/, "");

export const apiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

export default apiUrl;
