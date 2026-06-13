import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Auth, UserAccount, UserPersonalData } from '../../core/services/auth';

@Component({
  selector: 'app-personal-data',
  imports: [RouterLink],
  template: `
    <section class="page hero hero-compact">
      <div>
        <p class="eyebrow">Meus dados pessoais</p>
        <h1>Dados da sua conta, identidade e localização.</h1>
        <p class="lead">Estes dados pertencem ao utilizador e podem ser usados nos perfis de família e cuidador.</p>
      </div>
    </section>

    <section class="page personal-data-page">
      <form class="card card-body personal-data-form" novalidate (submit)="onSubmit($event)">
        <section class="form-section">
          <div class="section-title">
            <span>1</span>
            <div>
              <h2>Dados de conta</h2>
              <p>Informação base da sua conta na plataforma.</p>
            </div>
          </div>
          <div class="form-grid two-columns">
            <label>Email <strong>*</strong><input type="email" name="email" required readonly [value]="email()" /></label>
          </div>
          <div class="check-stack">
            <label><input type="checkbox" name="acceptedTerms" required [checked]="account()?.acceptedTerms === true" /> Aceito os <a routerLink="/termos">Termos e Condições</a> <strong>*</strong></label>
            <label><input type="checkbox" name="acceptedPrivacy" required [checked]="account()?.acceptedPrivacy === true" /> Aceito a <a routerLink="/privacidade">Política de Privacidade</a> <strong>*</strong></label>
          </div>
        </section>

        <section class="form-section">
          <div class="section-title">
            <span>2</span>
            <div>
              <h2>Dados pessoais</h2>
              <p>Dados essenciais para identificação e contacto.</p>
            </div>
          </div>
          <div class="form-grid two-columns">
            <label>Nome completo <strong>*</strong><input name="fullName" required placeholder="Nome e apelido" [value]="value('fullName')" /></label>
            <label>Data de nascimento <strong>*</strong><input type="date" name="birthDate" required [value]="value('birthDate')" /></label>
            <label>Sexo <strong>*</strong>
              <select name="gender" required [value]="value('gender')">
                <option value="">Selecionar</option>
                <option>Feminino</option>
                <option>Masculino</option>
                <option>Outro</option>
                <option>Prefiro não indicar</option>
              </select>
            </label>
            <label>Nacionalidade <strong>*</strong><input name="nationality" required placeholder="Portuguesa" [value]="value('nationality')" /></label>
            <label>Telemóvel <strong>*</strong><input type="tel" name="phone" required placeholder="+351 900 000 000" [value]="value('phone')" /></label>
            <label>NIF <strong>*</strong> <small>privado</small><input name="nif" required inputmode="numeric" placeholder="Número de identificação fiscal" [value]="privateValue('nif')" /></label>
            <label>Tipo de documento <strong>*</strong>
              <select name="documentType" required [value]="privateValue('documentType')">
                <option value="">Selecionar</option>
                <option>Cartão de Cidadão</option>
                <option>Passaporte</option>
                <option>Título de residência</option>
                <option>Outro</option>
              </select>
            </label>
            <label>Documento de identificação <strong>*</strong> <small>privado</small><input name="idDocument" required placeholder="Número do documento" [value]="privateValue('idDocument')" /></label>
          </div>
        </section>

        <section class="form-section">
          <div class="section-title">
            <span>3</span>
            <div>
              <h2>Localização</h2>
              <p>Esta localização será usada pelos seus perfis na plataforma.</p>
            </div>
          </div>
          <div class="form-grid two-columns">
            <label>Distrito <strong>*</strong><input name="district" required placeholder="Lisboa" [value]="locationValue('district')" /></label>
            <label>Concelho <strong>*</strong><input name="county" required placeholder="Oeiras" [value]="locationValue('county')" /></label>
            <label>Código Postal <strong>*</strong><input name="postalCode" required placeholder="0000-000" [value]="privateValue('postalCode')" /></label>
            <label>Raio máximo de deslocação <strong>*</strong>
              <select name="travelRadius" required [value]="locationValue('travelRadius')">
                <option value="">Selecionar</option>
                <option>Até 5 km</option>
                <option>Até 10 km</option>
                <option>Até 15 km</option>
                <option>Até 20 km</option>
                <option>Até 25 km</option>
                <option>Até 30 km</option>
                <option>Até 40 km</option>
                <option>Até 50 km</option>
              </select>
            </label>
            <label class="span-2">Morada completa <small>privada</small><input name="address" placeholder="Rua, número, localidade" [value]="privateValue('address')" /></label>
          </div>
        </section>

        @if (errorMessage()) {
          <p class="form-message error-message" role="alert">{{ errorMessage() }}</p>
        }
        @if (redirectTo() && !successMessage()) {
          <p class="form-message info-message" role="status">
            Complete estes dados para continuar a criação ou edição do seu perfil.
          </p>
        }
        @if (successMessage()) {
          <p class="form-message success-message" role="status">{{ successMessage() }}</p>
        }

        <div class="form-actions">
          <button class="button" type="submit" [disabled]="isSubmitting()">
            {{ isSubmitting() ? 'A guardar...' : 'Guardar dados pessoais' }}
          </button>
        </div>
      </form>
    </section>
  `,
  styleUrl: './personal-data.scss',
})
export class PersonalDataComponent implements OnInit {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly account = signal<UserAccount | null>(null);
  protected readonly email = signal('');
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly redirectTo = signal(this.route.snapshot.queryParamMap.get('redirectTo') ?? '');

