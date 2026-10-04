import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GuestAccessService } from '../services/guest-access.service';

export const guestPolicyGuard: CanActivateFn = () => {
  const guestAccess = inject(GuestAccessService);
  const router = inject(Router);

  return guestAccess.canOpenApp() ? true : router.parseUrl('/bienvenida');
};
