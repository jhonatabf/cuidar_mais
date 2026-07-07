import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
import { AppLocale, LocaleService } from '../../core/services/locale';
import { TermsService, TermsType } from '../../core/services/terms';
import { isValidPortugueseNif, normalizePortugueseNif } from '../../core/validators/portuguese-nif';

const PRIVATE_DOCUMENT_MAX_FILE_BYTES = 5 * 1024 * 1024;

const PERSONAL_DATA_COPY = {
  'pt-PT': {
    step: 'Etapa 2 de 3', stepName: 'Dados pessoais', stepAria: 'Etapa 2 de 3: dados pessoais',
    titleRequired: 'Conclua os seus dados pessoais para continuar.', title: 'Dados da sua conta, identidade e localização.',
    leadRequired: 'Esta etapa é necessária antes de criar ou editar um perfil na wecareparents.',
    lead: 'Estes dados pertencem ao utilizador e podem ser usados nos perfis de família e cuidador.',
    account: 'Dados da conta', accountHelp: 'Informação base da sua conta na plataforma.', email: 'Email',
    acceptTerms: 'Aceito os', terms: 'Termos e Condições', acceptPrivacy: 'Aceito a', privacy: 'Política de Privacidade',
    readAndAccept: 'Ler e aceitar', termsModalHelp: 'Leia o conteúdo até ao final para activar a aceitação.', acceptAfterReading: 'Aceitar após ler', rejectTerms: 'Recusar', loadingTerms: 'A carregar documento...', termsUnavailable: 'Não foi possível carregar o documento activo. Tente novamente.',
    termsNotRead: 'É necessário abrir e ler os Termos e Condições até ao fim antes de aceitar.', privacyNotRead: 'É necessário abrir e ler a Política de Privacidade até ao fim antes de aceitar.',
    personal: 'Dados pessoais', personalHelp: 'Dados essenciais para identificação e contacto.',
    fullName: 'Nome completo', fullNamePlaceholder: 'Nome e apelido', birthDate: 'Data de nascimento', gender: 'Sexo', select: 'Selecionar',
    female: 'Feminino', male: 'Masculino', other: 'Outro', preferNot: 'Prefiro não indicar', nationality: 'Nacionalidade', nationalityPlaceholder: 'Portuguesa',
    phoneContact: 'Contacto telefónico', callingCode: 'Indicativo', mobile: 'Telemóvel', private: 'privado',
    portugueseId: 'Documento de identificação', type: 'Tipo', number: 'Número', documentNumber: 'Número do documento',
    citizenCard: 'Cartão de Cidadão português', passport: 'Passaporte', residencePermit: 'Título de residência emitido em Portugal', otherPortugueseId: 'Outro documento emitido em Portugal',
    frontPhoto: 'Foto da frente', backPhoto: 'Foto do verso', currentFile: 'Ficheiro atual',
    location: 'Localização', locationHelp: 'Esta localização será usada pelos seus perfis na plataforma.',
    district: 'Distrito', county: 'Concelho', postalCode: 'Código postal', address: 'Morada completa', addressPlaceholder: 'Rua, número, localidade', addressProof: 'Foto do comprovativo de morada',
    criminal: 'Registo criminal', criminalHelp: 'Declaração e comprovativo necessários para validação de segurança.',
    criminalDeclaration: 'Declaro que não possuo qualquer pendência criminal', criminalCertificate: 'Foto do certificado de registo criminal',
    saving: 'A guardar...', save: 'Guardar dados pessoais', close: 'Fechar mensagem',
    requiredNotice: 'Preencha os campos obrigatórios abaixo. Depois de guardar, continuará automaticamente para a próxima etapa.',
    imageOnly: 'Os comprovativos devem ser enviados como imagem.', imageMax: 'Cada imagem deve ter no máximo 5 MB.',
    saved: 'Dados pessoais guardados com sucesso.', nextCaregiver: 'Dados pessoais concluídos. A encaminhar para o cadastro de cuidador...', nextFamily: 'Dados pessoais concluídos. A encaminhar para o cadastro de família...',
    nextError: 'Os dados foram guardados, mas não foi possível avançar para a próxima etapa. Tente novamente.',
    termsAcceptance: 'Aceitação dos Termos e Condições', privacyAcceptance: 'Aceitação da Política de Privacidade', criminalAcceptance: 'Declaração de inexistência de pendência criminal',
    documentType: 'Tipo de documento', idDocument: 'Documento de identificação', frontDocument: 'Foto da frente do documento', backDocument: 'Foto do verso do documento',
    adult: 'É necessário ter pelo menos 18 anos.', invalidPhone: 'Introduza um número de telemóvel válido para o indicativo selecionado.', invalidNif: 'Introduza um NIF português válido com 9 dígitos.',
    required: (label: string) => `${label} é obrigatório.`, requiredFemale: (label: string) => `${label} é obrigatória.`, invalid: (label: string) => `${label} não está válido.`, mustImage: (label: string) => `${label} deve ser uma imagem.`, maxImage: (label: string) => `${label} deve ter no máximo 5 MB.`,
    optimizeImage: 'Não foi possível otimizar a imagem.', processImage: 'Não foi possível processar a imagem.', readImage: 'Não foi possível ler a imagem.', readFile: 'Não foi possível ler o ficheiro.',
  },
  'en-GB': {
    step: 'Step 2 of 3', stepName: 'Personal details', stepAria: 'Step 2 of 3: personal details',
    titleRequired: 'Complete your personal details to continue.', title: 'Your account, identity and location details.',
    leadRequired: 'This step is required before creating or editing a profile on wecareparents.',
    lead: 'These details belong to the user and may be used for family and caregiver profiles.',
    account: 'Account details', accountHelp: 'Basic information about your account on the platform.', email: 'Email',
    acceptTerms: 'I accept the', terms: 'Terms and Conditions', acceptPrivacy: 'I accept the', privacy: 'Privacy Policy',
    readAndAccept: 'Read and accept', termsModalHelp: 'Read the content to the end to enable acceptance.', acceptAfterReading: 'Accept after reading', rejectTerms: 'Reject', loadingTerms: 'Loading document...', termsUnavailable: 'The active document could not be loaded. Please try again.',
    termsNotRead: 'You must open and read the Terms and Conditions to the end before accepting.', privacyNotRead: 'You must open and read the Privacy Policy to the end before accepting.',
    personal: 'Personal details', personalHelp: 'Essential identification and contact details.',
    fullName: 'Full name', fullNamePlaceholder: 'First and last name', birthDate: 'Date of birth', gender: 'Gender', select: 'Select',
    female: 'Female', male: 'Male', other: 'Other', preferNot: 'Prefer not to say', nationality: 'Nationality', nationalityPlaceholder: 'Portuguese',
    phoneContact: 'Telephone contact', callingCode: 'Country calling code', mobile: 'Mobile number', private: 'private',
    portugueseId: 'Identification document', type: 'Type', number: 'Number', documentNumber: 'Document number',
    citizenCard: 'Portuguese Citizen Card', passport: 'Passport', residencePermit: 'Residence permit issued in Portugal', otherPortugueseId: 'Other document issued in Portugal',
    frontPhoto: 'Front image', backPhoto: 'Back image', currentFile: 'Current file',
    location: 'Location', locationHelp: 'This location will be used by your profiles on the platform.',
    district: 'District', county: 'Municipality', postalCode: 'Postcode', address: 'Full address', addressPlaceholder: 'Street, number, town or city', addressProof: 'Address proof image',
    criminal: 'Criminal record', criminalHelp: 'A declaration and supporting document are required for security checks.',
    criminalDeclaration: 'I declare that I have no pending criminal matters', criminalCertificate: 'Criminal record certificate image',
    saving: 'Saving...', save: 'Save personal details', close: 'Close message',
    requiredNotice: 'Complete the required fields below. After saving, you will automatically continue to the next step.',
    imageOnly: 'Supporting documents must be uploaded as images.', imageMax: 'Each image must be no larger than 5 MB.',
    saved: 'Personal details saved successfully.', nextCaregiver: 'Personal details completed. Taking you to caregiver registration...', nextFamily: 'Personal details completed. Taking you to family registration...',
    nextError: 'Your details were saved, but we could not continue to the next step. Please try again.',
    termsAcceptance: 'Acceptance of the Terms and Conditions', privacyAcceptance: 'Acceptance of the Privacy Policy', criminalAcceptance: 'Declaration of no pending criminal matters',
    documentType: 'Document type', idDocument: 'Identification document', frontDocument: 'Front image of the document', backDocument: 'Back image of the document',
    adult: 'You must be at least 18 years old.', invalidPhone: 'Enter a valid mobile number for the selected country calling code.', invalidNif: 'Enter a valid 9-digit Portuguese NIF.',
    required: (label: string) => `${label} is required.`, requiredFemale: (label: string) => `${label} is required.`, invalid: (label: string) => `${label} is not valid.`, mustImage: (label: string) => `${label} must be an image.`, maxImage: (label: string) => `${label} must be no larger than 5 MB.`,
    optimizeImage: 'The image could not be optimised.', processImage: 'The image could not be processed.', readImage: 'The image could not be read.', readFile: 'The file could not be read.',
  },
} as const;

