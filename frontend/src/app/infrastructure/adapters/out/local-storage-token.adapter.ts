import { Injectable } from '@angular/core';
import { TokenStoragePort } from '../../../application/ports/out/token.storage.port.js';

@Injectable()
export class LocalStorageTokenAdapter implements TokenStoragePort {
  private readonly TOKEN_KEY = 'restaurant_auth_token';

  saveToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payloadBase64 = token.split('.')[1];
      if (!payloadBase64) return false;

      // Decodificación segura de base64 compatible con UTF-8
      const decodedPayload = decodeURIComponent(
        atob(payloadBase64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      const payload = JSON.parse(decodedPayload);
      const exp = payload.exp;
      if (exp) {
        return Date.now() < exp * 1000;
      }
      return true;
    } catch {
      return false;
    }
  }
}
