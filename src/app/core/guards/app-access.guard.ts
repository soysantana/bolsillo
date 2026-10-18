import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthApiService } from '../services/auth-api.service';
import { GuestAccessService } from '../services/guest-access.service';

export const appAccessGuard: CanActivateFn = () => {
  const auth = inject(AuthApiService);
  const guestAccess = inject(GuestAccessService);
  const router = inject(Router);

  if (!guestAccess.hasAccountAccess()) {
    return guestAccess.canOpenApp() ? true : router.parseUrl('/bienvenida');
  }

  return auth
    .initialize()
    .pipe(map(() => (auth.authenticated() ? true : router.parseUrl('/login'))));
};