@Component({
  selector: 'app-personal-data',
  template: `
    <section class="page hero hero-compact personal-data-hero" [class.required-step]="isRequiredStep()">
      <div>
        <div class="registration-step" [attr.aria-label]="copy().stepAria">
          <span class="registration-step__number">2</span>
          <div>
            <strong>{{ copy().step }}</strong>
            <span>{{ copy().stepName }}</span>
          </div>
          <div class="registration-step__progress" aria-hidden="true">
            <span class="is-active"></span><span class="is-active"></span><span></span>
          </div>
        </div>
        <h1>{{ pageTitle() }}</h1>
        <p class="lead">{{ pageLead() }}</p>
      </div>
    </section>

    <section class="page personal-data-page">
      <form
        class="card card-body personal-data-form"
        [class.show-validation-errors]="hasSubmitted()"
        novalidate
        (submit)="onSubmit($event)"
      >
        <section class="form-section">
          <div class="section-title">
            <span>1</span>
            <div>
              <h2>{{ copy().account }}</h2>
              <p>{{ copy().accountHelp }}</p>
            </div>
          </div>
          <div class="form-grid two-columns">
            <label><span class="label-line">{{ copy().email }} <strong>*</strong></span><input type="email" name="email" required readonly [value]="email()" /></label>
          </div>
          <div class="check-stack">
            <label>
              <input type="checkbox" name="acceptedTerms" required [checked]="termsAccepted()" (click)="openTermsModal('termsAndConditions', $event)" />
              <span>{{ copy().acceptTerms }} <button class="inline-link" type="button" (click)="openTermsModal('termsAndConditions', $event)">{{ copy().terms }}</button> <strong>*</strong></span>
            </label>
            <label>
              <input type="checkbox" name="acceptedPrivacy" required [checked]="privacyAccepted()" (click)="openTermsModal('privacy', $event)" />
              <span>{{ copy().acceptPrivacy }} <button class="inline-link" type="button" (click)="openTermsModal('privacy', $event)">{{ copy().privacy }}</button> <strong>*</strong></span>
            </label>
          </div>
        </section>

        <section class="form-section">
          <div class="section-title">
            <span>2</span>
            <div>
              <h2>{{ copy().personal }}</h2>
              <p>{{ copy().personalHelp }}</p>
            </div>
          </div>
          <div class="form-grid two-columns">
            <label><span class="label-line">{{ copy().fullName }} <strong>*</strong></span><input name="fullName" required [placeholder]="copy().fullNamePlaceholder" [value]="value('fullName')" /></label>
            <label><span class="label-line">{{ copy().birthDate }} <strong>*</strong></span><input type="date" name="birthDate" required [value]="value('birthDate')" (input)="onValidatedFieldInput($event)" /></label>
            <label><span class="label-line">{{ copy().gender }} <strong>*</strong></span>
              <select name="gender" required [value]="value('gender')">
                <option value="">{{ copy().select }}</option>
                <option value="Feminino">{{ copy().female }}</option>
                <option value="Masculino">{{ copy().male }}</option>
                <option value="Outro">{{ copy().other }}</option>
                <option value="Prefiro não indicar">{{ copy().preferNot }}</option>
              </select>
            </label>
            <label><span class="label-line">{{ copy().nationality }} <strong>*</strong></span><input name="nationality" required [placeholder]="copy().nationalityPlaceholder" [value]="value('nationality')" /></label>
            <fieldset class="paired-fieldset span-2">
              <legend>{{ copy().phoneContact }} <strong>*</strong></legend>
              <div class="paired-fields phone-fields">
                <label><span class="label-line">{{ copy().callingCode }}</span>
                  <select name="phoneCountry" required [value]="phoneCountry()" (change)="onPhoneCountryChange($event); validatePhoneField($event)">
                    @for (country of phoneCountries(); track country.code) {
                      <option [value]="country.code">{{ country.name }} (+{{ country.callingCode }})</option>
                    }
                  </select>
                </label>
                <label><span class="label-line">{{ copy().mobile }}</span>
                  <input
                    type="tel"
                    name="phone"
                    required
                    inputmode="tel"
                    autocomplete="tel-national"
                    placeholder="912 345 678"
                    [value]="nationalPhone()"
                    (input)="onValidatedFieldInput($event)"
                  />
                </label>
              </div>
            </fieldset>
            <label><span class="label-line">NIF <strong>*</strong> <small>{{ copy().private }}</small></span><input name="nif" required inputmode="numeric" autocomplete="off" placeholder="123456789" [value]="privateValue('nif')" (input)="onValidatedFieldInput($event)" /></label>
            <fieldset class="paired-fieldset span-2">
              <legend>{{ copy().portugueseId }} <strong>*</strong> <small>{{ copy().private }}</small></legend>
              <div class="paired-fields document-fields">
                <label>{{ copy().type }}
                  <select name="documentType" required [value]="documentType()" (change)="onDocumentTypeChange($event)">
                    <option value="">{{ copy().select }}</option>
                    <option value="Cartão de Cidadão">{{ copy().citizenCard }}</option>
                    <option value="Passaporte">{{ copy().passport }}</option>
                    <option value="Título de residência">{{ copy().residencePermit }}</option>
                    <option value="Outro">{{ copy().otherPortugueseId }}</option>
                  </select>
                </label>
                <label>{{ copy().number }}
                  <input name="idDocument" required [placeholder]="copy().documentNumber" [value]="privateValue('idDocument')" />
                </label>
              </div>
              <div class="document-upload-grid">
                <label><span class="label-line">{{ copy().frontPhoto }} <strong>*</strong></span>
                  <input type="file" name="identityFront" accept="image/*" [required]="!documentFileName('identityFront')" (change)="onPrivateDocumentFileChange($event)" />
                  @if (documentFileName('identityFront')) {
                    <small class="field-hint">{{ copy().currentFile }}: {{ documentFileName('identityFront') }}</small>
                  }
                </label>
                @if (!isPassportDocument()) {
                  <label><span class="label-line">{{ copy().backPhoto }} <strong>*</strong></span>
                    <input type="file" name="identityBack" accept="image/*" [required]="!documentFileName('identityBack')" (change)="onPrivateDocumentFileChange($event)" />
                    @if (documentFileName('identityBack')) {
                      <small class="field-hint">{{ copy().currentFile }}: {{ documentFileName('identityBack') }}</small>
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
              <h2>{{ copy().location }}</h2>
              <p>{{ copy().locationHelp }}</p>
            </div>
          </div>
          <div class="form-grid two-columns">
            <label><span class="label-line">{{ copy().district }} <strong>*</strong></span><input name="district" required placeholder="Lisboa" [value]="locationValue('district')" /></label>
            <label><span class="label-line">{{ copy().county }} <strong>*</strong></span><input name="county" required placeholder="Oeiras" [value]="locationValue('county')" /></label>
            <label><span class="label-line">{{ copy().postalCode }} <strong>*</strong></span><input name="postalCode" required placeholder="0000-000" [value]="privateValue('postalCode')" /></label>
            <label class="span-2"><span class="label-line">{{ copy().address }} <small>{{ copy().private }}</small></span><input name="address" [placeholder]="copy().addressPlaceholder" [value]="privateValue('address')" /></label>
            <label class="span-2"><span class="label-line">{{ copy().addressProof }} <strong>*</strong> <small>{{ copy().private }}</small></span>
              <input type="file" name="addressProof" accept="image/*" [required]="!documentFileName('addressProof')" (change)="onPrivateDocumentFileChange($event)" />
              @if (documentFileName('addressProof')) {
                <small class="field-hint">{{ copy().currentFile }}: {{ documentFileName('addressProof') }}</small>
              }
            </label>
          </div>
        </section>

        <section class="form-section">
          <div class="section-title">
            <span>4</span>
            <div>
              <h2>{{ copy().criminal }}</h2>
              <p>{{ copy().criminalHelp }}</p>
            </div>
          </div>
          <div class="check-stack">
            <label><input type="checkbox" name="criminalRecordNoPending" required [checked]="account()?.private?.criminalRecordNoPending === true" /> {{ copy().criminalDeclaration }} <strong>*</strong></label>
          </div>
          <div class="form-grid two-columns">
            <label class="span-2"><span class="label-line">{{ copy().criminalCertificate }} <strong>*</strong> <small>{{ copy().private }}</small></span>
              <input type="file" name="criminalRecordCertificate" accept="image/*" [required]="!documentFileName('criminalRecordCertificate')" (change)="onPrivateDocumentFileChange($event)" />
              @if (documentFileName('criminalRecordCertificate')) {
                <small class="field-hint">{{ copy().currentFile }}: {{ documentFileName('criminalRecordCertificate') }}</small>
              }
            </label>
          </div>
        </section>

        <div class="form-actions">
          <button class="button" type="submit" [disabled]="isSubmitting()">
            {{ isSubmitting() ? copy().saving : copy().save }}
          </button>
        </div>
      </form>
    </section>

    @if (snackbarMessage()) {
      <div
        class="snackbar"
        [class.snackbar--error]="snackbarKind() === 'error'"
        [class.snackbar--success]="snackbarKind() === 'success'"
        [attr.role]="snackbarKind() === 'error' ? 'alert' : 'status'"
        aria-live="polite"
      >
        <span class="material-symbols-rounded snackbar__icon" aria-hidden="true">{{ snackbarIcon() }}</span>
        <p>{{ snackbarMessage() }}</p>
        <button type="button" [attr.aria-label]="copy().close" (click)="closeSnackbar()">
          <span class="material-symbols-rounded" aria-hidden="true">close</span>
        </button>
      </div>
    }

    @if (termsModalOpen()) {
      <div class="terms-modal-backdrop" role="presentation" (click)="closeTermsModal()">
        <section
          class="terms-modal"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="termsModalTitle()"
          (click)="$event.stopPropagation()"
        >
          <header class="terms-modal__header">
            <div>
              <p class="eyebrow">{{ copy().readAndAccept }}</p>
              <h2>{{ termsModalTitle() }}</h2>
              <span>{{ copy().termsModalHelp }}</span>
            </div>
            <button type="button" [attr.aria-label]="copy().close" (click)="closeTermsModal()">
              <span class="material-symbols-rounded" aria-hidden="true">close</span>
            </button>
          </header>

          <div class="terms-modal__content" (scroll)="onTermsScroll($event)">
            @if (isLoadingTerms()) {
              <p class="terms-modal__state">{{ copy().loadingTerms }}</p>
            } @else if (termsModalError()) {
              <p class="terms-modal__state terms-modal__state--error">{{ termsModalError() }}</p>
            } @else {
              <div class="terms-markdown" [innerHTML]="termsModalHtml()"></div>
            }
          </div>

          <footer class="terms-modal__footer">
            <button class="button-secondary" type="button" (click)="closeTermsModal()">{{ copy().close }}</button>
            <div class="terms-modal__decisions">
              <button class="button-secondary terms-modal__reject" type="button" (click)="rejectCurrentTerms()">{{ copy().rejectTerms }}</button>
              <button class="button" type="button" [disabled]="!hasReadTermsToEnd() || !!termsModalError()" (click)="acceptCurrentTerms()">
                {{ copy().acceptAfterReading }}
              </button>
            </div>
          </footer>
        </section>
      </div>
    }
  `,
  styleUrl: './personal-data.scss',
})
export class PersonalDataComponent implements OnInit, OnDestroy {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly localeService = inject(LocaleService);
  private readonly termsService = inject(TermsService);

