import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Auth } from '../services/auth';

export const caregiverDashboardGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const user = await auth.getCurrentUser();

  if (!user) {
    return router.createUrlTree(['/login'], {
      queryParams: { redirectTo: '/dashboard/cuidador' },
    });
  }

  const [account, caregiverStatus] = await Promise.all([
    auth.getUserAccount(user.uid),
    auth.getCaregiverStatus(user.uid),
  ]);

  if (caregiverStatus || account?.roles?.caregiver || account?.role === 'caregiver') {
    return true;
  }

  return router.createUrlTree(['/dashboard/familia']);
};

export const familyDashboardGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const user = await auth.getCurrentUser();

  if (!user) {
    return router.createUrlTree(['/login'], {
      queryParams: { redirectTo: '/dashboard/familia' },
    });
  }

  const account = await auth.getUserAccount(user.uid);
  if (!account) {
    return router.createUrlTree(['/cadastro']);
  }

  if (account?.roles?.family || account?.role === 'family') {
    return true;
  }

  return router.createUrlTree([await auth.getPostLoginRedirect(user.uid)]);
};
