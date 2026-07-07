import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Auth } from '../../core/services/auth';
import { AppLocale, LocaleService } from '../../core/services/locale';

const EMAIL_VERIFICATION_COPY = {
  'pt-PT': {
    eyebrow: 'Confirmação de email',
    title: 'Confirme o seu email para continuar.',
    leadBeforeEmail: 'Enviámos uma mensagem de confirmação para',
    fallbackEmail: 'o email associado à sua conta',
    leadAfterEmail: 'Abra o email e confirme o endereço antes de avançar.',
    instructionsBeforeAction: 'Depois de confirmar no email, volte a esta página e clique em',
    confirmAction: 'Já confirmei o email',
    checking: 'A verificar...',
    resend: 'Reenviar email',
    resending: 'A reenviar...',
    backToLogin: 'Voltar ao login',
    unverified: 'O email ainda não aparece como confirmado. Verifique a sua caixa de entrada e tente novamente.',
    resent: 'Email de confirmação reenviado para',
    fallbackAccountEmail: 'o email da conta',
  },
  'en-GB': {
    eyebrow: 'Email confirmation',
    title: 'Confirm your email to continue.',
    leadBeforeEmail: 'We sent a confirmation message to',
    fallbackEmail: 'the email associated with your account',
    leadAfterEmail: 'Open the email and confirm the address before continuing.',
    instructionsBeforeAction: 'After confirming it by email, return to this page and click',
    confirmAction: 'I have confirmed my email',
    checking: 'Checking...',
    resend: 'Resend email',
    resending: 'Resending...',
    backToLogin: 'Back to sign in',
    unverified: 'The email does not appear to be confirmed yet. Check your inbox and try again.',
    resent: 'Confirmation email resent to',
    fallbackAccountEmail: 'the account email',
  },
} as const;

@Component({
  selector: 'app-email-verification',
  imports: [RouterLink],
  template: `
    <section class="page hero hero-compact">
      <div>
        <p class="eyebrow">{{ copy().eyebrow }}</p>
        <h1>{{ copy().title }}</h1>
        <p class="lead">
          {{ copy().leadBeforeEmail }}
          <strong class="verification-email">{{ email() || copy().fallbackEmail }}</strong>.
          {{ copy().leadAfterEmail }}
        </p>
      </div>

      <div class="card card-body verification-card">
        <p>
          {{ copy().instructionsBeforeAction }}
          <strong>{{ copy().confirmAction }}</strong>.
        </p>

        @if (message()) {
          <p class="form-message success-message" role="status">{{ message() }}</p>
        }
        @if (errorMessage()) {
          <p class="form-message error-message" role="alert">{{ errorMessage() }}</p>
        }

        <div class="verification-actions">
          <button class="button" type="button" (click)="confirmEmail()" [disabled]="isChecking()">
            {{ isChecking() ? copy().checking : copy().confirmAction }}
          </button>
          <button class="button-secondary" type="button" (click)="resendEmail()" [disabled]="isSending()">
            {{ isSending() ? copy().resending : copy().resend }}
          </button>
          <a class="button-secondary" routerLink="/login" [queryParams]="{ redirectTo: redirectTo() }">
            {{ copy().backToLogin }}
          </a>
        </div>
      </div>
    </section>
  `,
  styles: `
    .verification-card {
      align-self: start;
      max-width: 520px;
    }

    .verification-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 10px;
    }

    .verification-email {
      color: var(--color-primary);
      overflow-wrap: anywhere;
    }
  `,
})
export class EmailVerificationComponent implements OnInit {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly localeService = inject(LocaleService);

  protected readonly redirectTo = signal(this.route.snapshot.queryParamMap.get('redirectTo') ?? '/');
  protected readonly email = signal('');
  protected readonly message = signal('');
  protected readonly errorMessage = signal('');
  protected readonly isChecking = signal(false);
  protected readonly isSending = signal(false);

  protected copy(): (typeof EMAIL_VERIFICATION_COPY)[AppLocale] {
    return EMAIL_VERIFICATION_COPY[this.localeService.locale()];
  }

  async ngOnInit(): Promise<void> {
    this.email.set((await this.auth.getCurrentUser())?.email ?? '');
  }

  protected async confirmEmail(): Promise<void> {
    this.message.set('');
    this.errorMessage.set('');
    this.isChecking.set(true);

    try {
      const isVerified = await this.auth.refreshCurrentUserEmailVerification();
      if (!isVerified) {
        this.errorMessage.set(this.copy().unverified);
        return;
      }

      await this.router.navigateByUrl(await this.nextRouteAfterVerification());
    } catch (error) {
      this.errorMessage.set(this.auth.getFirebaseErrorMessage(error));
    } finally {
      this.isChecking.set(false);
    }
  }

  protected async resendEmail(): Promise<void> {
    this.message.set('');
    this.errorMessage.set('');
    this.isSending.set(true);

    try {
      await this.auth.sendCurrentUserEmailVerification();
      this.message.set(`${this.copy().resent} ${this.email() || this.copy().fallbackAccountEmail}.`);
    } catch (error) {
      this.errorMessage.set(this.auth.getFirebaseErrorMessage(error));
    } finally {
      this.isSending.set(false);
    }
  }

  private async nextRouteAfterVerification(): Promise<string> {
    const redirectTo = this.redirectTo();
    const user = await this.auth.getCurrentUser();
    if (!user) {
      return '/login';
    }

    if (redirectTo && redirectTo !== '/') {
      const account = await this.auth.getUserAccount(user.uid);
      if (!this.auth.hasCompletePersonalData(account)) {
        return `/meus-dados-pessoais?redirectTo=${encodeURIComponent(redirectTo)}`;
      }

      return redirectTo;
    }

    return this.auth.getPostLoginRedirect(user.uid);
  }
}