  protected readonly account = signal<UserAccount | null>(null);
  protected readonly email = signal('');
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly hasSubmitted = signal(false);
  protected readonly showRequiredNotice = signal(true);
  protected readonly redirectTo = signal(this.route.snapshot.queryParamMap.get('redirectTo') ?? '');
  protected readonly phoneCountry = signal<CountryCode>('PT');
  protected readonly nationalPhone = signal('');
  protected readonly documentType = signal('');
  protected readonly termsAccepted = signal(false);
  protected readonly privacyAccepted = signal(false);
  protected readonly termsModalOpen = signal(false);
  protected readonly activeTermsType = signal<TermsType | null>(null);
  protected readonly termsModalHtml = signal('');
  protected readonly termsModalError = signal('');
  protected readonly isLoadingTerms = signal(false);
  protected readonly hasReadTermsToEnd = signal(false);
  private lockedScrollY = 0;
  private readonly previousBodyStyle = {
    position: '',
    top: '',
    width: '',
    overflow: '',
  };
  protected readonly phoneCountries = computed(() =>
    getCountries()
      .map((code) => ({
        code,
        name: this.countryDisplayName(code),
        callingCode: getCountryCallingCode(code),
      }))
      .sort((first, second) => {
        if (first.code === 'PT') return -1;
        if (second.code === 'PT') return 1;
        return first.name.localeCompare(second.name, this.localeService.locale());
      }),
  );
  protected readonly isRequiredStep = computed(() => !!this.redirectTo());
  protected readonly snackbarKind = computed<'error' | 'success' | 'info'>(() => {
    if (this.errorMessage()) return 'error';
    if (this.successMessage()) return 'success';
    return 'info';
  });
  protected readonly snackbarMessage = computed(() => {
    if (this.errorMessage()) return this.errorMessage();
    if (this.successMessage()) return this.successMessage();
    if (this.isRequiredStep() && this.showRequiredNotice()) {
      return this.copy().requiredNotice;
    }
    return '';
  });
  protected readonly snackbarIcon = computed(() => {
    if (this.snackbarKind() === 'error') return 'error';
    if (this.snackbarKind() === 'success') return 'check_circle';
    return 'info';
  });
  protected readonly pageTitle = computed(() =>
    this.isRequiredStep()
      ? this.copy().titleRequired
      : this.copy().title,
  );
  protected readonly pageLead = computed(() =>
    this.isRequiredStep()
      ? this.copy().leadRequired
      : this.copy().lead,
  );
  protected readonly termsModalTitle = computed(() => {
    const type = this.activeTermsType();
    if (type === 'privacy') return this.copy().privacy;
    if (type === 'termsAndConditions') return this.copy().terms;
    return '';
  });

