import { apiClient, setToken } from "./apiClient";
import type { AuthResponse, LoginPayload, RegisterPayload, User } from "../types/auth";

export const registerUser = async (payload: RegisterPayload) => {
  const response = await apiClient<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
    auth: false
  });

  setToken(response.token);

  return response;
};

export const loginUser = async (payload: LoginPayload) => {
  const response = await apiClient<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
    auth: false
  });

  setToken(response.token);

  return response;
};

export const getMe = async () => {
  const response = await apiClient<{ user: User }>("/auth/me");

  return response.user;
};
