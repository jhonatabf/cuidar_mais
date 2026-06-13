import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  Auth,
  CaregiverProfileDocument,
  CaregiverRegistration,
  CaregiverTrainingCertificate,
} from '../../core/services/auth';

const PROFILE_PHOTO_MAX_FILE_BYTES = 1024 * 1024;
const PROFILE_PHOTO_MAX_FIRESTORE_BYTES = 800 * 1024;
const PROFILE_PHOTO_MAX_DIMENSION = 1200;
const PROFILE_PHOTO_MIN_QUALITY = 0.45;
const CERTIFICATE_IMAGE_MAX_FILE_BYTES = 5 * 1024 * 1024;
const CERTIFICATE_IMAGE_TARGET_BYTES = 900 * 1024;
const CERTIFICATE_IMAGE_MAX_DIMENSION = 1600;
const CERTIFICATE_IMAGE_MIN_QUALITY = 0.58;

type TrainingEntryData = {
  id: string;
  trainingType: string;
  courseName: string;
  trainingEntity: string;
  completionDate: string;
  certificateFileName: string;
  certificate: CaregiverTrainingCertificate | null;
};

type CaregiverSignupLocale = 'pt-PT' | 'en' | 'es';

const CAREGIVER_SIGNUP_COPY = {
  'pt-PT': {
    eyebrow: 'Cadastro de cuidadores',
    badge: 'Uma dica',
    title: 'Crie um perfil claro, fiável e rápido de avaliar.',
    lead:
      'O registo inicial recolhe apenas o essencial para apresentar o cuidador às famílias, mantendo os dados sensíveis privados.',
    summaryTitle: 'Perfil público simples',
    summaryText:
      'As famílias verão o resumo, os serviços, a disponibilidade, a localização aproximada, os idiomas e as competências.',
    privacyNote: 'NIF, documento, morada e contactos privados não aparecem no perfil público.',
  },
  en: {
    eyebrow: 'Caregiver registration',
    badge: 'A tip',
    title: 'Create a clear, reliable profile that is quick to review.',
    lead:
      'The initial registration collects only the essentials to present the caregiver to families while keeping sensitive data private.',
    summaryTitle: 'Simple public profile',
    summaryText:
      'Families will see the summary, services, availability, approximate location, languages and skills.',
    privacyNote: 'Tax ID, document, address and private contacts do not appear on the public profile.',
  },
  es: {
    eyebrow: 'Registro de cuidadores',
    badge: 'Un consejo',
    title: 'Crea un perfil claro, fiable y rápido de evaluar.',
    lead:
      'El registro inicial recoge solo lo esencial para presentar al cuidador a las familias, manteniendo los datos sensibles privados.',
    summaryTitle: 'Perfil público simple',
    summaryText:
      'Las familias verán el resumen, los servicios, la disponibilidad, la ubicación aproximada, los idiomas y las competencias.',
    privacyNote: 'NIF, documento, dirección y contactos privados no aparecen en el perfil público.',
  },
} as const;