  protected copy(): (typeof PERSONAL_DATA_COPY)[AppLocale] {
    return PERSONAL_DATA_COPY[this.localeService.locale()];
  }

  async ngOnInit(): Promise<void> {
    const user = await this.auth.getCurrentUser();
    this.email.set(user?.email ?? '');
    if (!user) {
      return;
    }

    const account = await this.auth.getUserAccount(user.uid);
    this.account.set(account);
    this.termsAccepted.set(account?.acceptedTerms === true);
    this.privacyAccepted.set(account?.acceptedPrivacy === true);
    this.documentType.set(account?.private?.documentType ?? '');
    this.loadPhone(account);
  }

  ngOnDestroy(): void {
    this.unlockPageScroll();
  }

  protected closeSnackbar(): void {
    if (this.errorMessage()) {
      this.errorMessage.set('');
      return;
    }

    if (this.successMessage()) {
      this.successMessage.set('');
      return;
    }

    this.showRequiredNotice.set(false);
  }

  protected async onSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.hasSubmitted.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    this.updateCustomFieldValidity(form, formData);
    const validationMessage = this.getValidationMessage(form, formData);
    if (validationMessage) {
      this.errorMessage.set(validationMessage);
      return;
    }

    const shouldContinueRegistration =
      this.isRequiredStep() || !this.auth.hasCompletePersonalData(this.account());
    this.isSubmitting.set(true);
    try {
      await this.auth.updateUserPersonalData(await this.buildPersonalData(formData));
      const user = await this.auth.getCurrentUser();
      const account = await this.auth.getUserAccount(user?.uid ?? '');
      this.account.set(account);

      if (shouldContinueRegistration && user) {
        const nextRoute = await this.auth.getPostLoginRedirect(user.uid);
        this.successMessage.set(
          nextRoute.includes('cuidador') ? this.copy().nextCaregiver : this.copy().nextFamily,
        );
        await this.showTransitionFeedback();
        const navigated = await this.router.navigateByUrl(nextRoute);
        if (!navigated) {
          this.successMessage.set('');
          this.errorMessage.set(
            this.copy().nextError,
          );
        }
        return;
      }

      this.successMessage.set(this.copy().saved);
    } catch (error) {
      this.errorMessage.set(this.auth.getFirebaseErrorMessage(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private showTransitionFeedback(): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, 600));
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

  protected onValidatedFieldInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const form = input.form;
    if (!form) return;

    this.updateCustomFieldValidity(form, new FormData(form));
  }

