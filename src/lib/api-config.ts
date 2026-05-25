import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

export function getApiBaseUrl(): string {
  const raw = typeof apiBaseUrl === "string" ? apiBaseUrl.trim() : "";

  if (!raw) {
    return "";
  }

  return raw.replace(/\/+$/, "");
}

export function assertApiBaseUrl(): string {
  const baseUrl = getApiBaseUrl();

  if (!baseUrl) {
    throw new Error("VITE_API_BASE_URL is not configured.");
  }

  return baseUrl;
}

export function createApiClient(timeout: number): ReturnType<typeof axios.create> {
  return axios.create({
    baseURL: getApiBaseUrl() || undefined,
    timeout,
  });
}

export function getApiUnavailableMessage(): string {
  return "Scientific data is temporarily unavailable. Configure VITE_API_BASE_URL to enable the Compare Page filters.";
}