@Component({
  selector: 'app-become-caregiver',
  imports: [RouterLink],
  template: `
    <section class="page caregiver-signup-hero">
      <div>
        <p class="eyebrow">{{ copy().eyebrow }}</p>
        <h1>{{ copy().title }}</h1>
        <p class="lead">
          {{ copy().lead }}
        </p>
      </div>

      <aside class="signup-summary" aria-label="Resumo do registo">
        <span class="badge">{{ copy().badge }}</span>
        <h3>{{ copy().summaryTitle }}</h3>
        <p>{{ copy().summaryText }}</p>
        <p class="privacy-note">{{ copy().privacyNote }}</p>
      </aside>
    </section>

    <section class="page signup-layout">
      <aside class="signup-nav" aria-label="Secções do cadastro">
        @for (section of sections; track section) {
          <a [href]="'#' + section.id" (click)="scrollToSection($event, section.id)">{{ section.label }}</a>
        }
      </aside>

      <form class="caregiver-form" novalidate (submit)="onSubmit($event)">
        <fieldset class="form-disabled-shell" [disabled]="!canEditProfile()">
          <div class="profile-photo-field">
            <label class="profile-photo-picker">
              <span class="profile-photo-title">{{ profilePhotoActionLabel() }}</span>
              <input type="file" name="profilePhoto" accept="image/*" (change)="onProfilePhotoChange($event)" />
              <span class="profile-photo-frame" [attr.data-tooltip]="profilePhotoActionLabel()">
                @if (profilePhotoPreviewUrl()) {
                  <img [src]="profilePhotoPreviewUrl()" alt="Foto de perfil" />
                } @else {
                  <span class="profile-photo-avatar" aria-hidden="true">{{ profilePhotoInitials() }}</span>
                }
              </span>
            </label>
          </div>

          <section id="conta" class="signup-section">
            <div class="section-title">
              <span>1</span>
              <div>
                <h2>Dados de conta</h2>
                <p>Obrigatório para criar acesso seguro à plataforma.</p>
              </div>
            </div>
            <div class="form-grid two-columns">
              <label>Email <strong>*</strong><input type="email" name="email" required readonly [value]="accountEmail()" /></label>
            </div>
            <div class="check-stack">
              <label><input type="checkbox" name="acceptedTerms" required [checked]="hasExistingCaregiverProfile()" /> Aceito os <a routerLink="/termos">Termos e Condições</a> <strong>*</strong></label>
              <label><input type="checkbox" name="acceptedPrivacy" required [checked]="hasExistingCaregiverProfile()" /> Aceito a <a routerLink="/privacidade">Política de Privacidade</a> <strong>*</strong></label>
            </div>
          </section>

          <section id="dados-pessoais" class="signup-section">
            <div class="section-title">
              <span>2</span>
              <div>
                <h2>Dados pessoais</h2>
                <p>Dados essenciais para identificação e contacto.</p>
              </div>
            </div>
            <div class="form-grid two-columns">
              <label>Nome completo <strong>*</strong><input name="fullName" required placeholder="Nome e apelido" [value]="fieldValue('publicProfile.fullName')" /></label>
              <label>Data de nascimento <strong>*</strong><input type="date" name="birthDate" required [value]="fieldValue('private.birthDate')" /></label>
              <label>Sexo <strong>*</strong>
                <select name="gender" required [value]="fieldValue('publicProfile.gender')">
                  <option value="">Selecionar</option>
                  <option>Feminino</option>
                  <option>Masculino</option>
                  <option>Outro</option>
                  <option>Prefiro não indicar</option>
                </select>
              </label>
              <label>Nacionalidade <strong>*</strong><input name="nationality" required placeholder="Portuguesa" [value]="fieldValue('publicProfile.nationality')" /></label>
              <label>Telemóvel <strong>*</strong><input type="tel" name="phone" required placeholder="+351 900 000 000" [value]="fieldValue('private.phone')" /></label>
              <label>NIF <strong>*</strong> <small>privado</small><input name="nif" required inputmode="numeric" placeholder="Número de identificação fiscal" [value]="fieldValue('private.nif')" /></label>
              <label>Tipo de documento <strong>*</strong>
                <select name="documentType" required [value]="fieldValue('private.documentType')">
                  <option value="">Selecionar</option>
                  <option>Cartão de Cidadão</option>
                  <option>Passaporte</option>
                  <option>Título de residência</option>
                  <option>Outro</option>
                </select>
              </label>
              <label>Documento de identificação <strong>*</strong> <small>privado</small><input name="idDocument" required placeholder="Número do documento" [value]="fieldValue('private.idDocument')" /></label>
            </div>
          </section>

        <section id="localizacao" class="signup-section">
          <div class="section-title">
            <span>3</span>
            <div>
              <h2>Localização</h2>
              <p>A família verá apenas a zona de atuação, não a morada completa.</p>
            </div>
          </div>
          <div class="form-grid two-columns">
            <label>Distrito <strong>*</strong><input name="district" required placeholder="Lisboa" [value]="fieldValue('publicProfile.district')" /></label>
            <label>Concelho <strong>*</strong><input name="county" required placeholder="Oeiras" [value]="fieldValue('publicProfile.county')" /></label>
            <label>Código Postal <strong>*</strong><input name="postalCode" required placeholder="0000-000" [value]="fieldValue('private.postalCode')" /></label>
            <label>Raio máximo de deslocação
              <select name="travelRadius" [value]="fieldValue('publicProfile.travelRadius')">
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
            <label class="span-2">Morada completa <small>privada</small><input name="address" placeholder="Rua, número, localidade" [value]="fieldValue('private.address')" /></label>
          </div>
        </section>

        <section id="perfil-profissional" class="signup-section">
          <div class="section-title">
            <span>4</span>
            <div>
              <h2>Perfil profissional</h2>
              <p>Informação pública que ajuda a família a decidir.</p>
            </div>
          </div>
          <div class="form-grid">
            <label>Resumo profissional <strong>*</strong><textarea name="summary" required maxlength="650" placeholder="Descreva a sua experiência, estilo de cuidado e tipo de pessoa que costuma acompanhar.">{{ fieldValue('publicProfile.summary') }}</textarea></label>
            <label>Anos de experiência <strong>*</strong><input type="number" name="experienceYears" required min="0" max="60" placeholder="Ex.: 5" [value]="fieldValue('publicProfile.experienceYears')" /></label>
          </div>
          <fieldset>
            <legend>Tipos de serviço prestados <strong>*</strong></legend>
            <div class="checkbox-grid">
              @for (service of serviceTypes; track service) {
                <label><input type="checkbox" name="serviceTypes" [value]="service" [checked]="isChecked('publicProfile.serviceTypes', service)" /> {{ service }}</label>
              }
            </div>
          </fieldset>
        </section>

        <section id="formacao" class="signup-section">
          <div class="section-title">
            <span>5</span>
            <div>
              <h2>Formação</h2>
              <p>Opcional, mas recomendado para perfis profissionais.</p>
            </div>
          </div>

          <div class="training-list">
            @for (entryId of trainingEntryIds(); track entryId) {
              <div class="training-entry">
                @if (trainingEntryIds().length > 1) {
                  <div class="training-entry-header">
                    <button type="button" class="ghost-button compact-button" (click)="removeTrainingEntry(entryId)">Remover</button>
                  </div>
                }

                <label>
                  Formação profissional
                  <select [name]="'trainingType-' + entryId" [value]="selectedTrainingType(entryId)" (change)="onTrainingTypeChange(entryId, $event)">
                    <option value="">Selecionar formação</option>
                    @for (course of availableTrainingTypes(entryId); track course) {
                      <option [value]="course">{{ course }}</option>
                    }
                  </select>
                </label>

                @if (selectedTrainingType(entryId)) {
                  <div class="form-grid two-columns training-details">
                    <label>
                      Nome do curso
                      <input [name]="'courseName-' + entryId" placeholder="Ex.: Curso de cuidador sénior" [value]="trainingFieldValue(entryId, 'courseName')" />
                    </label>
                    <label>
                      Entidade formadora
                      <input [name]="'trainingEntity-' + entryId" placeholder="Nome da instituição" [value]="trainingFieldValue(entryId, 'trainingEntity')" />
                    </label>
                    <label>
                      Data de conclusão
                      <input type="date" [name]="'completionDate-' + entryId" [value]="trainingFieldValue(entryId, 'completionDate')" />
                    </label>
                    <label>
                      Imagem do certificado
                      <input type="file" [name]="'certificateFile-' + entryId" accept="image/*" (change)="onCertificateFileChange($event)" />
                      <small class="field-hint">Pode enviar uma foto até 5 MB. A imagem será otimizada automaticamente.</small>
                      @if (trainingFieldValue(entryId, 'certificateFileName')) {
                        <small class="field-hint">Ficheiro atual: {{ trainingFieldValue(entryId, 'certificateFileName') }}</small>
                      }
                    </label>
                  </div>
                }
              </div>
            }

            <div class="training-actions">
              <button type="button" class="secondary-button" (click)="addTrainingEntry()" [disabled]="!canAddTrainingEntry()">
                Informar outra formação profissional
              </button>
            </div>
          </div>
        </section>

        <section id="disponibilidade" class="signup-section">
          <div class="section-title">
            <span>6</span>
            <div>
              <h2>Disponibilidade</h2>
              <p>Dias, períodos e formatos de trabalho aceites.</p>
            </div>
          </div>
          <fieldset>
            <legend>Dias da semana <strong>*</strong></legend>
            <div class="checkbox-grid compact">
              @for (day of weekDays; track day) {
                <label><input type="checkbox" name="weekDays" [value]="day" [checked]="isChecked('publicProfile.availability.weekDays', day)" /> {{ day }}</label>
              }
            </div>
          </fieldset>
          <fieldset>
            <legend>Períodos <strong>*</strong></legend>
            <div class="checkbox-grid compact">
              @for (period of periods; track period) {
                <label><input type="checkbox" name="periods" [value]="period" [checked]="isChecked('publicProfile.availability.periods', period)" /> {{ period }}</label>
              }
            </div>
          </fieldset>
          <fieldset>
            <legend>Disponível para</legend>
            <div class="checkbox-grid compact">
              @for (type of availabilityTypes; track type) {
                <label><input type="checkbox" name="availabilityTypes" [value]="type" [checked]="isChecked('publicProfile.availability.availabilityTypes', type)" /> {{ type }}</label>
              }
            </div>
          </fieldset>
        </section>

        <section id="valores" class="signup-section">
          <div class="section-title">
            <span>7</span>
            <div>
              <h2>Valores</h2>
              <p>Comece pelo valor por hora; outros valores podem ser adicionados depois.</p>
            </div>
          </div>
          <div class="form-grid four-columns">
            <label>Valor por hora (€) <strong>*</strong><input type="number" name="hourlyRate" required min="0" step="0.5" placeholder="15" [value]="fieldValue('publicProfile.rates.hourlyRate')" /></label>
            <label>Valor por turno<input type="number" name="shiftRate" min="0" step="0.5" [value]="fieldValue('publicProfile.rates.shiftRate')" /></label>
            <label>Valor por dia<input type="number" name="dayRate" min="0" step="0.5" [value]="fieldValue('publicProfile.rates.dayRate')" /></label>
            <label>Valor mensal<input type="number" name="monthlyRate" min="0" step="0.5" [value]="fieldValue('publicProfile.rates.monthlyRate')" /></label>
          </div>
        </section>

        <section id="competencias" class="signup-section">
          <div class="section-title">
            <span>8</span>
            <div>
              <h2>Competências</h2>
              <p>Assinale competências que fazem parte da sua prática.</p>
            </div>
          </div>
          <div class="checkbox-grid">
            @for (skill of skills; track skill) {
              <label><input type="checkbox" name="skills" [value]="skill" [checked]="isChecked('publicProfile.skills', skill)" /> {{ skill }}</label>
            }
          </div>
        </section>

        <section id="idiomas-mobilidade" class="signup-section">
          <div class="section-title">
            <span>9</span>
            <div>
              <h2>Idiomas e mobilidade</h2>
              <p>Ajuda a família a entender comunicação e deslocação.</p>
            </div>
          </div>
          <fieldset>
            <legend>Idiomas</legend>
            <div class="checkbox-grid compact">
              @for (language of languages; track language) {
                <label><input type="checkbox" name="languages" [value]="language" [checked]="isChecked('publicProfile.languages', language)" /> {{ language }}</label>
              }
            </div>
          </fieldset>
          <fieldset>
            <legend>Mobilidade</legend>
            <div class="checkbox-grid compact">
              <label><input type="checkbox" name="drivingLicense" [checked]="isChecked('publicProfile.mobility.drivingLicense')" /> Possui carta de condução</label>
              <label><input type="checkbox" name="ownVehicle" [checked]="isChecked('publicProfile.mobility.ownVehicle')" /> Possui viatura própria</label>
              <label><input type="checkbox" name="acceptsTravel" [checked]="isChecked('publicProfile.mobility.acceptsTravel')" /> Aceita deslocações</label>
            </div>
          </fieldset>
        </section>

        <section id="referencias" class="signup-section">
          <div class="section-title">
            <span>10</span>
            <div>
              <h2>Referências</h2>
              <p>Opcional, mas útil para validação posterior.</p>
            </div>
          </div>
          <div class="form-grid three-columns">
            <label>Nome da referência<input name="referenceName" placeholder="Nome completo" [value]="fieldValue('private.reference.name')" /></label>
            <label>Contacto<input name="referenceContact" placeholder="Telemóvel ou email" [value]="fieldValue('private.reference.contact')" /></label>
            <label>Relação profissional<input name="referenceRelation" placeholder="Ex.: antiga família, instituição" [value]="fieldValue('private.reference.relation')" /></label>
          </div>
        </section>
        </fieldset>

        <div class="form-actions">
          @if (approvalLockMessage()) {
            <p class="form-message info-message" role="status">{{ approvalLockMessage() }}</p>
          }
          @if (errorMessage) {
            <p class="form-message error-message" role="alert">{{ errorMessage }}</p>
          }
          @if (successMessage) {
            <p class="form-message success-message" role="status">{{ successMessage }}</p>
          }
          <button class="button" type="submit" [disabled]="isSubmitting || !canEditProfile()">
            {{ isSubmitting ? 'A gravar...' : submitButtonLabel() }}
          </button>
          <a class="button-secondary" routerLink="/como-funciona/cuidadores">Ver como funciona</a>
        </div>
      </form>
    </section>
  `,
  styleUrl: './become-caregiver.scss',
})
export class BecomeCaregiverComponent implements OnInit {
  private readonly authService = inject(Auth);

