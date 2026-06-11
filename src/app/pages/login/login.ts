import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  template: `
    <section class="page hero hero-compact">
      <div>
        <p class="eyebrow">Login</p>
        <h1>Entre para acompanhar os seus cuidados.</h1>
        <p class="lead">Acesso para familias, cuidadores e equipa operacional.</p>
      </div>
      <form class="card card-body form-grid" (submit)="onSubmit($event)">
        <label>Email<input name="email" type="email" required placeholder="email@exemplo.pt" /></label>
        <label>Password<input name="password" type="password" required placeholder="A sua password" /></label>
        @if (errorMessage()) {
          <p class="form-message error-message" role="alert">{{ errorMessage() }}</p>
        }
        <button class="button" type="submit" [disabled]="isSubmitting()">
          {{ isSubmitting() ? 'A entrar...' : 'Entrar' }}
        </button>
        <a class="button-secondary" routerLink="/cadastro" [queryParams]="{ redirectTo: redirectTo() }">Criar conta</a>
      </form>
    </section>
  `,
})
export class LoginComponent {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly redirectTo = signal(this.route.snapshot.queryParamMap.get('redirectTo') ?? '');

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
      await this.router.navigateByUrl(this.redirectTo() || (await this.auth.getPostLoginRedirect(user.uid)));
    } catch (error) {
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
