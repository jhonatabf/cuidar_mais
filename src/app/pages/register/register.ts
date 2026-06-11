import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-register',
  imports: [RouterLink],
  template: `
    <section class="page hero hero-compact">
      <div>
        <p class="eyebrow">Cadastro</p>
        <h1>Crie uma conta para comecar a sua jornada na CuidarPlus.</h1>
        <p class="lead">Escolha o tipo de conta e complete os dados essenciais do MVP.</p>
      </div>
      <form class="card card-body form-grid" (submit)="onSubmit($event)">
        <label>Tipo de conta
          <select name="accountType" required>
            <option>Familia</option>
            <option>Cuidador</option>
          </select>
        </label>
        <label>Nome<input name="fullName" required placeholder="Nome completo" /></label>
        <label>Email<input name="email" type="email" required placeholder="email@exemplo.pt" /></label>
        <label>Password<input name="password" type="password" required minlength="6" placeholder="Crie uma password" /></label>
        @if (errorMessage()) {
          <p class="form-message error-message" role="alert">{{ errorMessage() }}</p>
        }
        <button class="button" type="submit" [disabled]="isSubmitting()">
          {{ isSubmitting() ? 'A criar conta...' : 'Criar conta' }}
        </button>
        <a class="button-secondary" routerLink="/login" [queryParams]="{ redirectTo: redirectTo() }">Ja tenho conta</a>
      </form>
    </section>
  `,
})
export class RegisterComponent {
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
    const accountType = this.textValue(formData, 'accountType');
    this.isSubmitting.set(true);
    try {
      await this.auth.registerAccount({
        accountType,
        fullName: this.textValue(formData, 'fullName'),
        email: this.textValue(formData, 'email'),
        password: this.textValue(formData, 'password'),
      });

      const fallback = accountType === 'Cuidador' ? '/seja-cuidador' : '/dashboard/familia';
      await this.router.navigateByUrl(this.redirectTo() || fallback);
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
