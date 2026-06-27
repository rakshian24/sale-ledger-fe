export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

export const TOKEN_STORAGE_KEY = "saleledger-token";

export type ApiError = {
  message: string;
};

type RequestOptions = RequestInit & {
  auth?: boolean;
};

export const getToken = () => {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
};

export const setToken = (token: string) => {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

export const clearToken = () => {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
};

export const apiClient = async <T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> => {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth !== false) {
    const token = getToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Something went wrong");
  }

  return data as T;
};
