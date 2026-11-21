export interface TokenStoragePort {
  saveToken(token: string): void;
  getToken(): string | null;
  removeToken(): void;
  isAuthenticated(): boolean;
}
