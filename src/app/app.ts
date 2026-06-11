import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { User } from 'firebase/auth';

import { Auth } from './core/services/auth';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private unsubscribeAuth?: () => void;

  protected readonly user = signal<User | null>(null);
  protected readonly displayName = signal('');
  protected readonly avatarUrl = signal('');
  protected readonly hasCaregiverProfile = signal(false);
  protected readonly hasFamilyProfile = signal(false);
  protected readonly caregiverStatus = signal<string | null>(null);
  protected readonly accountMenuOpen = signal(false);

  protected readonly mainLinks = [
    { label: 'Como funciona', path: '/como-funciona' },
    { label: 'Cuidadores', path: '/como-funciona/cuidadores' },
    { label: 'Famílias', path: '/como-funciona/familias' },
    { label: 'Segurança', path: '/rgpd' },
    { label: 'Sobre', path: '/faq' },
  ];

  protected readonly footerLinks = [
    { label: 'Sobre nós', path: '/faq' },
    { label: 'Como funciona', path: '/como-funciona' },
    { label: 'Segurança', path: '/rgpd' },
    { label: 'Blog', path: '/faq' },
    { label: 'Contato', path: '/contacto' },
  ];

  protected readonly helpLinks = [
    { label: 'Perguntas frequentes', path: '/faq' },
    { label: 'Termos', path: '/termos' },
    { label: 'Política de privacidade', path: '/privacidade' },
  ];

  ngOnInit(): void {
    this.unsubscribeAuth = this.auth.onUserChange((user) => {
      void this.setUserState(user);
    });
  }

  ngOnDestroy(): void {
    this.unsubscribeAuth?.();
  }

  protected getInitials(): string {
    const name = this.displayName() || this.user()?.email || 'U';
    return name.trim().charAt(0).toUpperCase();
  }

  protected toggleAccountMenu(): void {
    this.accountMenuOpen.update((isOpen) => !isOpen);
  }

  protected closeAccountMenu(): void {
    this.accountMenuOpen.set(false);
  }

  protected async goToCaregiverDashboard(): Promise<void> {
    this.closeAccountMenu();
    await this.router.navigateByUrl('/dashboard/cuidador');
  }

  protected async goToFamilyDashboard(): Promise<void> {
    this.closeAccountMenu();
    await this.router.navigateByUrl('/dashboard/familia');
  }

  protected async createCaregiverProfile(): Promise<void> {
    this.closeAccountMenu();
    await this.router.navigateByUrl('/seja-cuidador');
  }

  protected async createFamilyProfile(): Promise<void> {
    this.closeAccountMenu();
    await this.router.navigateByUrl('/dashboard/familia');
  }

  protected async logout(): Promise<void> {
    this.closeAccountMenu();
    await this.auth.signOut();
    await this.router.navigateByUrl('/');
  }

  private async setUserState(user: User | null): Promise<void> {
    this.user.set(user);
    this.accountMenuOpen.set(false);

    if (!user) {
      this.displayName.set('');
      this.avatarUrl.set('');
      this.hasCaregiverProfile.set(false);
      this.hasFamilyProfile.set(false);
      this.caregiverStatus.set(null);
      return;
    }

    const summary = await this.auth.getProfileSummary(user.uid);
    this.displayName.set(summary.account?.fullName || user.displayName || user.email || 'Utilizador');
    this.avatarUrl.set(user.photoURL ?? '');
    this.hasCaregiverProfile.set(summary.hasCaregiver);
    this.hasFamilyProfile.set(summary.hasFamily);
    this.caregiverStatus.set(summary.caregiverStatus);
  }
}
