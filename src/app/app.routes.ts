import { Routes } from '@angular/router';

import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { caregiverSignupGuard } from './core/guards/caregiver-signup.guard';
import { caregiverDashboardGuard, familyDashboardGuard } from './core/guards/dashboard.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'wecareparents | Cuidados ao domicilio',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomeComponent),
  },
  {
    path: 'como-funciona',
    title: 'Como Funciona | wecareparents',
    loadComponent: () =>
      import('./pages/how-it-works/how-it-works').then((m) => m.HowItWorksComponent),
  },
  {
    path: 'como-funciona/familias',
    title: 'Como Funciona para Familias | wecareparents',
    loadComponent: () =>
      import('./pages/how-it-works-families/how-it-works-families').then(
        (m) => m.HowItWorksFamiliesComponent,
      ),
  },
  {
    path: 'como-funciona/cuidadores',
    title: 'Como Funciona para Cuidadores | wecareparents',
    loadComponent: () =>
      import('./pages/how-it-works-caregivers/how-it-works-caregivers').then(
        (m) => m.HowItWorksCaregiversComponent,
      ),
  },
  {
    path: 'encontrar-cuidador',
    title: 'Encontrar Cuidador | wecareparents',
    loadComponent: () =>
      import('./pages/find-caregiver/find-caregiver').then((m) => m.FindCaregiverComponent),
  },
  {
    path: 'cuidador/:id',
    title: 'Perfil do Cuidador | wecareparents',
    loadComponent: () =>
      import('./pages/caregiver-profile/caregiver-profile').then(
        (m) => m.CaregiverProfileComponent,
      ),
  },
  {
    path: 'seja-cuidador',
    title: 'Seja Cuidador | wecareparents',
    canActivate: [caregiverSignupGuard],
    loadComponent: () =>
      import('./pages/become-caregiver/become-caregiver').then(
        (m) => m.BecomeCaregiverComponent,
      ),
  },
  {
    path: 'login',
    title: 'Login | wecareparents',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'admin/login',
    title: 'Administração | wecareparents',
    loadComponent: () =>
      import('./pages/admin-login/admin-login').then((m) => m.AdminLoginComponent),
  },
  {
    path: 'admin',
    title: 'Administração | wecareparents',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboardComponent),
  },
  {
    path: 'admin/revisoes/:type/:id',
    title: 'Análise de Cadastro | wecareparents',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin-review-detail/admin-review-detail').then(
        (m) => m.AdminReviewDetailComponent,
      ),
  },
  {
    path: 'cadastro',
    title: 'Cadastro | wecareparents',
    loadComponent: () => import('./pages/register/register').then((m) => m.RegisterComponent),
  },
  {
    path: 'verificar-email',
    title: 'Verificar Email | wecareparents',
    loadComponent: () =>
      import('./pages/email-verification/email-verification').then(
        (m) => m.EmailVerificationComponent,
      ),
  },
  {
    path: 'meus-dados-pessoais',
    title: 'Meus Dados Pessoais | wecareparents',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/personal-data/personal-data').then((m) => m.PersonalDataComponent),
  },
  {
    path: 'dashboard/familia',
    title: 'Dashboard Familia | wecareparents',
    canActivate: [familyDashboardGuard],
    loadComponent: () =>
      import('./pages/family-dashboard/family-dashboard').then(
        (m) => m.FamilyDashboardComponent,
      ),
  },
  {
    path: 'dashboard/cuidador',
    title: 'Dashboard Cuidador | wecareparents',
    canActivate: [caregiverDashboardGuard],
    loadComponent: () =>
      import('./pages/caregiver-dashboard/caregiver-dashboard').then(
        (m) => m.CaregiverDashboardComponent,
      ),
  },
  {
    path: 'faq',
    title: 'FAQ | wecareparents',
    loadComponent: () => import('./pages/faq/faq').then((m) => m.FaqComponent),
  },
  {
    path: 'contacto',
    title: 'Contacto | wecareparents',
    loadComponent: () => import('./pages/contact/contact').then((m) => m.ContactComponent),
  },
  {
    path: 'termos',
    title: 'Termos | wecareparents',
    loadComponent: () => import('./pages/terms/terms').then((m) => m.TermsComponent),
  },
  {
    path: 'privacidade',
    title: 'Privacidade | wecareparents',
    loadComponent: () => import('./pages/privacy/privacy').then((m) => m.PrivacyComponent),
  },
  {
    path: 'cookies',
    title: 'Cookies | wecareparents',
    loadComponent: () => import('./pages/cookies/cookies').then((m) => m.CookiesComponent),
  },
  {
    path: 'rgpd',
    title: 'RGPD | wecareparents',
    loadComponent: () => import('./pages/gdpr/gdpr').then((m) => m.GdprComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