  protected isSubmitting = false;
  protected errorMessage = '';
  protected successMessage = '';
  protected readonly accountEmail = signal('');
  protected readonly hasExistingCaregiverProfile = signal(false);
  protected readonly profilePhotoPreviewUrl = signal('');
  protected readonly canEditProfile = signal(true);
  protected readonly approvalLockMessage = signal('');
  protected readonly submitButtonLabel = signal('Guardar registo inicial');
  protected readonly locale = signal<CaregiverSignupLocale>('pt-PT');
  private readonly existingCaregiverProfile = signal<CaregiverProfileDocument | null>(null);

  protected copy(): (typeof CAREGIVER_SIGNUP_COPY)[CaregiverSignupLocale] {
    return CAREGIVER_SIGNUP_COPY[this.locale()];
  }

  protected readonly sections = [
    { id: 'conta', label: 'Conta' },
    { id: 'dados-pessoais', label: 'Dados pessoais' },
    { id: 'localizacao', label: 'Localização' },
    { id: 'perfil-profissional', label: 'Perfil' },
    { id: 'formacao', label: 'Formação' },
    { id: 'disponibilidade', label: 'Disponibilidade' },
    { id: 'valores', label: 'Valores' },
    { id: 'competencias', label: 'Competências' },
    { id: 'idiomas-mobilidade', label: 'Idiomas e mobilidade' },
  ];

