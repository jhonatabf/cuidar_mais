import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Auth } from '../../core/services/auth';
import { AppLocale, LocaleService } from '../../core/services/locale';
import { isValidPortugueseNif, normalizePortugueseNif } from '../../core/validators/portuguese-nif';

const REGISTER_COPY = {
  'pt-PT': {
    step: 'Etapa 1 de 3',
    stepName: 'Criação da conta',
    title: 'Crie uma conta para começar a sua jornada na wecareparents.',
    lead: 'Escolha o tipo de conta e indique os dados necessários para criar o seu acesso.',
    accountType: 'Tipo de conta',
    family: 'Família',
    caregiver: 'Cuidador',
    name: 'Nome completo',
    birthDate: 'Data de nascimento',
    private: 'privado',
    document: 'Documento de identificação',
    citizenCard: 'Cartão de Cidadão português',
    passport: 'Passaporte',
    residencePermit: 'Título de residência emitido em Portugal',
    type: 'Tipo',
    number: 'Número',
    select: 'Selecionar',
    other: 'Outro documento emitido em Portugal',
    password: 'Palavra-passe',
    passwordConfirmation: 'Confirmar palavra-passe',
    googleEmail: 'Email Google',
    googleAccountHelp: 'Entrou com Google. Usaremos este email e nome; preencha os restantes dados para continuar.',
    googleCreating: 'A criar com Google...',
    googleCreate: 'Criar conta com Google',
    separator: 'ou',
    createPassword: 'Crie uma palavra-passe',
    repeatPassword: 'Repita a palavra-passe',
    creating: 'A criar conta...',
    createAccount: 'Criar conta',
    existingAccount: 'Já tenho conta',
    close: 'Fechar mensagem',
  },
  'en-GB': {
    step: 'Step 1 of 3',
    stepName: 'Account creation',
    title: 'Create an account to begin your journey with wecareparents.',
    lead: 'Choose the account type and provide the details required to create your access.',
    accountType: 'Account type',
    family: 'Family',
    caregiver: 'Caregiver',
    name: 'Full name',
    birthDate: 'Date of birth',
    private: 'private',
    document: 'Identification document',
    citizenCard: 'Portuguese Citizen Card',
    passport: 'Passport',
    residencePermit: 'Residence permit issued in Portugal',
    type: 'Type',
    number: 'Number',
    select: 'Select',
    other: 'Other document issued in Portugal',
    password: 'Password',
    passwordConfirmation: 'Confirm password',
    googleEmail: 'Google email',
    googleAccountHelp: 'You signed in with Google. We will use this email and name; fill in the remaining details to continue.',
    googleCreating: 'Creating with Google...',
    googleCreate: 'Create account with Google',
    separator: 'or',
    createPassword: 'Create a password',
    repeatPassword: 'Repeat the password',
    creating: 'Creating account...',
    createAccount: 'Create account',
    existingAccount: 'I already have an account',
    close: 'Close message',
  },
} as const;

@Component({
  selector: 'app-register',
  imports: [RouterLink],
  template: `
    <section class="page hero hero-compact register-page">
      <div class="register-intro">
        <div class="registration-step" aria-label="Etapa 1 de 3: criação da conta">
          <span class="registration-step__number">1</span>
          <div>
            <strong>{{ copy().step }}</strong>
            <span>{{ copy().stepName }}</span>
          </div>
          <div class="registration-step__progress" aria-hidden="true">
            <span class="is-active"></span><span></span><span></span>
          </div>
        </div>
        <h1>{{ copy().title }}</h1>
        <p class="lead">{{ copy().lead }}</p>
      </div>
      <form class="card card-body form-grid register-form" [class.show-validation-errors]="hasSubmitted()" novalidate (submit)="onSubmit($event)">
        @if (!isGoogleAccount()) {
          <button class="btn btn-secondary google-auth-button" type="button" [disabled]="isGoogleSubmitting()" (click)="startGoogleSignup()">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" aria-hidden="true" />
            {{ isGoogleSubmitting() ? copy().googleCreating : copy().googleCreate }}
          </button>
          <div class="auth-separator"><span>{{ copy().separator }}</span></div>
        }
        <label><span class="label-line">{{ copy().accountType }} <strong>*</strong></span>
          <select name="accountType" required data-error-label="Tipo de conta">
            <option value="Familia">{{ copy().family }}</option>
            <option value="Cuidador">{{ copy().caregiver }}</option>
          </select>
        </label>
        @if (isGoogleAccount()) {
          <p class="form-message">{{ copy().googleAccountHelp }}</p>
        }
        <label><span class="label-line">{{ copy().name }} <strong>*</strong></span><input name="fullName" required data-error-label="Nome" [placeholder]="copy().name" [value]="googleName()" /></label>
        <label><span class="label-line">{{ copy().birthDate }} <strong>*</strong></span><input name="birthDate" type="date" required data-error-label="Data de nascimento" /></label>
        <label><span class="label-line">NIF <strong>*</strong> <small>{{ copy().private }}</small></span><input name="nif" required inputmode="numeric" autocomplete="off" data-error-label="NIF" placeholder="123456789" /></label>
        <fieldset class="document-fieldset">
          <legend>{{ copy().document }} <strong>*</strong> <small>{{ copy().private }}</small></legend>
          <label><span class="label-line">{{ copy().type }}</span>
            <select name="documentType" required data-error-label="Tipo de documento">
              <option value="">{{ copy().select }}</option>
              <option value="Cartão de Cidadão">{{ copy().citizenCard }}</option>
              <option value="Passaporte">{{ copy().passport }}</option>
              <option value="Título de residência">{{ copy().residencePermit }}</option>
              <option value="Outro">{{ copy().other }}</option>
            </select>
          </label>
          <label><span class="label-line">{{ copy().number }}</span><input name="idDocument" required data-error-label="Número do documento" [placeholder]="copy().number" /></label>
        </fieldset>
        <label>
          <span class="label-line">{{ isGoogleAccount() ? copy().googleEmail : 'Email' }} <strong>*</strong></span>
          <input name="email" type="email" required data-error-label="Email" placeholder="email@exemplo.pt" [readOnly]="isGoogleAccount()" [attr.aria-readonly]="isGoogleAccount()" [value]="googleEmail()" />
        </label>
        @if (!isGoogleAccount()) {
          <label><span class="label-line">{{ copy().password }} <strong>*</strong></span><input name="password" type="password" required minlength="6" autocomplete="new-password" data-error-label="Palavra-passe" [placeholder]="copy().createPassword" /></label>
          <label><span class="label-line">{{ copy().passwordConfirmation }} <strong>*</strong></span><input name="passwordConfirmation" type="password" required minlength="6" autocomplete="new-password" data-error-label="Confirmação da palavra-passe" [placeholder]="copy().repeatPassword" /></label>
        }
        <button class="btn btn-register" type="submit" [disabled]="isSubmitting()">
          {{ isSubmitting() ? copy().creating : copy().createAccount }}
        </button>
        <a class="btn btn-login" routerLink="/login" [queryParams]="{ redirectTo: redirectTo() }">{{ copy().existingAccount }}</a>
      </form>
    </section>
    @if (errorMessage()) {
      <div class="snackbar snackbar--error" role="alert" aria-live="polite">
        <span class="material-symbols-rounded snackbar__icon" aria-hidden="true">error</span>
        <p>{{ errorMessage() }}</p>
        <button type="button" [attr.aria-label]="copy().close" (click)="closeSnackbar()">
          <span class="material-symbols-rounded" aria-hidden="true">close</span>
        </button>
      </div>
    }
  `,
  styleUrl: './register.scss',
})
export class RegisterComponent implements OnInit {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly localeService = inject(LocaleService);

