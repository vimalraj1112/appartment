import type { Role, UserStatus } from "@superlink/shared";
import { apiRequest } from "../../lib/api";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  communityId: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  phone: string | null;
}

export interface AuthPayload {
  user: AuthUser;
  accessToken: string;
}

export function loginRequest(email: string, password: string): Promise<AuthPayload> {
  return apiRequest<AuthPayload>("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
}

export function refreshRequest(): Promise<AuthPayload> {
  return apiRequest<AuthPayload>("/auth/refresh", { method: "POST", auth: false });
}

export function logoutRequest(): Promise<{ loggedOut: boolean }> {
  return apiRequest<{ loggedOut: boolean }>("/auth/logout", { method: "POST" });
}

export function meRequest(): Promise<AuthUser> {
  return apiRequest<AuthUser>("/auth/me");
}

export function forgotPasswordRequest(email: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: { email },
    auth: false,
  });
}

export function resetPasswordRequest(
  token: string,
  password: string,
): Promise<{ passwordReset: boolean }> {
  return apiRequest<{ passwordReset: boolean }>("/auth/reset-password", {
    method: "POST",
    body: { token, password },
    auth: false,
  });
}
