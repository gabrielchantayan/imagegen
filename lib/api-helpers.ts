import { NextResponse } from "next/server";

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Standard API error response structure
 */
export type ApiError = {
  error: string;
};

/**
 * Standard API success response with optional data
 */
export type ApiSuccess<T = Record<string, unknown>> = {
  success: true;
} & T;

/**
 * Generic result type for API operations that can succeed or fail
 */
export type ApiResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: string };

/**
 * Standard API response wrapper type
 */
export type ApiResponse<T> = {
  data: T | null;
  error: string | null;
  status: number;
};

// =============================================================================
// Response Utilities
// =============================================================================

/**
 * Returns a NextResponse with JSON data and optional status code
 */
export const json_response = <T>(data: T, status: number = 200): NextResponse<T> => {
  return NextResponse.json(data, { status });
};

/**
 * Returns a standardized error response with the given message and status code
 */
export const error_response = (message: string, status: number = 400): NextResponse<ApiError> => {
  return NextResponse.json({ error: message }, { status });
};

/**
 * Returns a 404 not found response with a descriptive message
 */
export const not_found = (resource: string, id: string): NextResponse<ApiError> => {
  return NextResponse.json(
    { error: `${resource} with id ${id} not found` },
    { status: 404 }
  );
};

/**
 * Returns a success response with optional additional data
 */
export const success_response = <T extends Record<string, unknown> = Record<string, never>>(
  data?: T
): NextResponse<ApiSuccess<T>> => {
  return NextResponse.json({ success: true, ...data } as ApiSuccess<T>, { status: 200 });
};

/**
 * Returns a 401 unauthorized response
 */
export const unauthorized_response = (
  message: string = "Unauthorized"
): NextResponse<ApiError> => {
  return NextResponse.json({ error: message }, { status: 401 });
};

/**
 * Returns a 500 internal server error response
 */
export const server_error_response = (
  message: string = "Internal server error"
): NextResponse<ApiError> => {
  return NextResponse.json({ error: message }, { status: 500 });
};

/**
 * Returns a 409 conflict response
 */
export const conflict_response = (message: string): NextResponse<ApiError> => {
  return NextResponse.json({ error: message }, { status: 409 });
};

/**
 * Returns a 422 unprocessable entity response for validation errors
 */
export const validation_error_response = (message: string): NextResponse<ApiError> => {
  return NextResponse.json({ error: message }, { status: 422 });
};

// =============================================================================
// Result Helpers
// =============================================================================

/**
 * Creates a successful ApiResult
 */
export const ok = <T>(data: T): ApiResult<T> => ({
  success: true,
  data,
});

/**
 * Creates a failed ApiResult
 */
export const err = <T>(error: string): ApiResult<T> => ({
  success: false,
  error,
});
