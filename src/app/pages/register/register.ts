import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Auth } from '../../core/services/auth';
import { isValidPortugueseNif, normalizePortugueseNif } from '../../core/validators/portuguese-nif';

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
      <form class="card card-body form-grid" novalidate (submit)="onSubmit($event)">
        <label><span class="label-line">Tipo de conta <strong>*</strong></span>
          <select name="accountType" required data-error-label="Tipo de conta">
            <option>Familia</option>
            <option>Cuidador</option>
          </select>
        </label>
        <label><span class="label-line">Nome <strong>*</strong></span><input name="fullName" required data-error-label="Nome" placeholder="Nome completo" /></label>
        <label><span class="label-line">Data de nascimento <strong>*</strong></span><input name="birthDate" type="date" required data-error-label="Data de nascimento" /></label>
        <label><span class="label-line">NIF <strong>*</strong> <small>privado</small></span><input name="nif" required inputmode="numeric" autocomplete="off" data-error-label="NIF" placeholder="123456789" /></label>
        <fieldset class="document-fieldset">
          <legend>Documento de identificação <strong>*</strong> <small>privado</small></legend>
          <label><span class="label-line">Tipo</span>
            <select name="documentType" required data-error-label="Tipo de documento">
              <option value="">Selecionar</option>
              <option>Cartão de Cidadão</option>
              <option>Passaporte</option>
              <option>Título de residência</option>
              <option>Outro</option>
            </select>
          </label>
          <label><span class="label-line">Número</span><input name="idDocument" required data-error-label="Número do documento" placeholder="Número do documento" /></label>
        </fieldset>
        <label><span class="label-line">Email <strong>*</strong></span><input name="email" type="email" required data-error-label="Email" placeholder="email@exemplo.pt" /></label>
        <label><span class="label-line">Password <strong>*</strong></span><input name="password" type="password" required minlength="6" data-error-label="Password" placeholder="Crie uma password" /></label>
        @if (errorMessage()) {
          <p class="form-message error-message" role="alert">{{ errorMessage() }}</p>
        }
        <button class="btn btn-register" type="submit" [disabled]="isSubmitting()">
          {{ isSubmitting() ? 'A criar conta...' : 'Criar conta' }}
        </button>
        <a class="btn btn-login" routerLink="/login" [queryParams]="{ redirectTo: redirectTo() }">Ja tenho conta</a>
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
    const validationMessage = this.getValidationMessage(form);
    if (validationMessage) {
      this.errorMessage.set(validationMessage);
      return;
    }

    const formData = new FormData(form);
    const accountType = this.textValue(formData, 'accountType');
    this.isSubmitting.set(true);
    try {
      await this.auth.registerAccount({
        accountType,
        fullName: this.textValue(formData, 'fullName'),
        birthDate: this.textValue(formData, 'birthDate'),
        nif: normalizePortugueseNif(this.textValue(formData, 'nif')),
        documentType: this.textValue(formData, 'documentType'),
        idDocument: this.textValue(formData, 'idDocument'),
        email: this.textValue(formData, 'email'),
        password: this.textValue(formData, 'password'),
      });

      const fallback = accountType === 'Cuidador' ? '/seja-cuidador' : '/dashboard/familia';
      await this.router.navigate(['/verificar-email'], {
        queryParams: { redirectTo: this.redirectTo() || fallback },
      });
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

  private getValidationMessage(form: HTMLFormElement): string {
    const controls = Array.from(form.elements).filter(
      (element): element is HTMLInputElement | HTMLSelectElement =>
        element instanceof HTMLInputElement || element instanceof HTMLSelectElement,
    );

    for (const control of controls) {
      if (!control.checkValidity()) {
        return this.controlValidationMessage(control);
      }

      if (control.name === 'birthDate' && !this.isAdult(control.value)) {
        return 'É necessário ter pelo menos 18 anos para se cadastrar.';
      }

      if (control.name === 'nif' && !isValidPortugueseNif(control.value)) {
        return 'Introduza um NIF português válido com 9 dígitos.';
      }
    }

    return '';
  }

  private controlValidationMessage(control: HTMLInputElement | HTMLSelectElement): string {
    const label = control.dataset['errorLabel'] ?? 'Campo';
    if (control.validity.valueMissing) {
      return `${label} é obrigatório.`;
    }
    if (control.validity.typeMismatch) {
      return `${label} não está válido.`;
    }
    if (control.validity.tooShort) {
      return `${label} deve ter pelo menos ${control.getAttribute('minlength')} caracteres.`;
    }

    return `${label} não está válido.`;
  }

  private isAdult(value: string): boolean {
    if (!value) {
      return false;
    }

    const birthDate = new Date(`${value}T00:00:00`);
    if (Number.isNaN(birthDate.getTime())) {
      return false;
    }

    const today = new Date();
    const adultDate = new Date(birthDate);
    adultDate.setFullYear(adultDate.getFullYear() + 18);
    return adultDate <= today;
  }
}
