import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes.js';
import { jwtInterceptor } from './presentation/interceptors/jwt.interceptor.js';
import { authProviders } from './infrastructure/providers/auth.providers.js';
import { restaurantProviders } from './infrastructure/providers/restaurant.providers.js';
import { sucursalProviders } from './infrastructure/providers/sucursal.providers.js';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtInterceptor])),
    ...authProviders,
    ...restaurantProviders,
    ...sucursalProviders
  ]
};
