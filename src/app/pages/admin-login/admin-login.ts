import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AdminService } from '../../core/services/admin';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-admin-login',
  imports: [RouterLink],
  template: `
    <section class="admin-auth-page">
      <div class="admin-auth-panel">
        <div>
          <p class="eyebrow">Administração</p>
          <h1>Painel administrativo Cuidar+.</h1>
          <p class="lead">Acesso independente para revisão operacional e gestão interna.</p>
        </div>

        <form class="card card-body form-grid admin-auth-form" (submit)="onSubmit($event)">
          <label>Email<input name="email" type="email" required placeholder="admin@exemplo.pt" /></label>
          <label>Password<input name="password" type="password" required placeholder="A sua password" /></label>
          @if (errorMessage()) {
            <p class="form-message error-message" role="alert">{{ errorMessage() }}</p>
          }
          <button class="button" type="submit" [disabled]="isSubmitting()">
            {{ isSubmitting() ? 'A validar...' : 'Entrar no admin' }}
          </button>
          <a class="button-secondary" routerLink="/">Voltar ao site</a>
        </form>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100dvh;
        background:
          linear-gradient(135deg, rgba(245, 250, 242, 0.96), rgba(255, 255, 255, 0.88)),
          url("/images/passeio-acompanhado.jpg") center/cover;
      }

      .admin-auth-page {
        display: grid;
        min-height: 100dvh;
        place-items: center;
        padding: 32px;
      }

      .admin-auth-panel {
        display: grid;
        grid-template-columns: minmax(0, 0.9fr) minmax(320px, 440px);
        align-items: center;
        width: min(100%, 1040px);
        gap: 36px;
      }

      .admin-auth-form {
        background: rgba(255, 255, 255, 0.94);
      }

      @media (max-width: 760px) {
        .admin-auth-page {
          padding: 22px;
        }

        .admin-auth-panel {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminLoginComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly redirectTo = signal(this.route.snapshot.queryParamMap.get('redirectTo') || '/admin');

  async ngOnInit(): Promise<void> {
    const user = await this.auth.getCurrentUser();
    if (!user) {
      return;
    }

    const profile = await this.admin.getAdminProfile(user.uid).catch(() => null);
    if (this.admin.getPermissions(profile).canAccessAdmin) {
      await this.router.navigateByUrl(this.redirectTo());
      return;
    }

    await this.auth.signOut();
    this.errorMessage.set('Inicie sessão com uma conta administrativa.');
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
      const profile = await this.admin.getAdminProfile(user.uid);
      if (!this.admin.getPermissions(profile).canAccessAdmin) {
        await this.auth.signOut();
        this.errorMessage.set('Esta conta não tem permissão administrativa ativa.');
        return;
      }

      await this.router.navigateByUrl(this.redirectTo());
    } catch (error) {
      await this.auth.signOut().catch(() => undefined);
      this.errorMessage.set(this.auth.getFirebaseErrorMessage(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private textValue(formData: FormData, key: string): string {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : '';
  }
}
