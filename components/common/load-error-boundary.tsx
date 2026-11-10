"use client";

import { catchError, type ErrorInfo } from "next/error";

function LoadError({ message }: { message: string }, _errorInfo: ErrorInfo) {
  return <p className="text-sm text-destructive">{message}</p>;
}

export const LoadErrorBoundary = catchError(LoadError);
