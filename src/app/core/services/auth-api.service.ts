import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DeviceSession } from '../../features/account/account-demo';
import { GuestAccessService } from './guest-access.service';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AccessTokenResponse {
  accessToken: string;
}

interface ApiSession {
  id: string;
  deviceId: string;
  deviceName?: string | null;
  platform?: string | null;
  userAgent?: string | null;
  lastUsedAt: string;
}

const ACCESS_TOKEN_KEY = 'bolsillo.accessToken';
const DEVICE_ID_KEY = 'bolsillo.deviceId';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly guestAccess = inject(GuestAccessService);
  private readonly token = signal('');
  private refreshRequest?: Observable<boolean>;
  private initializeRequest?: Observable<boolean>;
  private removedLegacyStoredToken = false;

  readonly accessToken = this.token.asReadonly();
  readonly authenticated = computed(() => !!this.token());

  initialize(): Observable<boolean> {
    this.removeLegacyStoredToken();
    if (this.token()) return of(true);
    if (this.initializeRequest) return this.initializeRequest;
    this.initializeRequest = this.refresh().pipe(
      finalize(() => {
        this.initializeRequest = undefined;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.initializeRequest;
  }

  login(email: string, password: string): Observable<void> {
    return this.http
      .post<AccessTokenResponse>(
        this.url('/auth/login'),
        { email, password },
        { headers: deviceHeaders(), withCredentials: true },
      )
      .pipe(
        tap((response) => this.storeAccessToken(response.accessToken)),
        map(() => undefined),
      );
  }

  register(name: string, email: string, password: string): Observable<void> {
    return this.http
      .post(this.url('/auth/register'), { name, email, password }, { withCredentials: true })
      .pipe(map(() => undefined));
  }

  forgotPassword(email: string): Observable<void> {
    return this.http
      .post(this.url('/auth/forgot-password'), { email }, { withCredentials: true })
      .pipe(map(() => undefined));
  }

  resetPassword(token: string, password: string): Observable<void> {
    return this.http
      .post(this.url('/auth/reset-password'), { token, password }, { withCredentials: true })
      .pipe(map(() => undefined));
  }

  verifyEmail(token: string): Observable<void> {
    return this.http
      .post(this.url('/auth/verify-email'), { token }, { withCredentials: true })
      .pipe(map(() => undefined));
  }

  resendVerification(email: string): Observable<void> {
    return this.http
      .post(this.url('/auth/resend-verification'), { email }, { withCredentials: true })
      .pipe(map(() => undefined));
  }

  refresh(): Observable<boolean> {
    if (this.refreshRequest) return this.refreshRequest;
    this.refreshRequest = this.requestRefresh().pipe(
      finalize(() => {
        this.refreshRequest = undefined;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.refreshRequest;
  }

  private requestRefresh(): Observable<boolean> {
    return this.http
      .post<AccessTokenResponse>(
        this.url('/auth/refresh'),
        {},
        { headers: deviceHeaders(), withCredentials: true },
      )
      .pipe(
        tap((response) => this.storeAccessToken(response.accessToken)),
        map(() => true),
        catchError(() => {
          this.clearAccessToken();
          return of(false);
        }),
      );
  }

  logout(): Observable<void> {
    return this.http.post(this.url('/auth/logout'), {}, { withCredentials: true }).pipe(
      tap(() => this.clearAccessToken()),
      catchError(() => {
        this.clearAccessToken();
        return of(undefined);
      }),
      map(() => undefined),
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http
      .post(
        this.url('/auth/change-password'),
        { currentPassword, newPassword },
        { withCredentials: true },
      )
      .pipe(
        tap(() => this.clearAccessToken()),
        map(() => undefined),
      );
  }

  deleteAccount(currentPassword: string): Observable<void> {
    return this.http
      .delete(this.url('/auth/me'), { body: { currentPassword }, withCredentials: true })
      .pipe(
        tap(() => this.clearAccessToken()),
        map(() => undefined),
      );
  }

  sessions(): Observable<DeviceSession[]> {
    return this.http
      .get<ApiSession[]>(this.url('/auth/sessions'), { withCredentials: true })
      .pipe(map((sessions) => sessions.map(toDeviceSession)));
  }

  revokeSession(sessionId: string): Observable<void> {
    return this.http
      .delete(this.url(`/auth/sessions/${encodeURIComponent(sessionId)}`), {
        withCredentials: true,
      })
      .pipe(map(() => undefined));
  }

  logoutAll(): Observable<void> {
    return this.http.post(this.url('/auth/logout-all'), {}, { withCredentials: true }).pipe(
      tap(() => this.clearAccessToken()),
      map(() => undefined),
    );
  }

  me(): Observable<AuthUser> {
    return this.http.get<AuthUser>(this.url('/auth/me'), { withCredentials: true });
  }

  private storeAccessToken(accessToken: string): void {
    this.token.set(accessToken);
    this.guestAccess.allowAccountAccess();
    removeStorage(ACCESS_TOKEN_KEY);
  }

  private clearAccessToken(): void {
    this.token.set('');
    removeStorage(ACCESS_TOKEN_KEY);
  }

  private removeLegacyStoredToken(): void {
    if (this.removedLegacyStoredToken) return;
    this.removedLegacyStoredToken = true;
    removeStorage(ACCESS_TOKEN_KEY);
  }

  private url(path: string): string {
    return `${environment.apiUrl}${path}`;
  }
}

export function deviceHeaders(): Record<string, string> {
  return {
    'X-Device-Id': deviceId(),
    'X-Device-Name': deviceName(),
    'X-Device-Platform': navigator.platform || 'web',
  };
}

function deviceId(): string {
  const stored = readStorage(DEVICE_ID_KEY);
  if (stored) return stored;
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  writeStorage(DEVICE_ID_KEY, id);
  return id;
}

function deviceName(): string {
  const platform = navigator.platform || 'Web';
  return platform.includes('iPhone') || platform.includes('iPad') ? platform : 'Este dispositivo';
}

function toDeviceSession(session: ApiSession): DeviceSession {
  return {
    id: session.id,
    device: session.deviceName || 'Este dispositivo',
    platform: session.platform || session.userAgent || 'Bolsillo',
    activity: session.lastUsedAt
      ? `Activo ${new Date(session.lastUsedAt).toLocaleString()}`
      : 'Activo',
    current: session.deviceId === deviceId(),
  };
}

function readStorage(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Auth still works for the active tab if storage is unavailable.
  }
}

function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
