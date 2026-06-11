import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Auth } from '../services/auth';

export const caregiverSignupGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const user = await auth.getCurrentUser();

  if (!user) {
    return router.createUrlTree(['/login'], {
      queryParams: { redirectTo: '/seja-cuidador' },
    });
  }

  return true;
};
