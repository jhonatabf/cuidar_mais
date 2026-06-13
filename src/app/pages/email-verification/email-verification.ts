import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-email-verification',
  imports: [RouterLink],
  template: `
    <section class="page hero hero-compact">
      <div>
        <p class="eyebrow">Confirmação de email</p>
        <h1>Confirme o seu email para continuar.</h1>
        <p class="lead">
          Enviámos uma mensagem para o email da conta. Abra o email e confirme o endereço antes de avançar.
        </p>
      </div>

      <div class="card card-body verification-card">
        <p>
          Depois de confirmar no email, volte a esta página e clique em
          <strong>Já confirmei o email</strong>.
        </p>

        @if (message()) {
          <p class="form-message success-message" role="status">{{ message() }}</p>
        }
        @if (errorMessage()) {
          <p class="form-message error-message" role="alert">{{ errorMessage() }}</p>
        }

        <div class="verification-actions">
          <button class="button" type="button" (click)="confirmEmail()" [disabled]="isChecking()">
            {{ isChecking() ? 'A verificar...' : 'Já confirmei o email' }}
          </button>
          <button class="button-secondary" type="button" (click)="resendEmail()" [disabled]="isSending()">
            {{ isSending() ? 'A reenviar...' : 'Reenviar email' }}
          </button>
          <a class="button-secondary" routerLink="/login" [queryParams]="{ redirectTo: redirectTo() }">
            Voltar ao login
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
  `,
})
export class EmailVerificationComponent {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly redirectTo = signal(this.route.snapshot.queryParamMap.get('redirectTo') ?? '/');
  protected readonly message = signal('');
  protected readonly errorMessage = signal('');
  protected readonly isChecking = signal(false);
  protected readonly isSending = signal(false);

  protected async confirmEmail(): Promise<void> {
    this.message.set('');
    this.errorMessage.set('');
    this.isChecking.set(true);

    try {
      const isVerified = await this.auth.refreshCurrentUserEmailVerification();
      if (!isVerified) {
        this.errorMessage.set('O email ainda não aparece como confirmado. Verifique a sua caixa de entrada e tente novamente.');
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
      this.message.set('Email de confirmação reenviado.');
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
