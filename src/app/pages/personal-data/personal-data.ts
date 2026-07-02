import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';

import {
  Auth,
  UserAccount,
  UserPersonalData,
  UserPrivateDocumentKind,
  UserPrivateDocumentUpload,
} from '../../core/services/auth';
import { isValidPortugueseNif, normalizePortugueseNif } from '../../core/validators/portuguese-nif';

const PRIVATE_DOCUMENT_MAX_FILE_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-personal-data',
  imports: [RouterLink],
  template: `
    <section class="page hero hero-compact personal-data-hero" [class.required-step]="isRequiredStep()">
      <div>
        <p class="eyebrow">{{ isRequiredStep() ? 'Conclusão obrigatória' : 'Meus dados pessoais' }}</p>
        <h1>{{ pageTitle() }}</h1>
        <p class="lead">{{ pageLead() }}</p>
        @if (isRequiredStep()) {
          <p class="required-note">
            Preencha os campos obrigatórios abaixo. Depois de guardar, continuará automaticamente para a próxima etapa.
          </p>
        }
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
            <label><span class="label-line">Email <strong>*</strong></span><input type="email" name="email" required readonly [value]="email()" /></label>
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
            <label><span class="label-line">Nome completo <strong>*</strong></span><input name="fullName" required placeholder="Nome e apelido" [value]="value('fullName')" /></label>
            <label><span class="label-line">Data de nascimento <strong>*</strong></span><input type="date" name="birthDate" required [value]="value('birthDate')" /></label>
            <label><span class="label-line">Sexo <strong>*</strong></span>
              <select name="gender" required [value]="value('gender')">
                <option value="">Selecionar</option>
                <option>Feminino</option>
                <option>Masculino</option>
                <option>Outro</option>
                <option>Prefiro não indicar</option>
              </select>
            </label>
            <label><span class="label-line">Nacionalidade <strong>*</strong></span><input name="nationality" required placeholder="Portuguesa" [value]="value('nationality')" /></label>
            <fieldset class="paired-fieldset span-2">
              <legend>Contacto telefónico <strong>*</strong></legend>
              <div class="paired-fields phone-fields">
                <label><span class="label-line">Indicativo</span>
                  <select name="phoneCountry" required [value]="phoneCountry()" (change)="onPhoneCountryChange($event)">
                    @for (country of phoneCountries; track country.code) {
                      <option [value]="country.code">{{ country.name }} (+{{ country.callingCode }})</option>
                    }
                  </select>
                </label>
                <label><span class="label-line">Telemóvel</span>
                  <input
                    type="tel"
                    name="phone"
                    required
                    inputmode="tel"
                    autocomplete="tel-national"
                    placeholder="912 345 678"
                    [value]="nationalPhone()"
                  />
                </label>
              </div>
            </fieldset>
            <label><span class="label-line">NIF <strong>*</strong> <small>privado</small></span><input name="nif" required inputmode="numeric" autocomplete="off" placeholder="123456789" [value]="privateValue('nif')" /></label>
            <fieldset class="paired-fieldset span-2">
              <legend>Documento de identificação <strong>*</strong> <small>privado</small></legend>
              <div class="paired-fields document-fields">
                <label>Tipo
                  <select name="documentType" required [value]="documentType()" (change)="onDocumentTypeChange($event)">
                    <option value="">Selecionar</option>
                    <option>Cartão de Cidadão</option>
                    <option>Passaporte</option>
                    <option>Título de residência</option>
                    <option>Outro</option>
                  </select>
                </label>
                <label>Número
                  <input name="idDocument" required placeholder="Número do documento" [value]="privateValue('idDocument')" />
                </label>
              </div>
              <div class="document-upload-grid">
                <label><span class="label-line">Foto da frente <strong>*</strong></span>
                  <input type="file" name="identityFront" accept="image/*" (change)="onPrivateDocumentFileChange($event)" />
                  @if (documentFileName('identityFront')) {
                    <small class="field-hint">Ficheiro atual: {{ documentFileName('identityFront') }}</small>
                  }
                </label>
                @if (!isPassportDocument()) {
                  <label><span class="label-line">Foto do verso <strong>*</strong></span>
                    <input type="file" name="identityBack" accept="image/*" (change)="onPrivateDocumentFileChange($event)" />
                    @if (documentFileName('identityBack')) {
                      <small class="field-hint">Ficheiro atual: {{ documentFileName('identityBack') }}</small>
                    }
                  </label>
                }
              </div>
            </fieldset>
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
            <label><span class="label-line">Distrito <strong>*</strong></span><input name="district" required placeholder="Lisboa" [value]="locationValue('district')" /></label>
            <label><span class="label-line">Concelho <strong>*</strong></span><input name="county" required placeholder="Oeiras" [value]="locationValue('county')" /></label>
            <label><span class="label-line">Código Postal <strong>*</strong></span><input name="postalCode" required placeholder="0000-000" [value]="privateValue('postalCode')" /></label>
            <label class="span-2"><span class="label-line">Morada completa <small>privada</small></span><input name="address" placeholder="Rua, número, localidade" [value]="privateValue('address')" /></label>
            <label class="span-2"><span class="label-line">Foto do comprovativo de morada <strong>*</strong> <small>privado</small></span>
              <input type="file" name="addressProof" accept="image/*" (change)="onPrivateDocumentFileChange($event)" />
              @if (documentFileName('addressProof')) {
                <small class="field-hint">Ficheiro atual: {{ documentFileName('addressProof') }}</small>
              }
            </label>
          </div>
        </section>

        <section class="form-section">
          <div class="section-title">
            <span>4</span>
            <div>
              <h2>Registo criminal</h2>
              <p>Declaração e comprovativo necessários para validação de segurança.</p>
            </div>
          </div>
          <div class="check-stack">
            <label><input type="checkbox" name="criminalRecordNoPending" required [checked]="account()?.private?.criminalRecordNoPending === true" /> Declaro que não possuo qualquer pendência criminal <strong>*</strong></label>
          </div>
          <div class="form-grid two-columns">
            <label class="span-2"><span class="label-line">Foto do atestado de criminalidade <strong>*</strong> <small>privado</small></span>
              <input type="file" name="criminalRecordCertificate" accept="image/*" (change)="onPrivateDocumentFileChange($event)" />
              @if (documentFileName('criminalRecordCertificate')) {
                <small class="field-hint">Ficheiro atual: {{ documentFileName('criminalRecordCertificate') }}</small>
              }
            </label>
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
  protected readonly phoneCountry = signal<CountryCode>('PT');
  protected readonly nationalPhone = signal('');
  protected readonly documentType = signal('');
  protected readonly phoneCountries = getCountries()
    .map((code) => ({
      code,
      name: this.countryDisplayName(code),
      callingCode: getCountryCallingCode(code),
    }))
    .sort((first, second) => {
      if (first.code === 'PT') return -1;
      if (second.code === 'PT') return 1;
      return first.name.localeCompare(second.name, 'pt-PT');
    });
  protected readonly isRequiredStep = computed(() => !!this.redirectTo());
  protected readonly pageTitle = computed(() =>
    this.isRequiredStep()
      ? 'Conclua os seus dados pessoais para continuar.'
      : 'Dados da sua conta, identidade e localização.',
  );
  protected readonly pageLead = computed(() =>
    this.isRequiredStep()
      ? 'Esta etapa é necessária antes de criar ou editar um perfil na Cuidar+.'
      : 'Estes dados pertencem ao utilizador e podem ser usados nos perfis de família e cuidador.',
  );

  async ngOnInit(): Promise<void> {
    const user = await this.auth.getCurrentUser();
    this.email.set(user?.email ?? '');
    if (!user) {
      return;
    }

    const account = await this.auth.getUserAccount(user.uid);
    this.account.set(account);
    this.documentType.set(account?.private?.documentType ?? '');
    this.loadPhone(account);
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
      await this.auth.updateUserPersonalData(await this.buildPersonalData(formData));
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

  protected locationValue(key: 'district' | 'county'): string {
    return this.account()?.location?.[key] ?? '';
  }

  protected onPhoneCountryChange(event: Event): void {
    this.phoneCountry.set((event.target as HTMLSelectElement).value as CountryCode);
  }

  protected onDocumentTypeChange(event: Event): void {
    this.documentType.set((event.target as HTMLSelectElement).value);
  }

  protected isPassportDocument(): boolean {
    return this.documentType() === 'Passaporte';
  }

  protected documentFileName(kind: UserPrivateDocumentKind): string {
    return this.account()?.private?.documents?.[kind]?.fileName ?? '';
  }

  protected onPrivateDocumentFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.errorMessage.set('');

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Os comprovativos devem ser enviados como imagem.');
      input.value = '';
      return;
    }

    if (file.size > PRIVATE_DOCUMENT_MAX_FILE_BYTES) {
      this.errorMessage.set('Cada imagem deve ter no máximo 5 MB.');
      input.value = '';
    }
  }

  private async buildPersonalData(formData: FormData): Promise<UserPersonalData> {
    const phoneCountry = this.textValue(formData, 'phoneCountry') as CountryCode;
    const phoneNational = this.textValue(formData, 'phone');

    return {
      email: this.textValue(formData, 'email'),
      fullName: this.textValue(formData, 'fullName'),
      birthDate: this.textValue(formData, 'birthDate'),
      gender: this.textValue(formData, 'gender'),
      nationality: this.textValue(formData, 'nationality'),
      phone: this.normalizedPhone(formData),
      phoneCountry,
      phoneCallingCode: `+${getCountryCallingCode(phoneCountry)}`,
      phoneNational,
      acceptedTerms: formData.has('acceptedTerms'),
      acceptedPrivacy: formData.has('acceptedPrivacy'),
      private: {
        nif: normalizePortugueseNif(this.textValue(formData, 'nif')),
        documentType: this.textValue(formData, 'documentType'),
        idDocument: this.textValue(formData, 'idDocument'),
        address: this.textValue(formData, 'address'),
        postalCode: this.textValue(formData, 'postalCode'),
        criminalRecordNoPending: formData.has('criminalRecordNoPending'),
        documents: this.account()?.private?.documents ?? {},
        documentUploads: await this.privateDocumentUploads(formData),
      },
      location: {
        district: this.textValue(formData, 'district'),
        county: this.textValue(formData, 'county'),
      },
    };
  }

  private getValidationMessage(form: HTMLFormElement, formData: FormData): string {
    const requiredFields = [
      { key: 'acceptedTerms', label: 'Aceitação dos Termos e Condições', type: 'checkbox' },
      { key: 'acceptedPrivacy', label: 'Aceitação da Política de Privacidade', type: 'checkbox' },
      { key: 'criminalRecordNoPending', label: 'Declaração de inexistência de pendência criminal', type: 'checkbox' },
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

      if (field.key === 'phone' && !this.isValidPhone(formData)) {
        return 'Introduza um número de telemóvel válido para o indicativo selecionado.';
      }

      if (field.key === 'nif' && !isValidPortugueseNif(value)) {
        return 'Introduza um NIF português válido com 9 dígitos.';
      }
    }

    const documentValidationMessage = this.getPrivateDocumentsValidationMessage(formData);
    if (documentValidationMessage) {
      return documentValidationMessage;
    }

    return '';
  }

  private getPrivateDocumentsValidationMessage(formData: FormData): string {
    const requiredDocuments: Array<{ key: UserPrivateDocumentKind; label: string }> = [
      { key: 'identityFront', label: 'Foto da frente do documento' },
      { key: 'addressProof', label: 'Foto do comprovativo de morada' },
      { key: 'criminalRecordCertificate', label: 'Foto do atestado de criminalidade' },
    ];

    if (this.textValue(formData, 'documentType') !== 'Passaporte') {
      requiredDocuments.splice(1, 0, { key: 'identityBack', label: 'Foto do verso do documento' });
    }

    for (const document of requiredDocuments) {
      const file = formData.get(document.key);
      const existingDocument = this.account()?.private?.documents?.[document.key];
      if (!(file instanceof File) || !file.name) {
        if (!existingDocument) {
          return `${document.label} é obrigatória.`;
        }
        continue;
      }

      if (!file.type.startsWith('image/')) {
        return `${document.label} deve ser uma imagem.`;
      }
      if (file.size > PRIVATE_DOCUMENT_MAX_FILE_BYTES) {
        return `${document.label} deve ter no máximo 5 MB.`;
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

  private loadPhone(account: UserAccount | null): void {
    if (account?.phoneCountry && account.phoneNational) {
      this.phoneCountry.set(account.phoneCountry as CountryCode);
      this.nationalPhone.set(account.phoneNational);
      return;
    }

    const parsedPhone = parsePhoneNumberFromString(account?.phone ?? '');
    if (parsedPhone?.country) {
      this.phoneCountry.set(parsedPhone.country);
      this.nationalPhone.set(parsedPhone.nationalNumber);
      return;
    }

    this.nationalPhone.set(account?.phone ?? '');
  }

  private normalizedPhone(formData: FormData): string {
    const country = this.textValue(formData, 'phoneCountry') as CountryCode;
    const phone = parsePhoneNumberFromString(this.textValue(formData, 'phone'), country);
    return phone?.number ?? '';
  }

  private isValidPhone(formData: FormData): boolean {
    const country = this.textValue(formData, 'phoneCountry') as CountryCode;
    const phone = parsePhoneNumberFromString(this.textValue(formData, 'phone'), country);
    return !!phone && phone.country === country && phone.isValid();
  }

  private countryDisplayName(country: CountryCode): string {
    return new Intl.DisplayNames(['pt-PT'], { type: 'region' }).of(country) ?? country;
  }

  private async privateDocumentUploads(
    formData: FormData,
  ): Promise<Partial<Record<UserPrivateDocumentKind, UserPrivateDocumentUpload>>> {
    const uploads: Partial<Record<UserPrivateDocumentKind, UserPrivateDocumentUpload>> = {};
    const kinds: UserPrivateDocumentKind[] = [
      'identityFront',
      'identityBack',
      'addressProof',
      'criminalRecordCertificate',
    ];

    for (const kind of kinds) {
      const file = formData.get(kind);
      if (!(file instanceof File) || !file.name) {
        continue;
      }

      uploads[kind] = await this.privateDocumentUploadValue(file);
    }

    return uploads;
  }

  private async privateDocumentUploadValue(file: File): Promise<UserPrivateDocumentUpload> {
    const blob = await this.compressPrivateDocumentImage(file);
    return {
      name: file.name,
      contentType: 'image/jpeg',
      originalSize: file.size,
      compressedSize: blob.size,
      blob,
    };
  }

  private async compressPrivateDocumentImage(file: File): Promise<Blob> {
    const dataUrl = await this.readFileAsDataUrl(file);
    const image = await this.loadImage(dataUrl);
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Não foi possível otimizar a imagem.');
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return this.canvasToJpegBlob(canvas, 0.82);
  }

  private canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
            return;
          }

          reject(new Error('Não foi possível processar a imagem.'));
        },
        'image/jpeg',
        quality,
      );
    });
  }

  private loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      image.src = dataUrl;
    });
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('Não foi possível ler o ficheiro.'));
      reader.readAsDataURL(file);
    });
  }

  private textValue(formData: FormData, key: string): string {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : '';
  }
}
