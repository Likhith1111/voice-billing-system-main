/**
 * Centralized API configuration for QuantumVoice.
 * Defaults to http://127.0.0.1:8000 for local development,
 * and seamlessly switches to VITE_API_BASE_URL when deployed to Vercel or cloud.
 */

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

export const apiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

export default apiUrl;
