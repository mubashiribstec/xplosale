import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiError = { ok: false; error: string; details?: unknown };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function ok<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ ok: true, data }, { status });
}

export function err(message: string, status = 400, details?: unknown): NextResponse<ApiError> {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

export function parseError(e: unknown): NextResponse<ApiError> {
  if (e instanceof ZodError) {
    return err("Validation error", 422, e.flatten().fieldErrors);
  }
  if (e instanceof Error) {
    console.error("[API error]", e.message);
  }
  return err("Internal server error", 500);
}
