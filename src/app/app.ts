import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { User } from 'firebase/auth';
import { Subscription } from 'rxjs';

import { Auth, UserProfilePhotoUpload } from './core/services/auth';
import { AppLocale, LocaleService } from './core/services/locale';

const USER_PROFILE_PHOTO_MAX_FILE_BYTES = 5 * 1024 * 1024;
const USER_PROFILE_PHOTO_TARGET_BYTES = 300 * 1024;
const USER_PROFILE_PHOTO_MAX_DIMENSION = 800;
const USER_PROFILE_PHOTO_MIN_QUALITY = 0.58;

const SHELL_COPY = {
  'pt-PT': {
    tagline: 'Conectando com cuidado',
    navigation: 'Navegação principal',
    mobileNavigation: 'Navegação móvel',
    menu: 'Abrir ou fechar o menu de navegação',
    enterRegister: 'Entrar / Registar',
    enter: 'Entrar',
    register: 'Registar',
    mainLinks: ['Como funciona', 'Cuidadores', 'Famílias', 'Segurança', 'Sobre'],
    institutional: 'Institucional',
    help: 'Ajuda',
    follow: 'Siga-nos',
    footerText: 'Plataforma que liga famílias a cuidadores com segurança, respeito e carinho.',
    footerLinks: ['Sobre nós', 'Como funciona', 'Segurança', 'Blog', 'Contacto'],
    helpLinks: ['Perguntas frequentes', 'Termos', 'Política de privacidade'],
    copyright: '© 2024 Cuidar+. Todos os direitos reservados.',
  },
  'en-GB': {
    tagline: 'Connecting with care',
    navigation: 'Main navigation',
    mobileNavigation: 'Mobile navigation',
    menu: 'Open or close the navigation menu',
    enterRegister: 'Sign in / Register',
    enter: 'Sign in',
    register: 'Register',
    mainLinks: ['How it works', 'Caregivers', 'Families', 'Safety', 'About'],
    institutional: 'Company',
    help: 'Help',
    follow: 'Follow us',
    footerText: 'A platform connecting families and caregivers with safety, respect and kindness.',
    footerLinks: ['About us', 'How it works', 'Safety', 'Blog', 'Contact'],
    helpLinks: ['Frequently asked questions', 'Terms', 'Privacy policy'],
    copyright: '© 2024 Cuidar+. All rights reserved.',
  },
} as const;

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  protected readonly localeService = inject(LocaleService);
  private unsubscribeAuth?: () => void;
  private routeSubscription?: Subscription;

  protected readonly user = signal<User | null>(null);
  protected readonly displayName = signal('');
  protected readonly avatarUrl = signal('');
  protected readonly hasCaregiverProfile = signal(false);
  protected readonly hasFamilyProfile = signal(false);
  protected readonly caregiverStatus = signal<string | null>(null);
  protected readonly emailVerified = signal(false);
  protected readonly accountMenuOpen = signal(false);
  protected readonly photoMessage = signal('');
  protected readonly isUpdatingPhoto = signal(false);
  protected readonly isAdminArea = signal(this.router.url.startsWith('/admin'));
  protected readonly isScrolled = signal(false);
  protected readonly isMobileMenuOpen = signal(false);

  protected readonly shellCopy = computed(() => SHELL_COPY[this.localeService.locale()]);
  protected readonly mainLinks = computed(() =>
    ['/como-funciona', '/como-funciona/cuidadores', '/como-funciona/familias', '/rgpd', '/faq']
      .map((path, index) => ({ path, label: this.shellCopy().mainLinks[index] })),
  );
  protected readonly footerLinks = computed(() =>
    ['/faq', '/como-funciona', '/rgpd', '/faq', '/contacto']
      .map((path, index) => ({ path, label: this.shellCopy().footerLinks[index] })),
  );
  protected readonly helpLinks = computed(() =>
    ['/faq', '/termos', '/privacidade']
      .map((path, index) => ({ path, label: this.shellCopy().helpLinks[index] })),
  );

  protected changeLocale(event: Event): void {
    this.localeService.setLocale((event.target as HTMLSelectElement).value as AppLocale);
  }

  ngOnInit(): void {
    this.updateHeaderScrollState();
    this.unsubscribeAuth = this.auth.onUserChange((user) => {
      void this.setUserState(user);
    });
    this.routeSubscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.isAdminArea.set(event.urlAfterRedirects.startsWith('/admin'));
        this.closeMobileMenu();
      }
    });
  }

  ngOnDestroy(): void {
    this.unsubscribeAuth?.();
    this.routeSubscription?.unsubscribe();
  }

  @HostListener('window:scroll')
  protected updateHeaderScrollState(): void {
    this.isScrolled.set(window.scrollY > 40);
  }

  @HostListener('window:keydown.escape')
  protected closeMenusOnEscape(): void {
    this.closeMobileMenu();
    this.closeAccountMenu();
  }

  @HostListener('window:resize')
  protected closeMobileMenuOnDesktop(): void {
    if (window.innerWidth > 1040) {
      this.closeMobileMenu();
    }
  }

  protected toggleMobileMenu(): void {
    this.accountMenuOpen.set(false);
    this.isMobileMenuOpen.update((isOpen) => !isOpen);
  }

  protected closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  protected getInitials(): string {
    const name = this.displayName() || this.user()?.email || 'U';
    return name.trim().charAt(0).toUpperCase();
  }

  protected toggleAccountMenu(): void {
    this.closeMobileMenu();
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

  protected async goToPersonalData(): Promise<void> {
    this.closeAccountMenu();
    await this.router.navigateByUrl('/meus-dados-pessoais');
  }

  protected async logout(): Promise<void> {
    this.closeAccountMenu();
    await this.auth.signOut();
    await this.router.navigateByUrl('/');
  }

  protected async onProfilePhotoChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.photoMessage.set('');

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.photoMessage.set('A foto deve ser um ficheiro de imagem.');
      input.value = '';
      return;
    }

    if (file.size > USER_PROFILE_PHOTO_MAX_FILE_BYTES) {
      this.photoMessage.set('A foto de perfil deve ter no máximo 5 MB.');
      input.value = '';
      return;
    }

    this.isUpdatingPhoto.set(true);
    try {
      const upload = await this.buildUserProfilePhotoUpload(file);
      const profilePhoto = await this.auth.updateUserProfilePhoto(upload);
      this.avatarUrl.set(profilePhoto.downloadUrl);
      this.photoMessage.set('Foto de perfil atualizada.');
    } catch (error) {
      this.photoMessage.set(error instanceof Error ? error.message : 'Não foi possível atualizar a foto de perfil.');
    } finally {
      this.isUpdatingPhoto.set(false);
      input.value = '';
    }
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
      this.emailVerified.set(false);
      return;
    }

    const summary = await this.auth.getProfileSummary(user.uid);
    const userAvatarUrl = summary.account?.profilePhoto?.downloadUrl ?? '';

    this.displayName.set(summary.account?.fullName || user.displayName || user.email || 'Utilizador');
    this.avatarUrl.set(userAvatarUrl || user.photoURL || '');
    this.hasCaregiverProfile.set(summary.hasCaregiver);
    this.hasFamilyProfile.set(summary.hasFamily);
    this.caregiverStatus.set(summary.caregiverStatus);
    this.emailVerified.set(user.emailVerified);
  }

  private async buildUserProfilePhotoUpload(file: File): Promise<UserProfilePhotoUpload> {
    const blob = await this.compressUserProfilePhoto(file);
    return {
      name: file.name,
      contentType: 'image/jpeg',
      originalSize: file.size,
      compressedSize: blob.size,
      blob,
    };
  }

  private async compressUserProfilePhoto(file: File): Promise<Blob> {
    const dataUrl = await this.readFileAsDataUrl(file);
    const image = await this.loadImage(dataUrl);
    return this.compressImageElementToJpegBlob(image);
  }

  private async compressImageElementToJpegBlob(image: HTMLImageElement): Promise<Blob> {
    let { width, height } = this.fitImageSize(image.width, image.height, USER_PROFILE_PHOTO_MAX_DIMENSION);
    let bestBlob: Blob | null = null;

    while (width >= 320 && height >= 320) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Não foi possível otimizar a foto de perfil.');
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      for (let quality = 0.82; quality >= USER_PROFILE_PHOTO_MIN_QUALITY; quality -= 0.08) {
        const blob = await this.canvasToJpegBlob(canvas, quality);
        bestBlob = !bestBlob || blob.size < bestBlob.size ? blob : bestBlob;
        if (blob.size <= USER_PROFILE_PHOTO_TARGET_BYTES) {
          return blob;
        }
      }

      width = Math.floor(width * 0.82);
      height = Math.floor(height * 0.82);
    }

    if (bestBlob) {
      return bestBlob;
    }

    throw new Error('Não foi possível otimizar a foto de perfil.');
  }

  private canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
            return;
          }

          reject(new Error('Não foi possível gerar a foto otimizada.'));
        },
        'image/jpeg',
        quality,
      );
    });
  }

  private fitImageSize(width: number, height: number, maxDimension: number): { width: number; height: number } {
    if (width <= maxDimension && height <= maxDimension) {
      return { width, height };
    }

    const ratio = Math.min(maxDimension / width, maxDimension / height);
    return {
      width: Math.round(width * ratio),
      height: Math.round(height * ratio),
    };
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Não foi possível carregar a foto de perfil.'));
      image.src = src;
    });
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }

        reject(new Error('Não foi possível ler a foto de perfil.'));
      };
      reader.onerror = () => reject(new Error('Não foi possível ler a foto de perfil.'));
      reader.readAsDataURL(file);
    });
  }
}
