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

  const caregiverStatus = await auth.getCaregiverStatus(user.uid);
  if (caregiverStatus === 'active' || caregiverStatus === 'completed') {
    return router.createUrlTree(['/dashboard/cuidador']);
  }

  return true;
};
