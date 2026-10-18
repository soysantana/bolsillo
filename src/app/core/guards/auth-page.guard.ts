import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthApiService } from '../services/auth-api.service';

export const authPageGuard: CanActivateFn = () => {
  const auth = inject(AuthApiService);
  const router = inject(Router);

  return auth
    .initialize()
    .pipe(map(() => (auth.authenticated() ? router.parseUrl('/inicio') : true)));
};
