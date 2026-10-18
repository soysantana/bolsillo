import { HttpErrorResponse, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthApiService } from './auth-api.service';

export function authInterceptor(request: HttpRequest<unknown>, next: HttpHandlerFn) {
  const auth = inject(AuthApiService);
  const token = auth.accessToken();

  if (!isApiRequest(request)) return next(request);

  const authorized = token
    ? request.clone({
        withCredentials: true,
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : request.clone({ withCredentials: true });

  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (isPublicAuthRequest(request) || !isUnauthorized(error)) return throwError(() => error);
      return auth.refresh().pipe(
        switchMap((refreshed) => {
          const nextToken = auth.accessToken();
          if (!refreshed || !nextToken) return throwError(() => error);
          return next(
            request.clone({
              setHeaders: {
                Authorization: `Bearer ${nextToken}`,
              },
            }),
          );
        }),
      );
    }),
  );
}

function isApiRequest(request: HttpRequest<unknown>): boolean {
  return environment.apiUrl
    ? request.url.startsWith(environment.apiUrl)
    : request.url.startsWith('/');
}

function isAuthRefresh(request: HttpRequest<unknown>): boolean {
  return request.url.endsWith('/auth/refresh');
}

function isPublicAuthRequest(request: HttpRequest<unknown>): boolean {
  return (
    isAuthRefresh(request) ||
    request.url.endsWith('/auth/login') ||
    request.url.endsWith('/auth/register') ||
    request.url.endsWith('/auth/forgot-password') ||
    request.url.endsWith('/auth/reset-password') ||
    request.url.endsWith('/auth/verify-email') ||
    request.url.endsWith('/auth/resend-verification')
  );
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 401;
}
