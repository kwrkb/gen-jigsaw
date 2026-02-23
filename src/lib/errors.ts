import { NextResponse } from "next/server";

export function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function notFound(message = "Not found") {
  return errorResponse(message, 404);
}

export function badRequest(message = "Bad request") {
  return errorResponse(message, 400);
}

export function conflict(message = "Conflict") {
  return errorResponse(message, 409);
}

export function forbidden(message = "Forbidden") {
  return errorResponse(message, 403);
}

export function unauthorized(message = "Unauthorized") {
  return errorResponse(message, 401);
}

export function serverError(message = "Internal server error") {
  return errorResponse(message, 500);
}