  protected readonly serviceTypes = [
    'Companhia',
    'Higiene pessoal',
    'Preparação de refeições',
    'Administração de medicação',
    'Acompanhamento a consultas',
    'Limpeza doméstica leve',
    'Mobilidade reduzida',
    'Acompanhamento noturno',
    'Cuidados paliativos',
    'Alzheimer',
    'Demência',
  ];

  protected readonly trainingTypes = [
    'Curso de cuidador',
    'Auxiliar de geriatria',
    'Enfermagem',
    'Primeiros socorros',
  ];

  protected readonly trainingEntryIds = signal<number[]>([0]);
  protected readonly trainingSelections = signal<Record<number, string>>({});
  protected readonly existingTrainingEntries = signal<Record<number, TrainingEntryData>>({});
  private nextTrainingEntryId = 1;

  protected readonly weekDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  protected readonly periods = ['Manhã', 'Tarde', 'Noite'];
  protected readonly availabilityTypes = ['Serviços pontuais', 'Part-time', 'Full-time', 'Pernoita', 'Interno'];

  protected readonly skills = [
    'Primeiros socorros',
    'Alzheimer',
    'Demência',
    'Mobilidade reduzida',
    'Transferência cama/cadeira',
    'Administração de medicação',
    'Preparação de refeições',
    'Condução de veículo',
    'Utilização de equipamentos médicos',
  ];

  protected readonly languages = ['Português', 'Inglês', 'Francês', 'Espanhol', 'Outro'];

  async ngOnInit(): Promise<void> {
    const user = await this.authService.getCurrentUser();
    this.accountEmail.set(user?.email ?? '');

    if (!user) {
      return;
    }

    const caregiverProfile = await this.authService.getCaregiverProfile(user.uid);
    this.existingCaregiverProfile.set(caregiverProfile);
    this.hasExistingCaregiverProfile.set(!!caregiverProfile);
    this.profilePhotoPreviewUrl.set(this.fieldValue('publicProfile.profilePhoto.base64'));
    this.loadTrainingEntries(caregiverProfile);
    this.applyApprovalLock(caregiverProfile);
    this.submitButtonLabel.set(caregiverProfile ? 'Atualizar dados do cuidador' : 'Guardar registo inicial');
  }

