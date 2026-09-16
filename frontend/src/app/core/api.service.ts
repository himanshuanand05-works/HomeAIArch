import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiError, ApiErrorBody, ErrorCode } from '../models/api-error.model';

export const API_BASE_URL = '/api/v1';

const CODE_BY_STATUS: Record<number, ErrorCode> = {
  400: 'VALIDATION',
  401: 'UNAUTHORIZED',
  403: 'UNAUTHORIZED',
  404: 'RESOURCE_NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNSOLVABLE_LAYOUT',
  500: 'INTERNAL',
};

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  get<T>(path: string, params?: Record<string, string | number>): Observable<T> {
    return this.http.get<T>(`${API_BASE_URL}${path}`, { params }).pipe(catchError(toApiError));
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${API_BASE_URL}${path}`, body).pipe(catchError(toApiError));
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${API_BASE_URL}${path}`, body).pipe(catchError(toApiError));
  }

  delete<T = void>(path: string): Observable<T> {
    return this.http.delete<T>(`${API_BASE_URL}${path}`).pipe(catchError(toApiError));
  }
}

export function toApiError(error: HttpErrorResponse): Observable<never> {
  const body = error.error as Partial<ApiErrorBody> | undefined;
  const apiError = new ApiError({
    statusCode: typeof body?.statusCode === 'number' ? body.statusCode : error.status,
    code: isErrorCode(body?.code) ? body.code : (CODE_BY_STATUS[error.status] ?? 'INTERNAL'),
    message: body?.message ?? (error.status === 0 ? 'Network error' : error.message),
    details: body?.details,
    traceId: body?.traceId,
  });
  return throwError(() => apiError);
}

function isErrorCode(value: unknown): value is ErrorCode {
  return (
    typeof value === 'string' &&
    [
      'VALIDATION',
      'RESOURCE_NOT_FOUND',
      'CONFLICT',
      'UNAUTHORIZED',
      'UNSOLVABLE_LAYOUT',
      'INVALID_CHANGE_REQUEST',
      'INTERNAL',
    ].includes(value)
  );
}
