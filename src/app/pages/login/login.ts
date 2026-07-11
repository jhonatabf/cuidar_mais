import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Auth } from '../../core/services/auth';
import { AppLocale, LocaleService } from '../../core/services/locale';

const LOGIN_COPY = {
  'pt-PT': {
    eyebrow: 'Iniciar sessão',
    title: 'Entre para acompanhar os seus cuidados.',
    lead: 'Acesso para famílias e cuidadores.',
    email: 'Email',
    password: 'Palavra-passe',
    passwordPlaceholder: 'A sua palavra-passe',
    submitting: 'A entrar...',
    submit: 'Entrar',
    googleSubmitting: 'A entrar com Google...',
    googleSubmit: 'Continuar com Google',
    separator: 'ou',
    createAccount: 'Criar conta',
  },
  'en-GB': {
    eyebrow: 'Sign in',
    title: 'Sign in to manage your care journey.',
    lead: 'Access for families and caregivers.',
    email: 'Email',
    password: 'Password',
    passwordPlaceholder: 'Your password',
    submitting: 'Signing in...',
    submit: 'Sign in',
    googleSubmitting: 'Signing in with Google...',
    googleSubmit: 'Continue with Google',
    separator: 'or',
    createAccount: 'Create account',
  },
} as const;

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  template: `
    <section class="page hero hero-compact login-page">
      <div class="login-intro">
        <p class="eyebrow">{{ copy().eyebrow }}</p>
        <h1>{{ copy().title }}</h1>
        <p class="lead">{{ copy().lead }}</p>
      </div>
      <form class="card card-body form-grid" (submit)="onSubmit($event)">
        <label>{{ copy().email }}<input name="email" type="email" required placeholder="email@exemplo.pt" /></label>
        <label>{{ copy().password }}<input name="password" type="password" required [placeholder]="copy().passwordPlaceholder" /></label>
        @if (errorMessage()) {
          <p class="form-message error-message" role="alert">{{ errorMessage() }}</p>
        }
        <button class="btn btn-login" type="submit" [disabled]="isSubmitting()">
          {{ isSubmitting() ? copy().submitting : copy().submit }}
        </button>
        <div class="auth-separator"><span>{{ copy().separator }}</span></div>
        <button class="btn btn-secondary google-auth-button" type="button" [disabled]="isGoogleSubmitting()" (click)="signInWithGoogle()">
          <span aria-hidden="true">G</span>
          {{ isGoogleSubmitting() ? copy().googleSubmitting : copy().googleSubmit }}
        </button>
        <a class="btn btn-register" routerLink="/cadastro" [queryParams]="{ redirectTo: redirectTo() }">{{ copy().createAccount }}</a>
      </form>
    </section>
  `,
  styleUrl: './login.scss',
})
export class LoginComponent {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly localeService = inject(LocaleService);

  protected readonly isSubmitting = signal(false);
  protected readonly isGoogleSubmitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly redirectTo = signal(this.route.snapshot.queryParamMap.get('redirectTo') ?? '');

  protected copy(): (typeof LOGIN_COPY)[AppLocale] {
    return LOGIN_COPY[this.localeService.locale()];
  }

  protected async onSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.errorMessage.set('');

    const form = event.currentTarget as HTMLFormElement;
    if (!form.reportValidity()) {
      return;
    }

    const formData = new FormData(form);
    this.isSubmitting.set(true);
    try {
      const user = await this.auth.signIn(this.textValue(formData, 'email'), this.textValue(formData, 'password'));
      const redirectTo = this.redirectTo() || (await this.auth.getPostLoginRedirect(user.uid));
      if (!user.emailVerified) {
        await this.router.navigate(['/verificar-email'], {
          queryParams: { redirectTo },
        });
        return;
      }

      await this.router.navigateByUrl(redirectTo);
    } catch (error) {
      this.errorMessage.set(this.auth.getFirebaseErrorMessage(error, 'login'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected async signInWithGoogle(): Promise<void> {
    this.errorMessage.set('');
    this.isGoogleSubmitting.set(true);
    try {
      const user = await this.auth.signInWithGoogle();
      const account = await this.auth.getUserAccount(user.uid);
      if (!account) {
        await this.router.navigate(['/cadastro'], {
          queryParams: { redirectTo: this.redirectTo() },
        });
        return;
      }

      const redirectTo = this.redirectTo() || (await this.auth.getPostLoginRedirect(user.uid));
      await this.router.navigateByUrl(redirectTo);
    } catch (error) {
      this.errorMessage.set(this.auth.getFirebaseErrorMessage(error, 'login'));
    } finally {
      this.isGoogleSubmitting.set(false);
    }
  }

  private textValue(formData: FormData, key: string): string {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : '';
  }
}