  protected readonly isSubmitting = signal(false);
  protected readonly isGoogleSubmitting = signal(false);
  protected readonly hasSubmitted = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly redirectTo = signal(this.route.snapshot.queryParamMap.get('redirectTo') ?? '');
  protected readonly isGoogleAccount = signal(false);
  protected readonly googleEmail = signal('');
  protected readonly googleName = signal('');
  protected copy(): (typeof REGISTER_COPY)[AppLocale] {
    return REGISTER_COPY[this.localeService.locale()];
  }

  async ngOnInit(): Promise<void> {
    const user = await this.auth.getCurrentUser();
    if (!user) {
      return;
    }

    const account = await this.auth.getUserAccount(user.uid);
    const isGoogleUser = user.providerData.some((provider) => provider.providerId === 'google.com');
    if (!account && isGoogleUser) {
      this.isGoogleAccount.set(true);
      this.googleEmail.set(user.email ?? '');
      this.googleName.set(user.displayName ?? '');
    }
  }

  protected async startGoogleSignup(): Promise<void> {
    this.errorMessage.set('');
    this.isGoogleSubmitting.set(true);
    try {
      const user = await this.auth.signInWithGoogle();
      const account = await this.auth.getUserAccount(user.uid);
      if (account) {
        await this.router.navigateByUrl(this.redirectTo() || (await this.auth.getPostLoginRedirect(user.uid)));
        return;
      }

      this.isGoogleAccount.set(true);
      this.googleEmail.set(user.email ?? '');
      this.googleName.set(user.displayName ?? '');
    } catch (error) {
      this.errorMessage.set(this.auth.getFirebaseErrorMessage(error, 'register'));
    } finally {
      this.isGoogleSubmitting.set(false);
    }
  }

  protected async onSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.errorMessage.set('');
    this.hasSubmitted.set(true);

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
      const fallback = accountType === 'Cuidador' ? '/seja-cuidador' : '/dashboard/familia';
      if (this.isGoogleAccount()) {
        const user = await this.auth.completeGoogleAccount({
          accountType,
          fullName: this.textValue(formData, 'fullName'),
          birthDate: this.textValue(formData, 'birthDate'),
          nif: normalizePortugueseNif(this.textValue(formData, 'nif')),
          documentType: this.textValue(formData, 'documentType'),
          idDocument: this.textValue(formData, 'idDocument'),
        });
        await this.router.navigateByUrl(this.redirectTo() || (await this.auth.getPostLoginRedirect(user.uid)));
      } else {
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

        await this.router.navigate(['/verificar-email'], {
          queryParams: { redirectTo: this.redirectTo() || fallback },
        });
      }
    } catch (error) {
      this.errorMessage.set(this.auth.getFirebaseErrorMessage(error, 'register'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected closeSnackbar(): void {
    this.errorMessage.set('');
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

    if (this.isGoogleAccount()) {
      return '';
    }

    const password = form.elements.namedItem('password');
    const passwordConfirmation = form.elements.namedItem('passwordConfirmation');
    if (
      password instanceof HTMLInputElement &&
      passwordConfirmation instanceof HTMLInputElement &&
      password.value !== passwordConfirmation.value
    ) {
      return 'A confirmação da palavra-passe deve ser igual à palavra-passe.';
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
