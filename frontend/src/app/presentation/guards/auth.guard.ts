import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { TOKEN_STORAGE_TOKEN } from '../../infrastructure/providers/auth.providers.js';

export const authGuard: CanActivateFn = (route, state) => {
  const tokenStorage = inject(TOKEN_STORAGE_TOKEN);
  const router = inject(Router);

  if (tokenStorage.isAuthenticated()) {
    return true;
  }

  // Si no está autenticado, redirige a login
  router.navigate(['/login']);
  return false;
};