  protected validatePhoneField(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const form = select.form;
    if (!form) return;

    this.updateCustomFieldValidity(form, new FormData(form));
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
      this.errorMessage.set(this.copy().imageOnly);
      input.value = '';
      return;
    }

    if (file.size > PRIVATE_DOCUMENT_MAX_FILE_BYTES) {
      this.errorMessage.set(this.copy().imageMax);
      input.value = '';
    }
  }

  protected async openTermsModal(type: TermsType, event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();
    if (!this.termsModalOpen()) {
      this.lockPageScroll();
    }
    this.activeTermsType.set(type);
    this.termsModalOpen.set(true);
    this.termsModalHtml.set('');
    this.termsModalError.set('');
    this.hasReadTermsToEnd.set(false);
    this.isLoadingTerms.set(true);

    try {
      const document = await this.termsService.getLatestActiveTerms(type);
      if (!document) {
        this.termsModalError.set(this.copy().termsUnavailable);
        return;
      }

      const locale = this.localeService.locale();
      const markdown = this.termsService.applyDatePlaceholder(
        this.termsService.contentForLocale(document.content, locale),
        document.dateUpdate,
        locale,
      );
      this.termsModalHtml.set(this.termsService.markdownToHtml(markdown));
      window.setTimeout(() => this.updateTermsReadState(), 0);
    } catch {
      this.termsModalError.set(this.copy().termsUnavailable);
    } finally {
      this.isLoadingTerms.set(false);
    }
  }

  protected closeTermsModal(): void {
    this.termsModalOpen.set(false);
    this.unlockPageScroll();
  }

  protected onTermsScroll(event: Event): void {
    this.updateTermsReadState(event.currentTarget as HTMLElement);
  }

  protected acceptCurrentTerms(): void {
    if (!this.hasReadTermsToEnd()) {
      return;
    }

    if (this.activeTermsType() === 'privacy') {
      this.privacyAccepted.set(true);
    }

    if (this.activeTermsType() === 'termsAndConditions') {
      this.termsAccepted.set(true);
    }

    this.closeTermsModal();
  }

  protected rejectCurrentTerms(): void {
    if (this.activeTermsType() === 'privacy') {
      this.privacyAccepted.set(false);
    }

    if (this.activeTermsType() === 'termsAndConditions') {
      this.termsAccepted.set(false);
    }

    this.closeTermsModal();
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
      acceptedTerms: this.termsAccepted(),
      acceptedPrivacy: this.privacyAccepted(),
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
    const copy = this.copy();
    const requiredFields = [
      { key: 'acceptedTerms', label: copy.termsAcceptance, type: 'checkbox' },
      { key: 'acceptedPrivacy', label: copy.privacyAcceptance, type: 'checkbox' },
      { key: 'criminalRecordNoPending', label: copy.criminalAcceptance, type: 'checkbox' },
      { key: 'fullName', label: copy.fullName },
      { key: 'birthDate', label: copy.birthDate, type: 'birthDate' },
      { key: 'gender', label: copy.gender },
      { key: 'nationality', label: copy.nationality },
      { key: 'phone', label: copy.mobile },
      { key: 'nif', label: 'NIF' },
      { key: 'documentType', label: copy.documentType },
      { key: 'idDocument', label: copy.idDocument },
      { key: 'district', label: copy.district },
      { key: 'county', label: copy.county },
      { key: 'postalCode', label: copy.postalCode },
    ];

    for (const field of requiredFields) {
      if (field.key === 'acceptedTerms' && !this.termsAccepted()) {
        return copy.termsNotRead;
      }

      if (field.key === 'acceptedPrivacy' && !this.privacyAccepted()) {
        return copy.privacyNotRead;
      }

      if (field.type === 'checkbox' && !formData.has(field.key)) {
        return copy.required(field.label);
      }

      const value = this.textValue(formData, field.key);
      if (!field.type && !value) {
        return copy.required(field.label);
      }

      const control = form.elements.namedItem(field.key);
      if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
        if (!control.checkValidity()) {
          return this.controlValidationMessage(control, field.label);
        }
      }

      if (field.type === 'birthDate' && !this.isAdult(value)) {
        return copy.adult;
      }

      if (field.key === 'phone' && !this.isValidPhone(formData)) {
        return copy.invalidPhone;
      }

      if (field.key === 'nif' && !isValidPortugueseNif(value)) {
        return copy.invalidNif;
      }
    }

    const documentValidationMessage = this.getPrivateDocumentsValidationMessage(formData);
    if (documentValidationMessage) {
      return documentValidationMessage;
    }

    return '';
  }

  private updateCustomFieldValidity(form: HTMLFormElement, formData: FormData): void {
    const birthDate = form.elements.namedItem('birthDate');
    const phone = form.elements.namedItem('phone');
    const nif = form.elements.namedItem('nif');

    if (birthDate instanceof HTMLInputElement) {
      birthDate.setCustomValidity(
        birthDate.value && !this.isAdult(birthDate.value) ? this.copy().adult : '',
      );
    }

    if (phone instanceof HTMLInputElement) {
      phone.setCustomValidity(
        phone.value && !this.isValidPhone(formData) ? this.copy().invalidPhone : '',
      );
    }

    if (nif instanceof HTMLInputElement) {
      nif.setCustomValidity(
        nif.value && !isValidPortugueseNif(nif.value) ? this.copy().invalidNif : '',
      );
    }
  }

  private getPrivateDocumentsValidationMessage(formData: FormData): string {
    const copy = this.copy();
    const requiredDocuments: Array<{ key: UserPrivateDocumentKind; label: string }> = [
      { key: 'identityFront', label: copy.frontDocument },
      { key: 'addressProof', label: copy.addressProof },
      { key: 'criminalRecordCertificate', label: copy.criminalCertificate },
    ];

    if (this.textValue(formData, 'documentType') !== 'Passaporte') {
      requiredDocuments.splice(1, 0, { key: 'identityBack', label: copy.backDocument });
    }

    for (const document of requiredDocuments) {
      const file = formData.get(document.key);
      const existingDocument = this.account()?.private?.documents?.[document.key];
      if (!(file instanceof File) || !file.name) {
        if (!existingDocument) {
          return copy.requiredFemale(document.label);
        }
        continue;
      }

      if (!file.type.startsWith('image/')) {
        return copy.mustImage(document.label);
      }
      if (file.size > PRIVATE_DOCUMENT_MAX_FILE_BYTES) {
        return copy.maxImage(document.label);
      }
    }

    return '';
  }

  private controlValidationMessage(control: HTMLInputElement | HTMLSelectElement, label: string): string {
    if (control.validity.customError) {
      return control.validationMessage;
    }

    if (control.validity.valueMissing) {
      return this.copy().required(label);
    }
    if (control.validity.typeMismatch || control.validity.badInput) {
      return this.copy().invalid(label);
    }

    return this.copy().invalid(label);
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
    return new Intl.DisplayNames([this.localeService.locale()], { type: 'region' }).of(country) ?? country;
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
      throw new Error(this.copy().optimizeImage);
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

          reject(new Error(this.copy().processImage));
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
      image.onerror = () => reject(new Error(this.copy().readImage));
      image.src = dataUrl;
    });
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error(this.copy().readFile));
      reader.readAsDataURL(file);
    });
  }

  private textValue(formData: FormData, key: string): string {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : '';
  }

  private updateTermsReadState(element?: HTMLElement): void {
    const container = element ?? document.querySelector<HTMLElement>('.terms-modal__content');
    if (!container) return;

    const reachedEnd = container.scrollTop + container.clientHeight >= container.scrollHeight - 8;
    this.hasReadTermsToEnd.set(reachedEnd || container.scrollHeight <= container.clientHeight + 8);
  }

  private lockPageScroll(): void {
    this.lockedScrollY = window.scrollY;
    this.previousBodyStyle.position = document.body.style.position;
    this.previousBodyStyle.top = document.body.style.top;
    this.previousBodyStyle.width = document.body.style.width;
    this.previousBodyStyle.overflow = document.body.style.overflow;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${this.lockedScrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
  }

  private unlockPageScroll(): void {
    if (document.body.style.position !== 'fixed') {
      return;
    }

    document.body.style.position = this.previousBodyStyle.position;
    document.body.style.top = this.previousBodyStyle.top;
    document.body.style.width = this.previousBodyStyle.width;
    document.body.style.overflow = this.previousBodyStyle.overflow;
    window.scrollTo(0, this.lockedScrollY);
  }
}
