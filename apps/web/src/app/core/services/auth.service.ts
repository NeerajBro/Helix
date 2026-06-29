import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, throwError } from 'rxjs';
import { AuthUser, AuthTokens, LoginRequest, LoginResponse } from '@helix/types';

const API_URL = '/api';
const TOKEN_KEY = 'helix_access_token';
const REFRESH_KEY = 'helix_refresh_token';
const USER_KEY = 'helix_user';

interface ApiWrapper<T> {
  success: boolean;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly userSignal = signal<AuthUser | null>(this.loadUser());
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.userSignal());

  login(credentials: LoginRequest) {
    return this.http
      .post<ApiWrapper<LoginResponse>>(`${API_URL}/auth/login`, credentials)
      .pipe(
        tap((res) => this.setSession(res.data)),
        catchError((err) => throwError(() => err)),
      );
  }

  logout(): void {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (refreshToken) {
      this.http.post(`${API_URL}/auth/logout`, { refreshToken }).subscribe();
    }
    this.clearSession();
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  refreshToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token'));
    }
    return this.http
      .post<ApiWrapper<AuthTokens>>(`${API_URL}/auth/refresh`, { refreshToken })
      .pipe(
        tap((res) => {
          localStorage.setItem(TOKEN_KEY, res.data.accessToken);
          localStorage.setItem(REFRESH_KEY, res.data.refreshToken);
        }),
      );
  }

  private setSession(data: LoginResponse): void {
    localStorage.setItem(TOKEN_KEY, data.tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, data.tokens.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    this.userSignal.set(data.user);
  }

  private clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this.userSignal.set(null);
  }

  private loadUser(): AuthUser | null {
    const stored = localStorage.getItem(USER_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as AuthUser;
    } catch {
      return null;
    }
  }
}
