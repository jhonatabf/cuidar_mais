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
    return router.createUrlTree(['/admin/login'], {
      queryParams: { redirectTo: state.url },
    });
  }

  const profile = await admin.getCurrentAdminProfile().catch(() => null);
  if (!admin.getPermissions(profile).canAccessAdmin) {
    await auth.signOut();
    return router.createUrlTree(['/admin/login'], {
      queryParams: { redirectTo: state.url },
    });
  }

  return true;
};
