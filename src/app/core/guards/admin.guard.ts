import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AdminService } from '../services/admin';
import { Auth } from '../services/auth';

export const adminGuard: CanActivateFn = async (_route, state) => {
  const admin = inject(AdminService);
  const auth = inject(Auth);
  const router = inject(Router);
  const user = await auth.getCurrentUser();

  if (!user) {
    return router.createUrlTree(['/login'], {
      queryParams: { redirectTo: state.url },
    });
  }

  const profile = await admin.getCurrentAdminProfile();
  if (!admin.getPermissions(profile).canAccessAdmin) {
    return router.createUrlTree(['/']);
  }

  return true;
};