  async ngOnInit(): Promise<void> {
    const user = await this.auth.getCurrentUser();
    this.email.set(user?.email ?? '');
    if (!user) {
      return;
    }

    this.account.set(await this.auth.getUserAccount(user.uid));
  }

  protected async onSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.errorMessage.set('');
    this.successMessage.set('');

    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const validationMessage = this.getValidationMessage(form, formData);
    if (validationMessage) {
      this.errorMessage.set(validationMessage);
      return;
    }

    this.isSubmitting.set(true);
    try {
      await this.auth.updateUserPersonalData(this.buildPersonalData(formData));
      this.account.set(await this.auth.getUserAccount((await this.auth.getCurrentUser())?.uid ?? ''));
      if (this.redirectTo()) {
        await this.router.navigateByUrl(this.redirectTo());
        return;
      }

      this.successMessage.set('Dados pessoais guardados com sucesso.');
    } catch (error) {
      this.errorMessage.set(this.auth.getFirebaseErrorMessage(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected value(key: keyof UserAccount): string {
    const value = this.account()?.[key];
    return typeof value === 'string' ? value : '';
  }

  protected privateValue(key: 'nif' | 'documentType' | 'idDocument' | 'address' | 'postalCode'): string {
    return this.account()?.private?.[key] ?? '';
  }

  protected locationValue(key: 'district' | 'county' | 'travelRadius'): string {
    return this.account()?.location?.[key] ?? '';
  }

  private buildPersonalData(formData: FormData): UserPersonalData {
    return {
      email: this.textValue(formData, 'email'),
      fullName: this.textValue(formData, 'fullName'),
      birthDate: this.textValue(formData, 'birthDate'),
      gender: this.textValue(formData, 'gender'),
      nationality: this.textValue(formData, 'nationality'),
      phone: this.textValue(formData, 'phone'),
      acceptedTerms: formData.has('acceptedTerms'),
      acceptedPrivacy: formData.has('acceptedPrivacy'),
      private: {
        nif: this.textValue(formData, 'nif'),
        documentType: this.textValue(formData, 'documentType'),
        idDocument: this.textValue(formData, 'idDocument'),
        address: this.textValue(formData, 'address'),
        postalCode: this.textValue(formData, 'postalCode'),
      },
      location: {
        district: this.textValue(formData, 'district'),
        county: this.textValue(formData, 'county'),
        travelRadius: this.textValue(formData, 'travelRadius'),
      },
    };
  }

  private getValidationMessage(form: HTMLFormElement, formData: FormData): string {
    const requiredFields = [
      { key: 'acceptedTerms', label: 'Aceitação dos Termos e Condições', type: 'checkbox' },
      { key: 'acceptedPrivacy', label: 'Aceitação da Política de Privacidade', type: 'checkbox' },
      { key: 'fullName', label: 'Nome completo' },
      { key: 'birthDate', label: 'Data de nascimento', type: 'birthDate' },
      { key: 'gender', label: 'Sexo' },
      { key: 'nationality', label: 'Nacionalidade' },
      { key: 'phone', label: 'Telemóvel' },
      { key: 'nif', label: 'NIF' },
      { key: 'documentType', label: 'Tipo de documento' },
      { key: 'idDocument', label: 'Documento de identificação' },
      { key: 'district', label: 'Distrito' },
      { key: 'county', label: 'Concelho' },
      { key: 'postalCode', label: 'Código Postal' },
      { key: 'travelRadius', label: 'Raio máximo de deslocação' },
    ];

    for (const field of requiredFields) {
      if (field.type === 'checkbox' && !formData.has(field.key)) {
        return `${field.label} é obrigatório.`;
      }

      const value = this.textValue(formData, field.key);
      if (!field.type && !value) {
        return `${field.label} é obrigatório.`;
      }

      const control = form.elements.namedItem(field.key);
      if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
        if (!control.checkValidity()) {
          return this.controlValidationMessage(control, field.label);
        }
      }

      if (field.type === 'birthDate' && !this.isAdult(value)) {
        return 'É necessário ter pelo menos 18 anos.';
      }
    }

    return '';
  }

  private controlValidationMessage(control: HTMLInputElement | HTMLSelectElement, label: string): string {
    if (control.validity.valueMissing) {
      return `${label} é obrigatório.`;
    }
    if (control.validity.typeMismatch || control.validity.badInput) {
      return `${label} não está válido.`;
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

  private textValue(formData: FormData, key: string): string {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : '';
  }
}