  protected async onSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.canEditProfile()) {
      this.errorMessage = this.approvalLockMessage();
      return;
    }

    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const validationMessage = this.getCaregiverValidationMessage(form, formData);
    if (validationMessage) {
      this.errorMessage = validationMessage;
      return;
    }

    let data: CaregiverRegistration;
    try {
      data = await this.buildCaregiverRegistration(formData);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível processar a foto de perfil.';
      return;
    }

    const missingGroup = this.getMissingRequiredGroup(data);
    if (missingGroup) {
      this.errorMessage = `Selecione pelo menos uma opção em ${missingGroup}.`;
      return;
    }

    this.isSubmitting = true;
    try {
      await this.authService.registerCaregiver(data);
      form.reset();
      this.successMessage = 'Registo guardado com sucesso. O perfil de cuidador foi atualizado.';
      window.location.assign('/dashboard/cuidador');
    } catch (error) {
      this.errorMessage = this.authService.getFirebaseErrorMessage(error);
    } finally {
      this.isSubmitting = false;
    }
  }

  protected scrollToSection(event: MouseEvent, sectionId: string): void {
    event.preventDefault();
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    history.replaceState(null, '', `/seja-cuidador#${sectionId}`);
  }

  protected fieldValue(path: string): string {
    const value = this.profileValue(path);
    if (typeof value === 'number') {
      return String(value);
    }

    return typeof value === 'string' ? value : '';
  }

  protected isChecked(path: string, option?: string): boolean {
    const value = this.profileValue(path);
    if (Array.isArray(value) && option) {
      return value.includes(option);
    }

    return typeof value === 'boolean' ? value : false;
  }

  protected profilePhotoActionLabel(): string {
    return this.profilePhotoPreviewUrl() ? 'Alterar foto de perfil' : 'Adicionar foto de perfil';
  }

  protected profilePhotoInitials(): string {
    const fullName = this.fieldValue('publicProfile.fullName');
    const fallback = this.accountEmail();
    const source = fullName || fallback;
    const initials = source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');

    return initials || '+';
  }

  protected async onProfilePhotoChange(event: Event): Promise<void> {
    this.errorMessage = '';

    if (!this.canEditProfile()) {
      this.errorMessage = this.approvalLockMessage();
      return;
    }

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      this.profilePhotoPreviewUrl.set(this.fieldValue('publicProfile.profilePhoto.base64'));
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'A foto de perfil deve ser um ficheiro de imagem.';
      input.value = '';
      return;
    }

    if (file.size > PROFILE_PHOTO_MAX_FILE_BYTES) {
      this.errorMessage = 'A foto de perfil deve ter no máximo 1 MB.';
      input.value = '';
      return;
    }

    try {
      this.profilePhotoPreviewUrl.set(await this.readFileAsDataUrl(file));
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível carregar a foto de perfil.';
      input.value = '';
    }
  }

  protected selectedTrainingType(entryId: number): string {
    return this.trainingSelections()[entryId] ?? '';
  }

  protected availableTrainingTypes(entryId: number): string[] {
    const selected = this.trainingSelections();
    const currentValue = selected[entryId];
    const selectedByOtherEntries = new Set(
      Object.entries(selected)
        .filter(([id, value]) => Number(id) !== entryId && !!value)
        .map(([, value]) => value),
    );

    return this.trainingTypes.filter((course) => course === currentValue || !selectedByOtherEntries.has(course));
  }

  protected canAddTrainingEntry(): boolean {
    const selectedCount = Object.values(this.trainingSelections()).filter(Boolean).length;
    return this.trainingEntryIds().length < this.trainingTypes.length && selectedCount < this.trainingTypes.length;
  }

  protected addTrainingEntry(): void {
    if (!this.canAddTrainingEntry()) {
      return;
    }

    const entryId = this.nextTrainingEntryId;
    this.nextTrainingEntryId += 1;
    this.trainingEntryIds.update((entryIds) => [...entryIds, entryId]);
  }

  protected removeTrainingEntry(entryId: number): void {
    this.trainingEntryIds.update((entryIds) => {
      const nextEntryIds = entryIds.filter((id) => id !== entryId);
      return nextEntryIds.length ? nextEntryIds : [0];
    });
    this.trainingSelections.update((selected) => {
      const nextSelected = { ...selected };
      delete nextSelected[entryId];
      return nextSelected;
    });
    this.existingTrainingEntries.update((entries) => {
      const nextEntries = { ...entries };
      delete nextEntries[entryId];
      return nextEntries;
    });
  }

  protected onTrainingTypeChange(entryId: number, event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.trainingSelections.update((selected) => ({
      ...selected,
      [entryId]: select.value,
    }));
  }

  protected trainingFieldValue(entryId: number, key: keyof TrainingEntryData): string {
    const value = this.existingTrainingEntries()[entryId]?.[key];
    return typeof value === 'string' ? value : '';
  }

  protected onCertificateFileChange(event: Event): void {
    this.errorMessage = '';
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'O certificado deve ser enviado como imagem.';
      input.value = '';
      return;
    }

    if (file.size > CERTIFICATE_IMAGE_MAX_FILE_BYTES) {
      this.errorMessage = 'A imagem do certificado deve ter no máximo 5 MB.';
      input.value = '';
    }
  }

  private loadTrainingEntries(caregiverProfile: CaregiverProfileDocument | null): void {
    if (!caregiverProfile) {
      this.trainingEntryIds.set([0]);
      this.trainingSelections.set({});
      this.existingTrainingEntries.set({});
      this.nextTrainingEntryId = 1;
      return;
    }

    const items = this.profileValue('private.training.items');
    if (Array.isArray(items) && items.length) {
      const entryIds = items.map((_, index) => index);
      const selections: Record<number, string> = {};
      const entries: Record<number, TrainingEntryData> = {};

      items.forEach((item, index) => {
        if (!item || typeof item !== 'object') {
          return;
        }

        const trainingItem = item as Record<string, unknown>;
        const entry: TrainingEntryData = {
          id: this.stringFromRecord(trainingItem, 'id') || this.createLocalId(),
          trainingType: this.stringFromRecord(trainingItem, 'trainingType'),
          courseName: this.stringFromRecord(trainingItem, 'courseName'),
          trainingEntity: this.stringFromRecord(trainingItem, 'trainingEntity'),
          completionDate: this.stringFromRecord(trainingItem, 'completionDate'),
          certificateFileName: this.stringFromRecord(trainingItem, 'certificateFileName'),
          certificate: this.certificateFromRecord(trainingItem['certificate']),
        };

        selections[index] = entry.trainingType;
        entries[index] = entry;
      });

      this.trainingEntryIds.set(entryIds);
      this.trainingSelections.set(selections);
      this.existingTrainingEntries.set(entries);
      this.nextTrainingEntryId = entryIds.length;
      return;
    }

    const legacyTrainingTypes = this.profileValue('publicProfile.trainingTypes');
    if (Array.isArray(legacyTrainingTypes) && legacyTrainingTypes.length) {
      const entryIds = legacyTrainingTypes.map((_, index) => index);
      const selections: Record<number, string> = {};
      const entries: Record<number, TrainingEntryData> = {};

      legacyTrainingTypes.forEach((trainingType, index) => {
        const value = typeof trainingType === 'string' ? trainingType : '';
        selections[index] = value;
        entries[index] = {
          id: this.createLocalId(),
          trainingType: value,
          courseName: index === 0 ? this.fieldValue('private.training.courseName') : '',
          trainingEntity: index === 0 ? this.fieldValue('private.training.trainingEntity') : '',
          completionDate: index === 0 ? this.legacyCompletionDateValue() : '',
          certificateFileName: '',
          certificate: null,
        };
      });

      this.trainingEntryIds.set(entryIds);
      this.trainingSelections.set(selections);
      this.existingTrainingEntries.set(entries);
      this.nextTrainingEntryId = entryIds.length;
      return;
    }

    this.trainingEntryIds.set([0]);
    this.trainingSelections.set({});
    this.existingTrainingEntries.set({});
    this.nextTrainingEntryId = 1;
  }

  private legacyCompletionDateValue(): string {
    const completionYear = this.fieldValue('private.training.completionYear');
    return completionYear ? `${completionYear}-01-01` : '';
  }

  private stringFromRecord(record: Record<string, unknown>, key: string): string {
    const value = record[key];
    return typeof value === 'string' ? value : '';
  }

  private trainingEntryPersistentId(entryId: number): string {
    const existingId = this.trainingFieldValue(entryId, 'id');
    if (existingId) {
      return existingId;
    }

    const generatedId = this.createLocalId();
    this.existingTrainingEntries.update((entries) => ({
      ...entries,
      [entryId]: {
        ...entries[entryId],
        id: generatedId,
        trainingType: entries[entryId]?.trainingType ?? '',
        courseName: entries[entryId]?.courseName ?? '',
        trainingEntity: entries[entryId]?.trainingEntity ?? '',
        completionDate: entries[entryId]?.completionDate ?? '',
        certificateFileName: entries[entryId]?.certificateFileName ?? '',
        certificate: entries[entryId]?.certificate ?? null,
      },
    }));
    return generatedId;
  }

  private trainingCertificateValue(entryId: number): CaregiverTrainingCertificate | null {
    return this.existingTrainingEntries()[entryId]?.certificate ?? null;
  }

  private certificateFromRecord(value: unknown): CaregiverTrainingCertificate | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const certificate = value as Record<string, unknown>;
    if (
      typeof certificate['storagePath'] !== 'string' ||
      typeof certificate['fileName'] !== 'string' ||
      typeof certificate['contentType'] !== 'string' ||
      typeof certificate['originalSize'] !== 'number' ||
      typeof certificate['compressedSize'] !== 'number' ||
      typeof certificate['uploadedAt'] !== 'string'
    ) {
      return null;
    }

    return {
      storagePath: certificate['storagePath'],
      fileName: certificate['fileName'],
      contentType: certificate['contentType'],
      originalSize: certificate['originalSize'],
      compressedSize: certificate['compressedSize'],
      uploadedAt: certificate['uploadedAt'],
      status: 'pending',
    };
  }

  private createLocalId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private applyApprovalLock(caregiverProfile: CaregiverProfileDocument | null): void {
    const approvalSummary = this.authService.getCaregiverApprovalSummary(caregiverProfile);

    this.canEditProfile.set(approvalSummary.canEdit);
    if (approvalSummary.canEdit || !approvalSummary.approval) {
      this.approvalLockMessage.set('');
      return;
    }

    this.approvalLockMessage.set(
      `O cadastro foi aprovado no dia ${this.formatDate(approvalSummary.approvalDate)}. ` +
        `Os dados pessoais só poderão ser alterados novamente a partir de ${this.formatDate(approvalSummary.canEditFrom)}, ` +
        '5 dias após a aprovação.',
    );
  }

  private async buildCaregiverRegistration(formData: FormData): Promise<CaregiverRegistration> {
    const profilePhoto = await this.profilePhotoValue(formData, 'profilePhoto');
    const profilePhotoName = profilePhoto?.name ?? this.fieldValue('publicProfile.profilePhotoName');

    return {
      account: {
        email: this.textValue(formData, 'email'),
        acceptedTerms: this.booleanValue(formData, 'acceptedTerms'),
        acceptedPrivacy: this.booleanValue(formData, 'acceptedPrivacy'),
      },
      personal: {
        fullName: this.textValue(formData, 'fullName'),
        birthDate: this.textValue(formData, 'birthDate'),
        gender: this.textValue(formData, 'gender'),
        nationality: this.textValue(formData, 'nationality'),
        phone: this.textValue(formData, 'phone'),
        profilePhotoName,
        profilePhoto,
        private: {
          nif: this.textValue(formData, 'nif'),
          documentType: this.textValue(formData, 'documentType'),
          idDocument: this.textValue(formData, 'idDocument'),
        },
      },
      location: {
        district: this.textValue(formData, 'district'),
        county: this.textValue(formData, 'county'),
        postalCode: this.textValue(formData, 'postalCode'),
        travelRadius: this.textValue(formData, 'travelRadius'),
        private: {
          address: this.textValue(formData, 'address'),
        },
      },
      professional: {
        summary: this.textValue(formData, 'summary'),
        experienceYears: this.numberValue(formData, 'experienceYears') ?? 0,
        serviceTypes: this.arrayValue(formData, 'serviceTypes'),
      },
      training: {
        items: await this.trainingItemsValue(formData),
      },
      availability: {
        weekDays: this.arrayValue(formData, 'weekDays'),
        periods: this.arrayValue(formData, 'periods'),
        availabilityTypes: this.arrayValue(formData, 'availabilityTypes'),
      },
      rates: {
        hourlyRate: this.numberValue(formData, 'hourlyRate') ?? 0,
        shiftRate: this.numberValue(formData, 'shiftRate'),
        dayRate: this.numberValue(formData, 'dayRate'),
        monthlyRate: this.numberValue(formData, 'monthlyRate'),
      },
      skills: this.arrayValue(formData, 'skills'),
      languages: this.arrayValue(formData, 'languages'),
      mobility: {
        drivingLicense: this.booleanValue(formData, 'drivingLicense'),
        ownVehicle: this.booleanValue(formData, 'ownVehicle'),
        acceptsTravel: this.booleanValue(formData, 'acceptsTravel'),
      },
      reference: {
        name: this.textValue(formData, 'referenceName'),
        contact: this.textValue(formData, 'referenceContact'),
        relation: this.textValue(formData, 'referenceRelation'),
      },
    };
  }

  private async trainingItemsValue(formData: FormData): Promise<CaregiverRegistration['training']['items']> {
    const items = await Promise.all(
      this.trainingEntryIds().map(async (entryId) => {
        const trainingType = this.textValue(formData, `trainingType-${entryId}`);
        if (!trainingType) {
          return null;
        }

        const certificate = formData.get(`certificateFile-${entryId}`);
        const certificateFileName =
          certificate instanceof File && certificate.name
            ? certificate.name
            : this.trainingFieldValue(entryId, 'certificateFileName');
        const certificateUpload = await this.certificateUploadValue(formData, entryId);

        return {
          id: this.trainingEntryPersistentId(entryId),
          trainingType,
          courseName: this.textValue(formData, `courseName-${entryId}`),
          trainingEntity: this.textValue(formData, `trainingEntity-${entryId}`),
          completionDate: this.textValue(formData, `completionDate-${entryId}`),
          certificateFileName,
          certificate: this.trainingCertificateValue(entryId),
          certificateUpload,
        };
      }),
    );

    return items.filter((item): item is CaregiverRegistration['training']['items'][number] => !!item);
  }

  private getMissingRequiredGroup(data: CaregiverRegistration): string {
    if (data.professional.serviceTypes.length === 0) {
      return 'Tipos de serviço prestados';
    }
    if (data.availability.weekDays.length === 0) {
      return 'Dias da semana';
    }
    if (data.availability.periods.length === 0) {
      return 'Períodos';
    }

    return '';
  }

  private getCaregiverValidationMessage(form: HTMLFormElement, formData: FormData): string {
    const requiredFields = [
      { key: 'email', label: 'Email' },
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
      { key: 'summary', label: 'Resumo profissional' },
      { key: 'experienceYears', label: 'Anos de experiência' },
      { key: 'serviceTypes', label: 'Tipos de serviço prestados', type: 'array' },
      { key: 'weekDays', label: 'Dias da semana', type: 'array' },
      { key: 'periods', label: 'Períodos', type: 'array' },
      { key: 'hourlyRate', label: 'Valor por hora' },
    ];

    for (const field of requiredFields) {
      if (field.type === 'checkbox' && !formData.has(field.key)) {
        return `${field.label} é obrigatório.`;
      }

      if (field.type === 'array' && this.arrayValue(formData, field.key).length === 0) {
        return `Selecione pelo menos uma opção em ${field.label}.`;
      }

      const value = this.textValue(formData, field.key);
      if (!field.type && !value) {
        return `${field.label} é obrigatório.`;
      }

      const control = form.elements.namedItem(field.key);
      if (
        control instanceof HTMLInputElement ||
        control instanceof HTMLSelectElement ||
        control instanceof HTMLTextAreaElement
      ) {
        if (!control.checkValidity()) {
          return this.controlValidationMessage(control, field.label);
        }
      }

      if (field.type === 'birthDate' && !this.isAdult(value)) {
        return 'É necessário ter pelo menos 18 anos para se registar como cuidador.';
      }
    }

    return this.getTrainingValidationMessage(formData);
  }

  private getTrainingValidationMessage(formData: FormData): string {
    for (const entryId of this.trainingEntryIds()) {
      const trainingType = this.textValue(formData, `trainingType-${entryId}`);
      if (!trainingType) {
        continue;
      }

      const fields = [
        { key: `courseName-${entryId}`, label: `Nome do curso em ${trainingType}` },
        { key: `trainingEntity-${entryId}`, label: `Entidade formadora em ${trainingType}` },
        { key: `completionDate-${entryId}`, label: `Data de conclusão em ${trainingType}` },
      ];

      for (const field of fields) {
        if (!this.textValue(formData, field.key)) {
          return `${field.label} é obrigatório.`;
        }
      }

      const certificate = formData.get(`certificateFile-${entryId}`);
      if (certificate instanceof File && certificate.name && !certificate.type.startsWith('image/')) {
        return `A imagem do certificado em ${trainingType} deve ser um ficheiro de imagem.`;
      }

      if (certificate instanceof File && certificate.name && certificate.size > CERTIFICATE_IMAGE_MAX_FILE_BYTES) {
        return `A imagem do certificado em ${trainingType} deve ter no máximo 5 MB.`;
      }

      if (
        (!(certificate instanceof File) || !certificate.name) &&
        !this.trainingFieldValue(entryId, 'certificateFileName')
      ) {
        return `A imagem do certificado em ${trainingType} é obrigatória.`;
      }
    }

    return '';
  }

  private controlValidationMessage(
    control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
    label: string,
  ): string {
    if (control.validity.valueMissing) {
      return `${label} é obrigatório.`;
    }
    if (control.validity.typeMismatch || control.validity.badInput) {
      return `${label} não está válido.`;
    }
    if (control.validity.rangeUnderflow || control.validity.rangeOverflow) {
      return `${label} está fora do intervalo permitido.`;
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

  private formatDate(date: Date | null): string {
    if (!date) {
      return 'data não informada';
    }

    return new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  private textValue(formData: FormData, key: string): string {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : '';
  }

  private arrayValue(formData: FormData, key: string): string[] {
    return formData.getAll(key).filter((value): value is string => typeof value === 'string');
  }

  private booleanValue(formData: FormData, key: string): boolean {
    return formData.has(key);
  }

  private numberValue(formData: FormData, key: string): number | null {
    const value = this.textValue(formData, key);
    return value ? Number(value) : null;
  }

  private async profilePhotoValue(
    formData: FormData,
    key: string,
  ): Promise<CaregiverRegistration['personal']['profilePhoto']> {
    const value = formData.get(key);
    if (!(value instanceof File) || !value.name) {
      return this.existingProfilePhoto();
    }

    if (!value.type.startsWith('image/')) {
      throw new Error('A foto de perfil deve ser um ficheiro de imagem.');
    }

    if (value.size > PROFILE_PHOTO_MAX_FILE_BYTES) {
      throw new Error('A foto de perfil deve ter no máximo 1 MB.');
    }

    const base64 = await this.compressImageAsDataUrl(value);
    const base64Bytes = new TextEncoder().encode(base64).length;
    if (base64Bytes > PROFILE_PHOTO_MAX_FIRESTORE_BYTES) {
      throw new Error(
        'Não foi possível reduzir a foto para menos de 800 KB em base64. Use uma imagem mais leve.',
      );
    }

    return {
      name: value.name,
      type: 'image/jpeg',
      size: base64Bytes,
      base64,
    };
  }

  private async certificateUploadValue(
    formData: FormData,
    entryId: number,
  ): Promise<CaregiverRegistration['training']['items'][number]['certificateUpload']> {
    const value = formData.get(`certificateFile-${entryId}`);
    if (!(value instanceof File) || !value.name) {
      return null;
    }

    if (!value.type.startsWith('image/')) {
      throw new Error('O certificado deve ser enviado como imagem.');
    }

    if (value.size > CERTIFICATE_IMAGE_MAX_FILE_BYTES) {
      throw new Error('A imagem do certificado deve ter no máximo 5 MB.');
    }

    const blob = await this.compressCertificateImage(value);
    return {
      name: value.name,
      contentType: 'image/jpeg',
      originalSize: value.size,
      compressedSize: blob.size,
      blob,
    };
  }

  private profileValue(path: string): unknown {
    return path.split('.').reduce<unknown>((currentValue, key) => {
      if (!currentValue || typeof currentValue !== 'object') {
        return undefined;
      }

      return (currentValue as Record<string, unknown>)[key];
    }, this.existingCaregiverProfile());
  }

  private existingProfilePhoto(): CaregiverRegistration['personal']['profilePhoto'] {
    const value = this.profileValue('publicProfile.profilePhoto');
    if (!value || typeof value !== 'object') {
      return null;
    }

    const profilePhoto = value as Record<string, unknown>;
    if (
      typeof profilePhoto['name'] !== 'string' ||
      typeof profilePhoto['type'] !== 'string' ||
      typeof profilePhoto['size'] !== 'number' ||
      typeof profilePhoto['base64'] !== 'string'
    ) {
      return null;
    }

    return {
      name: profilePhoto['name'],
      type: profilePhoto['type'],
      size: profilePhoto['size'],
      base64: profilePhoto['base64'],
    };
  }

  private async compressImageAsDataUrl(file: File): Promise<string> {
    const originalDataUrl = await this.readFileAsDataUrl(file);
    if (new TextEncoder().encode(originalDataUrl).length <= PROFILE_PHOTO_MAX_FIRESTORE_BYTES) {
      return originalDataUrl;
    }

    const image = await this.loadImage(originalDataUrl);
    let { width, height } = this.fitImageSize(image.width, image.height, PROFILE_PHOTO_MAX_DIMENSION);

    while (width >= 320 && height >= 320) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Não foi possível otimizar a foto de perfil.');
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      for (let quality = 0.82; quality >= PROFILE_PHOTO_MIN_QUALITY; quality -= 0.08) {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (new TextEncoder().encode(dataUrl).length <= PROFILE_PHOTO_MAX_FIRESTORE_BYTES) {
          return dataUrl;
        }
      }

      width = Math.floor(width * 0.82);
      height = Math.floor(height * 0.82);
    }

    throw new Error('Não foi possível reduzir a foto para menos de 800 KB em base64. Use uma imagem mais leve.');
  }

  private async compressCertificateImage(file: File): Promise<Blob> {
    const originalDataUrl = await this.readFileAsDataUrl(file);
    const image = await this.loadImage(originalDataUrl);
    let { width, height } = this.fitImageSize(image.width, image.height, CERTIFICATE_IMAGE_MAX_DIMENSION);
    let bestBlob: Blob | null = null;

    while (width >= 640 && height >= 640) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Não foi possível otimizar a imagem do certificado.');
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      for (let quality = 0.82; quality >= CERTIFICATE_IMAGE_MIN_QUALITY; quality -= 0.06) {
        const blob = await this.canvasToJpegBlob(canvas, quality);
        bestBlob = !bestBlob || blob.size < bestBlob.size ? blob : bestBlob;
        if (blob.size <= CERTIFICATE_IMAGE_TARGET_BYTES) {
          return blob;
        }
      }

      width = Math.floor(width * 0.86);
      height = Math.floor(height * 0.86);
    }

    if (bestBlob) {
      return bestBlob;
    }

    throw new Error('Não foi possível otimizar a imagem do certificado.');
  }

  private canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
            return;
          }

          reject(new Error('Não foi possível gerar a imagem otimizada do certificado.'));
        },
        'image/jpeg',
        quality,
      );
    });
  }

  private fitImageSize(width: number, height: number, maxDimension: number): { width: number; height: number } {
    if (width <= maxDimension && height <= maxDimension) {
      return { width, height };
    }

    const ratio = Math.min(maxDimension / width, maxDimension / height);
    return {
      width: Math.round(width * ratio),
      height: Math.round(height * ratio),
    };
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Não foi possível carregar a foto de perfil.'));
      image.src = src;
    });
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }

        reject(new Error('Não foi possível ler a foto de perfil.'));
      };
      reader.onerror = () => reject(new Error('Não foi possível ler a foto de perfil.'));
      reader.readAsDataURL(file);
    });
  }
}
