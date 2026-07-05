import type { AuthUser, Company } from "./models";

/**
 * Standard backend API envelope.
 *
 * All backend responses should follow:
 * {
 *   success: boolean;
 *   message: string;
 *   data: T;
 * }
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * Cursor-based pagination structure.
 *
 * Can later evolve into full pagination metadata
 * without changing consuming components.
 */
export interface Paginated<T> {
  items: T[];
  nextCursor?: string | null;
  total?: number;
}

// Login request payload.
export interface LoginRequest {
  email: string;
  password: string;
}

// Initial company onboarding payload.
export interface RegisterRequest {
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface AcceptInviteRequest {
  token: string;
  password: string;
}

/**
 * Shared authenticated session payload.
 *
 * Used by:
 * - login
 * - register
 * - auth/me
 */
export interface AuthSession {
  accessToken: string;
  user: AuthUser;
  company: Company;
}

// Standard auth response shape.
export type AuthResponse = ApiResponse<AuthSession>;

// Current authenticated session response.
export type AuthMeResponse = ApiResponse<{
  user: AuthUser;
  company: Company;
}>;
