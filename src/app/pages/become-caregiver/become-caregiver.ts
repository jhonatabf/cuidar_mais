import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';

import {
  Auth,
  CaregiverProfileDocument,
  CaregiverRegistration,
  CaregiverTrainingCertificate,
} from '../../core/services/auth';
import { AppLocale, LocaleService } from '../../core/services/locale';

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

const CAREGIVER_SIGNUP_COPY = {
  'pt-PT': {
    step: 'Etapa 3 de 3',
    stepName: 'Perfil de cuidador',
    stepAria: 'Etapa 3 de 3: perfil de cuidador',
    badge: 'Uma dica',
    title: 'Crie um perfil claro, fiável e rápido de avaliar.',
    lead:
      'O registo inicial recolhe apenas o essencial para apresentar o cuidador às famílias, mantendo os dados sensíveis privados.',
    summaryTitle: 'Perfil público simples',
    summaryText:
      'As famílias verão o resumo, os serviços, a disponibilidade, a localização aproximada, os idiomas e as competências.',
    privacyNote: 'NIF, documento, morada e contactos privados não aparecem no perfil público.',
    summaryAria: 'Resumo do registo', reviewTitle: 'Validação pela wecareparents', reviewText: 'Depois de guardar o cadastro de cuidador, o perfil será submetido para validação pela equipa wecareparents. O perfil só ficará disponível após aprovação e será notificado quando a análise terminar.', closeNotice: 'Fechar aviso',
    professional: 'Perfil profissional', professionalHelp: 'Informação pública que ajuda a família a decidir.', professionalSummary: 'Resumo profissional', professionalPlaceholder: 'Descreva a sua experiência, estilo de cuidado e tipo de pessoa que costuma acompanhar.', experienceYears: 'Anos de experiência', exampleFive: 'Ex.: 5', serviceTypes: 'Tipos de serviço prestados',
    training: 'Formação', trainingHelp: 'Opcional, mas recomendado para perfis profissionais.', remove: 'Remover', professionalTraining: 'Formação profissional', selectTraining: 'Selecionar formação', courseName: 'Nome do curso', coursePlaceholder: 'Ex.: Curso de cuidador sénior', trainingEntity: 'Entidade formadora', institutionPlaceholder: 'Nome da instituição', completionDate: 'Data de conclusão', certificateImage: 'Imagem do certificado', certificateHint: 'Pode enviar uma foto até 5 MB. A imagem será otimizada automaticamente.', currentFile: 'Ficheiro atual', addTraining: 'Informar outra formação profissional',
    availability: 'Disponibilidade', availabilityHelp: 'Dias, períodos e formatos de trabalho aceites.', weekDays: 'Dias da semana', periods: 'Períodos', availableFor: 'Disponível para',
    rates: 'Valores', ratesHelp: 'Indique pelo menos uma modalidade de valor.', atLeastOneRate: 'Preencha pelo menos um dos valores', hourlyRate: 'Valor por hora (€)', shiftRate: 'Valor por turno', dayRate: 'Valor por dia', monthlyRate: 'Valor mensal',
    skills: 'Competências', skillsHelp: 'Assinale competências que fazem parte da sua prática.',
    languagesMobility: 'Idiomas e mobilidade', languagesMobilityHelp: 'Ajuda a família a entender comunicação e deslocação.', languages: 'Idiomas', mobility: 'Mobilidade', drivingLicense: 'Possui carta de condução', ownVehicle: 'Possui viatura própria', acceptsTravel: 'Aceita deslocações', travelRadius: 'Raio máximo de deslocação', select: 'Selecionar',
    references: 'Referências', referencesHelp: 'Opcional, mas útil para validação posterior.', referenceName: 'Nome da referência', fullName: 'Nome completo', professionalRelation: 'Relação profissional', relationPlaceholder: 'Ex.: antiga família, instituição', callingCode: 'Indicativo internacional (DDI)', mobile: 'Telemóvel',
    saving: 'A gravar...', update: 'Atualizar dados do cuidador', save: 'Guardar registo inicial', dashboard: 'Voltar ao Dashboard', howItWorks: 'Ver como funciona',
    submitted: 'Cadastro submetido para validação. Será notificado quando a equipa wecareparents terminar a análise.', processError: 'Não foi possível processar o cadastro.', certificateImageOnly: 'O certificado deve ser enviado como imagem.', certificateMax: 'A imagem do certificado deve ter no máximo 5 MB.',
    required: (label: string) => `${label} é obrigatório.`, selectOne: (label: string) => `Selecione pelo menos uma opção em ${label}.`, invalid: (label: string) => `${label} não está válido.`, outOfRange: (label: string) => `${label} está fora do intervalo permitido.`, invalidReference: 'Introduza um contacto de referência válido para o indicativo selecionado.',
    courseIn: (type: string) => `Nome do curso em ${type}`, entityIn: (type: string) => `Entidade formadora em ${type}`, completionIn: (type: string) => `Data de conclusão em ${type}`, certificateMustImage: (type: string) => `A imagem do certificado em ${type} deve ser um ficheiro de imagem.`, certificateMaxFor: (type: string) => `A imagem do certificado em ${type} deve ter no máximo 5 MB.`, certificateRequired: (type: string) => `A imagem do certificado em ${type} é obrigatória.`,
    approved: (date: string, editDate: string) => `O cadastro foi aprovado no dia ${date}. Os dados pessoais só poderão ser alterados novamente a partir de ${editDate}, 5 dias após a aprovação.`, dateUnavailable: 'data não informada', optimizeImage: 'Não foi possível otimizar a imagem.',
  },
  'en-GB': {
    step: 'Step 3 of 3',
    stepName: 'Caregiver profile',
    stepAria: 'Step 3 of 3: caregiver profile',
    badge: 'A tip',
    title: 'Create a clear, reliable profile that is quick to review.',
    lead:
      'The initial registration collects only the essentials to present the caregiver to families while keeping sensitive data private.',
    summaryTitle: 'Simple public profile',
    summaryText:
      'Families will see the summary, services, availability, approximate location, languages and skills.',
    privacyNote: 'Tax ID, document, address and private contacts do not appear on the public profile.',
    summaryAria: 'Registration summary', reviewTitle: 'wecareparents review', reviewText: 'After saving your caregiver registration, the profile will be submitted to the wecareparents team for review. It will only become available after approval, and you will be notified when the review is complete.', closeNotice: 'Close notice',
    professional: 'Professional profile', professionalHelp: 'Public information that helps families decide.', professionalSummary: 'Professional summary', professionalPlaceholder: 'Describe your experience, care style and the type of person you usually support.', experienceYears: 'Years of experience', exampleFive: 'E.g. 5', serviceTypes: 'Services provided',
    training: 'Training', trainingHelp: 'Optional, but recommended for professional profiles.', remove: 'Remove', professionalTraining: 'Professional training', selectTraining: 'Select training', courseName: 'Course name', coursePlaceholder: 'E.g. Senior caregiver course', trainingEntity: 'Training provider', institutionPlaceholder: 'Institution name', completionDate: 'Completion date', certificateImage: 'Certificate image', certificateHint: 'You may upload an image up to 5 MB. It will be optimised automatically.', currentFile: 'Current file', addTraining: 'Add another professional qualification',
    availability: 'Availability', availabilityHelp: 'Accepted days, periods and working arrangements.', weekDays: 'Days of the week', periods: 'Periods', availableFor: 'Available for',
    rates: 'Rates', ratesHelp: 'Provide at least one rate option.', atLeastOneRate: 'Complete at least one rate', hourlyRate: 'Hourly rate (€)', shiftRate: 'Rate per shift', dayRate: 'Daily rate', monthlyRate: 'Monthly rate',
    skills: 'Skills', skillsHelp: 'Select the skills that are part of your practice.',
    languagesMobility: 'Languages and mobility', languagesMobilityHelp: 'Helps families understand communication and travel arrangements.', languages: 'Languages', mobility: 'Mobility', drivingLicense: 'I have a driving licence', ownVehicle: 'I have my own vehicle', acceptsTravel: 'I am willing to travel', travelRadius: 'Maximum travel radius', select: 'Select',
    references: 'References', referencesHelp: 'Optional, but useful for subsequent checks.', referenceName: 'Reference name', fullName: 'Full name', professionalRelation: 'Professional relationship', relationPlaceholder: 'E.g. previous family, institution', callingCode: 'International calling code', mobile: 'Mobile number',
    saving: 'Saving...', update: 'Update caregiver details', save: 'Save initial registration', dashboard: 'Back to Dashboard', howItWorks: 'See how it works',
    submitted: 'Registration submitted for review. You will be notified when the wecareparents team completes its assessment.', processError: 'The registration could not be processed.', certificateImageOnly: 'The certificate must be uploaded as an image.', certificateMax: 'The certificate image must be no larger than 5 MB.',
    required: (label: string) => `${label} is required.`, selectOne: (label: string) => `Select at least one option for ${label}.`, invalid: (label: string) => `${label} is not valid.`, outOfRange: (label: string) => `${label} is outside the permitted range.`, invalidReference: 'Enter a valid reference contact number for the selected calling code.',
    courseIn: (type: string) => `Course name for ${type}`, entityIn: (type: string) => `Training provider for ${type}`, completionIn: (type: string) => `Completion date for ${type}`, certificateMustImage: (type: string) => `The certificate for ${type} must be an image file.`, certificateMaxFor: (type: string) => `The certificate image for ${type} must be no larger than 5 MB.`, certificateRequired: (type: string) => `The certificate image for ${type} is required.`,
    approved: (date: string, editDate: string) => `The registration was approved on ${date}. Personal details can be changed again from ${editDate}, five days after approval.`, dateUnavailable: 'date unavailable', optimizeImage: 'The image could not be optimised.',
  },
} as const;

const CAREGIVER_OPTION_LABELS: Record<AppLocale, Record<string, string>> = {
  'pt-PT': {},
  'en-GB': {
    'Companhia': 'Companionship', 'Higiene pessoal': 'Personal hygiene', 'Preparação de refeições': 'Meal preparation', 'Administração de medicação': 'Medication assistance', 'Acompanhamento a consultas': 'Accompaniment to appointments', 'Limpeza doméstica leve': 'Light housekeeping', 'Mobilidade reduzida': 'Reduced mobility', 'Acompanhamento noturno': 'Overnight support', 'Cuidados paliativos': 'Palliative care',
    'Curso de cuidador': 'Caregiver course', 'Auxiliar de geriatria': 'Geriatric care assistant', 'Enfermagem': 'Nursing', 'Primeiros socorros': 'First aid', 'Fisioterapeuta': 'Physiotherapy', 'Massagista': 'Massage therapy',
    'Segunda': 'Monday', 'Terça': 'Tuesday', 'Quarta': 'Wednesday', 'Quinta': 'Thursday', 'Sexta': 'Friday', 'Sábado': 'Saturday', 'Domingo': 'Sunday', 'Manhã': 'Morning', 'Tarde': 'Afternoon', 'Noite': 'Night',
    'Serviços pontuais': 'One-off services', 'Part-time': 'Part-time', 'Full-time': 'Full-time', 'Pernoita': 'Overnight stays', 'Interno': 'Live-in care', 'Demência': 'Dementia', 'Transferência cama/cadeira': 'Bed/chair transfers', 'Condução de veículo': 'Driving', 'Utilização de equipamentos médicos': 'Use of medical equipment',
    'Português': 'Portuguese', 'Inglês': 'English', 'Francês': 'French', 'Espanhol': 'Spanish', 'Outro': 'Other',
    'Até 5 km': 'Up to 5 km', 'Até 10 km': 'Up to 10 km', 'Até 15 km': 'Up to 15 km', 'Até 20 km': 'Up to 20 km', 'Até 25 km': 'Up to 25 km', 'Até 30 km': 'Up to 30 km', 'Até 40 km': 'Up to 40 km', 'Até 50 km': 'Up to 50 km',
  },
};

@Component({
  selector: 'app-become-caregiver',
  imports: [RouterLink],
  template: `
    <section class="page caregiver-signup-hero">
      <div>
        <div class="registration-step" [attr.aria-label]="copy().stepAria">
          <span class="registration-step__number">3</span>
          <div>
            <strong>{{ copy().step }}</strong>
            <span>{{ copy().stepName }}</span>
          </div>
          <div class="registration-step__progress" aria-hidden="true">
            <span class="is-active"></span><span class="is-active"></span><span class="is-active"></span>
          </div>
        </div>
        <h1>{{ copy().title }}</h1>
        <p class="lead">
          {{ copy().lead }}
        </p>
      </div>

      <aside class="signup-summary" [attr.aria-label]="copy().summaryAria">
        <span class="badge">{{ copy().badge }}</span>
        <h3>{{ copy().summaryTitle }}</h3>
        <p>{{ copy().summaryText }}</p>
        <p class="privacy-note">{{ copy().privacyNote }}</p>
      </aside>
    </section>

    <section class="page signup-layout">
      <form
        class="caregiver-form"
        [class.show-validation-errors]="hasSubmitted()"
        novalidate
        (input)="refreshValidationState($event)"
        (change)="refreshValidationState($event)"
        (submit)="onSubmit($event)"
      >
        @if (showReviewNotice()) {
          <div class="caregiver-snackbar" role="status" aria-live="polite">
            <span class="material-symbols-rounded caregiver-snackbar__icon" aria-hidden="true">info</span>
            <div>
              <strong>{{ copy().reviewTitle }}</strong>
              <p>{{ copy().reviewText }}</p>
            </div>
            <button type="button" [attr.aria-label]="copy().closeNotice" (click)="showReviewNotice.set(false)">
              <span class="material-symbols-rounded" aria-hidden="true">close</span>
            </button>
          </div>
        }
        <fieldset class="form-disabled-shell" [disabled]="!canEditProfile()">
        <section id="perfil-profissional" class="signup-section">
          <div class="section-title">
            <span>1</span>
            <div>
              <h2>{{ copy().professional }}</h2>
              <p>{{ copy().professionalHelp }}</p>
            </div>
          </div>
          <div class="form-grid">
            <label><span class="label-line">{{ copy().professionalSummary }} <strong>*</strong></span><textarea name="summary" required maxlength="650" [placeholder]="copy().professionalPlaceholder">{{ fieldValue('publicProfile.summary') }}</textarea></label>
            <label><span class="label-line">{{ copy().experienceYears }} <strong>*</strong></span><input type="number" name="experienceYears" required min="0" max="60" [placeholder]="copy().exampleFive" [value]="fieldValue('publicProfile.experienceYears')" /></label>
          </div>
          <fieldset [class.field-group-invalid]="isRequiredGroupMissing('serviceTypes')">
            <legend class="label-line">{{ copy().serviceTypes }} <strong>*</strong></legend>
            <div class="checkbox-grid">
              @for (service of serviceTypes; track service) {
                <label><input type="checkbox" name="serviceTypes" [value]="service" [checked]="isChecked('publicProfile.serviceTypes', service)" /> {{ optionLabel(service) }}</label>
              }
            </div>
          </fieldset>
        </section>

        <section id="formacao" class="signup-section">
          <div class="section-title">
            <span>2</span>
            <div>
              <h2>{{ copy().training }}</h2>
              <p>{{ copy().trainingHelp }}</p>
            </div>
          </div>

          <div class="training-list">
            @for (entryId of trainingEntryIds(); track entryId) {
              <div class="training-entry">
                @if (trainingEntryIds().length > 1) {
                  <div class="training-entry-header">
                    <button type="button" class="ghost-button compact-button" (click)="removeTrainingEntry(entryId)">{{ copy().remove }}</button>
                  </div>
                }

                <label>
                  {{ copy().professionalTraining }}
                  <select [name]="'trainingType-' + entryId" [value]="selectedTrainingType(entryId)" (change)="onTrainingTypeChange(entryId, $event)">
                    <option value="">{{ copy().selectTraining }}</option>
                    @for (course of availableTrainingTypes(entryId); track course) {
                      <option [value]="course">{{ optionLabel(course) }}</option>
                    }
                  </select>
                </label>

                @if (selectedTrainingType(entryId)) {
                  <div class="form-grid two-columns training-details">
                    <label>
                      {{ copy().courseName }}
                      <input [name]="'courseName-' + entryId" required [placeholder]="copy().coursePlaceholder" [value]="trainingFieldValue(entryId, 'courseName')" />
                    </label>
                    <label>
                      {{ copy().trainingEntity }}
                      <input [name]="'trainingEntity-' + entryId" required [placeholder]="copy().institutionPlaceholder" [value]="trainingFieldValue(entryId, 'trainingEntity')" />
                    </label>
                    <label>
                      {{ copy().completionDate }}
                      <input type="date" [name]="'completionDate-' + entryId" required [value]="trainingFieldValue(entryId, 'completionDate')" />
                    </label>
                    <label>
                      {{ copy().certificateImage }}
                      <input type="file" [name]="'certificateFile-' + entryId" accept="image/*" [required]="!trainingFieldValue(entryId, 'certificateFileName')" (change)="onCertificateFileChange($event)" />
                      <small class="field-hint">{{ copy().certificateHint }}</small>
                      @if (trainingFieldValue(entryId, 'certificateFileName')) {
                        <small class="field-hint">{{ copy().currentFile }}: {{ trainingFieldValue(entryId, 'certificateFileName') }}</small>
                      }
                    </label>
                  </div>
                }
              </div>
            }

            <div class="training-actions">
              <button type="button" class="secondary-button" (click)="addTrainingEntry()" [disabled]="!canAddTrainingEntry()">
                {{ copy().addTraining }}
              </button>
            </div>
          </div>
        </section>

        <section id="disponibilidade" class="signup-section">
          <div class="section-title">
            <span>3</span>
            <div>
              <h2>{{ copy().availability }}</h2>
              <p>{{ copy().availabilityHelp }}</p>
            </div>
          </div>
          <fieldset [class.field-group-invalid]="isRequiredGroupMissing('weekDays')">
            <legend class="label-line">{{ copy().weekDays }} <strong>*</strong></legend>
            <div class="checkbox-grid compact">
              @for (day of weekDays; track day) {
                <label><input type="checkbox" name="weekDays" [value]="day" [checked]="isChecked('publicProfile.availability.weekDays', day)" /> {{ optionLabel(day) }}</label>
              }
            </div>
          </fieldset>
          <fieldset [class.field-group-invalid]="isRequiredGroupMissing('periods')">
            <legend class="label-line">{{ copy().periods }} <strong>*</strong></legend>
            <div class="checkbox-grid compact">
              @for (period of periods; track period) {
                <label><input type="checkbox" name="periods" [value]="period" [checked]="isChecked('publicProfile.availability.periods', period)" /> {{ optionLabel(period) }}</label>
              }
            </div>
          </fieldset>
          <fieldset>
            <legend>{{ copy().availableFor }}</legend>
            <div class="checkbox-grid compact">
              @for (type of availabilityTypes; track type) {
                <label><input type="checkbox" name="availabilityTypes" [value]="type" [checked]="isChecked('publicProfile.availability.availabilityTypes', type)" /> {{ optionLabel(type) }}</label>
              }
            </div>
          </fieldset>
        </section>

        <section id="valores" class="signup-section">
          <div class="section-title">
            <span>4</span>
            <div>
              <h2>{{ copy().rates }}</h2>
              <p>{{ copy().ratesHelp }}</p>
            </div>
          </div>
          <p class="group-label">{{ copy().atLeastOneRate }} <strong>*</strong></p>
          <div class="form-grid four-columns rates-fields" [class.field-group-invalid]="isRequiredGroupMissing('rates')">
            <label>{{ copy().hourlyRate }}<span class="money-input"><input name="hourlyRate" inputmode="decimal" placeholder="0,00" [value]="moneyFieldValue('publicProfile.rates.hourlyRate')" (blur)="formatMoneyInput($event)" /><span aria-hidden="true">€</span></span></label>
            <label>{{ copy().shiftRate }}<span class="money-input"><input name="shiftRate" inputmode="decimal" placeholder="0,00" [value]="moneyFieldValue('publicProfile.rates.shiftRate')" (blur)="formatMoneyInput($event)" /><span aria-hidden="true">€</span></span></label>
            <label>{{ copy().dayRate }}<span class="money-input"><input name="dayRate" inputmode="decimal" placeholder="0,00" [value]="moneyFieldValue('publicProfile.rates.dayRate')" (blur)="formatMoneyInput($event)" /><span aria-hidden="true">€</span></span></label>
            <label>{{ copy().monthlyRate }}<span class="money-input"><input name="monthlyRate" inputmode="decimal" placeholder="0,00" [value]="moneyFieldValue('publicProfile.rates.monthlyRate')" (blur)="formatMoneyInput($event)" /><span aria-hidden="true">€</span></span></label>
          </div>
        </section>

        <section id="competencias" class="signup-section">
          <div class="section-title">
            <span>5</span>
            <div>
              <h2>{{ copy().skills }}</h2>
              <p>{{ copy().skillsHelp }}</p>
            </div>
          </div>
          <div class="checkbox-grid">
            @for (skill of skills; track skill) {
              <label><input type="checkbox" name="skills" [value]="skill" [checked]="isChecked('publicProfile.skills', skill)" /> {{ optionLabel(skill) }}</label>
            }
          </div>
        </section>

        <section id="idiomas-mobilidade" class="signup-section">
          <div class="section-title">
            <span>6</span>
            <div>
              <h2>{{ copy().languagesMobility }}</h2>
              <p>{{ copy().languagesMobilityHelp }}</p>
            </div>
          </div>
          <fieldset>
            <legend>{{ copy().languages }}</legend>
            <div class="checkbox-grid compact">
              @for (language of languages; track language) {
                <label><input type="checkbox" name="languages" [value]="language" [checked]="isChecked('publicProfile.languages', language)" /> {{ optionLabel(language) }}</label>
              }
            </div>
          </fieldset>
          <fieldset>
            <legend>{{ copy().mobility }}</legend>
            <div class="checkbox-grid compact">
              <label><input type="checkbox" name="drivingLicense" [checked]="isChecked('publicProfile.mobility.drivingLicense')" /> {{ copy().drivingLicense }}</label>
              <label><input type="checkbox" name="ownVehicle" [checked]="isChecked('publicProfile.mobility.ownVehicle')" /> {{ copy().ownVehicle }}</label>
              <label><input type="checkbox" name="acceptsTravel" [checked]="isChecked('publicProfile.mobility.acceptsTravel')" /> {{ copy().acceptsTravel }}</label>
            </div>
          </fieldset>
          <div class="form-grid two-columns mobility-radius">
            <label><span class="label-line">{{ copy().travelRadius }} <strong>*</strong></span>
              <select name="travelRadius" required [value]="fieldValue('publicProfile.travelRadius')">
                <option value="">{{ copy().select }}</option>
                @for (radius of travelRadiusOptions; track radius) {
                  <option [value]="radius">{{ optionLabel(radius) }}</option>
                }
              </select>
            </label>
          </div>
        </section>

        <section id="referencias" class="signup-section">
          <div class="section-title">
            <span>7</span>
            <div>
              <h2>{{ copy().references }}</h2>
              <p>{{ copy().referencesHelp }}</p>
            </div>
          </div>
          <div class="form-grid two-columns">
            <label>{{ copy().referenceName }}<input name="referenceName" [placeholder]="copy().fullName" [value]="fieldValue('private.reference.name')" /></label>
            <label>{{ copy().professionalRelation }}<input name="referenceRelation" [placeholder]="copy().relationPlaceholder" [value]="fieldValue('private.reference.relation')" /></label>
            <label>{{ copy().callingCode }}
              <select name="referencePhoneCountry" [value]="referencePhoneCountry()" (change)="onReferencePhoneCountryChange($event)">
                @for (country of referencePhoneCountries(); track country.code) {
                  <option [value]="country.code">{{ country.name }} (+{{ country.callingCode }})</option>
                }
              </select>
            </label>
            <label>{{ copy().mobile }}
              <input
                type="tel"
                name="referenceContact"
                inputmode="tel"
                autocomplete="tel-national"
                placeholder="912 345 678"
                [value]="referencePhoneNational()"
              />
            </label>
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
            {{ isSubmitting ? copy().saving : (hasExistingCaregiverProfile() ? copy().update : copy().save) }}
          </button>
          @if (hasExistingCaregiverProfile()) {
            <a class="button-secondary" routerLink="/dashboard/cuidador">{{ copy().dashboard }}</a>
          } @else {
            <a class="button-secondary" routerLink="/como-funciona/cuidadores">{{ copy().howItWorks }}</a>
          }
        </div>
      </form>
    </section>
  `,
  styleUrl: './become-caregiver.scss',
})
export class BecomeCaregiverComponent implements OnInit {
  private readonly authService = inject(Auth);
  private readonly router = inject(Router);
  private readonly localeService = inject(LocaleService);

  protected isSubmitting = false;
  protected errorMessage = '';
  protected successMessage = '';
  protected readonly hasExistingCaregiverProfile = signal(false);
  protected readonly canEditProfile = signal(true);
  protected readonly showReviewNotice = signal(true);
  protected readonly hasSubmitted = signal(false);
  protected readonly missingRequiredGroups = signal<string[]>([]);
  protected readonly approvalLockMessage = signal('');
  private readonly existingCaregiverProfile = signal<CaregiverProfileDocument | null>(null);

  constructor() {
    effect(() => {
      this.localeService.locale();
      this.applyApprovalLock(this.existingCaregiverProfile());
    });
  }

  protected copy(): (typeof CAREGIVER_SIGNUP_COPY)[AppLocale] {
    return CAREGIVER_SIGNUP_COPY[this.localeService.locale()];
  }

  protected optionLabel(value: string): string {
    return CAREGIVER_OPTION_LABELS[this.localeService.locale()][value] ?? value;
  }

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
    'Fisioterapeuta',
    'Massagista',
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
  protected readonly travelRadiusOptions = ['Até 5 km', 'Até 10 km', 'Até 15 km', 'Até 20 km', 'Até 25 km', 'Até 30 km', 'Até 40 km', 'Até 50 km'];
  protected readonly referencePhoneCountry = signal<CountryCode>('PT');
  protected readonly referencePhoneNational = signal('');
  protected readonly referencePhoneCountries = computed(() =>
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

  async ngOnInit(): Promise<void> {
    const user = await this.authService.getCurrentUser();

    if (!user) {
      return;
    }

    const caregiverProfile = await this.authService.getCaregiverProfile(user.uid);
    this.existingCaregiverProfile.set(caregiverProfile);
    this.hasExistingCaregiverProfile.set(!!caregiverProfile);
    this.loadTrainingEntries(caregiverProfile);
    this.loadReferencePhone();
    this.applyApprovalLock(caregiverProfile);
  }

  protected async onSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.hasSubmitted.set(true);
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.canEditProfile()) {
      this.errorMessage = this.approvalLockMessage();
      return;
    }

    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    this.updateMissingRequiredGroups(formData);
    const validationMessage = this.getCaregiverValidationMessage(form, formData);
    if (validationMessage) {
      this.errorMessage = validationMessage;
      return;
    }

    let data: CaregiverRegistration;
    try {
      data = await this.buildCaregiverRegistration(formData);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : this.copy().processError;
      return;
    }

    const missingGroup = this.getMissingRequiredGroup(data);
    if (missingGroup) {
      this.errorMessage = this.copy().selectOne(missingGroup);
      return;
    }

    this.isSubmitting = true;
    try {
      await this.authService.registerCaregiver(data);
      form.reset();
      this.successMessage = this.copy().submitted;
      await this.router.navigateByUrl('/dashboard/cuidador');
    } catch (error) {
      this.errorMessage = this.authService.getFirebaseErrorMessage(error, 'save');
    } finally {
      this.isSubmitting = false;
    }
  }

  protected fieldValue(path: string): string {
    const value = this.profileValue(path);
    if (typeof value === 'number') {
      return String(value);
    }

    return typeof value === 'string' ? value : '';
  }

  protected moneyFieldValue(path: string): string {
    const value = this.profileValue(path);
    const amount = typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? this.parseMoney(value)
        : null;
    return amount !== null && Number.isFinite(amount) ? this.formatMoney(amount) : '';
  }

  protected formatMoneyInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.value.trim()) {
      input.setCustomValidity('');
      return;
    }

    const value = this.parseMoney(input.value);
    if (value === null || value < 0) {
      input.setCustomValidity(this.copy().invalid(input.labels?.[0]?.textContent?.trim() || this.copy().rates));
      return;
    }

    input.setCustomValidity('');
    input.value = this.formatMoney(value);
  }

  protected isChecked(path: string, option?: string): boolean {
    const value = this.profileValue(path);
    if (Array.isArray(value) && option) {
      return value.includes(option);
    }

    return typeof value === 'boolean' ? value : false;
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
      this.errorMessage = this.copy().certificateImageOnly;
      input.value = '';
      return;
    }

    if (file.size > CERTIFICATE_IMAGE_MAX_FILE_BYTES) {
      this.errorMessage = this.copy().certificateMax;
      input.value = '';
    }
  }

  protected onReferencePhoneCountryChange(event: Event): void {
    this.referencePhoneCountry.set((event.target as HTMLSelectElement).value as CountryCode);
  }

  protected refreshValidationState(event: Event): void {
    if (!this.hasSubmitted()) return;

    const form = (event.currentTarget as HTMLFormElement | null);
    if (form instanceof HTMLFormElement) {
      this.updateMissingRequiredGroups(new FormData(form));
    }
  }

  protected isRequiredGroupMissing(group: string): boolean {
    return this.hasSubmitted() && this.missingRequiredGroups().includes(group);
  }

  private updateMissingRequiredGroups(formData: FormData): void {
    const missingGroups = ['serviceTypes', 'weekDays', 'periods'].filter(
      (group) => this.arrayValue(formData, group).length === 0,
    );
    const hasRate = ['hourlyRate', 'shiftRate', 'dayRate', 'monthlyRate'].some(
      (key) => !!this.textValue(formData, key),
    );
    this.missingRequiredGroups.set(hasRate ? missingGroups : [...missingGroups, 'rates']);
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
      this.copy().approved(
        this.formatDate(approvalSummary.approvalDate),
        this.formatDate(approvalSummary.canEditFrom),
      ),
    );
  }

  private async buildCaregiverRegistration(formData: FormData): Promise<CaregiverRegistration> {
    const referencePhoneCountry = this.textValue(formData, 'referencePhoneCountry') as CountryCode;
    const referencePhoneNational = this.textValue(formData, 'referenceContact');

    return {
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
        hourlyRate: this.moneyValue(formData, 'hourlyRate') ?? 0,
        shiftRate: this.moneyValue(formData, 'shiftRate'),
        dayRate: this.moneyValue(formData, 'dayRate'),
        monthlyRate: this.moneyValue(formData, 'monthlyRate'),
      },
      skills: this.arrayValue(formData, 'skills'),
      languages: this.arrayValue(formData, 'languages'),
      mobility: {
        drivingLicense: this.booleanValue(formData, 'drivingLicense'),
        ownVehicle: this.booleanValue(formData, 'ownVehicle'),
        acceptsTravel: this.booleanValue(formData, 'acceptsTravel'),
        travelRadius: this.textValue(formData, 'travelRadius'),
      },
      reference: {
        name: this.textValue(formData, 'referenceName'),
        contact: this.normalizedReferencePhone(formData),
        contactCountry: referencePhoneNational ? referencePhoneCountry : '',
        contactCallingCode: referencePhoneNational ? `+${getCountryCallingCode(referencePhoneCountry)}` : '',
        contactNational: referencePhoneNational,
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
      return this.copy().serviceTypes;
    }
    if (data.availability.weekDays.length === 0) {
      return this.copy().weekDays;
    }
    if (data.availability.periods.length === 0) {
      return this.copy().periods;
    }

    return '';
  }

  private getCaregiverValidationMessage(form: HTMLFormElement, formData: FormData): string {
    const copy = this.copy();
    const requiredFields = [
      { key: 'summary', label: copy.professionalSummary },
      { key: 'experienceYears', label: copy.experienceYears },
      { key: 'serviceTypes', label: copy.serviceTypes, type: 'array' },
      { key: 'weekDays', label: copy.weekDays, type: 'array' },
      { key: 'periods', label: copy.periods, type: 'array' },
      { key: 'travelRadius', label: copy.travelRadius },
    ];

    for (const field of requiredFields) {
      if (field.type === 'checkbox' && !formData.has(field.key)) {
        return copy.required(field.label);
      }

      if (field.type === 'array' && this.arrayValue(formData, field.key).length === 0) {
        return copy.selectOne(field.label);
      }

      const value = this.textValue(formData, field.key);
      if (!field.type && !value) {
        return copy.required(field.label);
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

    }

    const hasRate = ['hourlyRate', 'shiftRate', 'dayRate', 'monthlyRate'].some(
      (key) => !!this.textValue(formData, key),
    );
    if (!hasRate) {
      return copy.required(copy.atLeastOneRate);
    }

    const moneyFields = [
      { key: 'hourlyRate', label: copy.hourlyRate },
      { key: 'shiftRate', label: copy.shiftRate },
      { key: 'dayRate', label: copy.dayRate },
      { key: 'monthlyRate', label: copy.monthlyRate },
    ];
    for (const field of moneyFields) {
      const rawValue = this.textValue(formData, field.key);
      const value = this.parseMoney(rawValue);
      if (rawValue && (value === null || value < 0)) {
        return copy.invalid(field.label);
      }
    }

    const referenceContact = this.textValue(formData, 'referenceContact');
    if (referenceContact && !this.isValidReferencePhone(formData)) {
      return copy.invalidReference;
    }

    return this.getTrainingValidationMessage(formData);
  }

  private getTrainingValidationMessage(formData: FormData): string {
    const copy = this.copy();
    for (const entryId of this.trainingEntryIds()) {
      const trainingType = this.textValue(formData, `trainingType-${entryId}`);
      if (!trainingType) {
        continue;
      }

      const fields = [
        { key: `courseName-${entryId}`, label: copy.courseIn(this.optionLabel(trainingType)) },
        { key: `trainingEntity-${entryId}`, label: copy.entityIn(this.optionLabel(trainingType)) },
        { key: `completionDate-${entryId}`, label: copy.completionIn(this.optionLabel(trainingType)) },
      ];

      for (const field of fields) {
        if (!this.textValue(formData, field.key)) {
          return copy.required(field.label);
        }
      }

      const certificate = formData.get(`certificateFile-${entryId}`);
      if (certificate instanceof File && certificate.name && !certificate.type.startsWith('image/')) {
        return copy.certificateMustImage(this.optionLabel(trainingType));
      }

      if (certificate instanceof File && certificate.name && certificate.size > CERTIFICATE_IMAGE_MAX_FILE_BYTES) {
        return copy.certificateMaxFor(this.optionLabel(trainingType));
      }

      if (
        (!(certificate instanceof File) || !certificate.name) &&
        !this.trainingFieldValue(entryId, 'certificateFileName')
      ) {
        return copy.certificateRequired(this.optionLabel(trainingType));
      }
    }

    return '';
  }

  private controlValidationMessage(
    control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
    label: string,
  ): string {
    if (control.validity.valueMissing) {
      return this.copy().required(label);
    }
    if (control.validity.typeMismatch || control.validity.badInput) {
      return this.copy().invalid(label);
    }
    if (control.validity.rangeUnderflow || control.validity.rangeOverflow) {
      return this.copy().outOfRange(label);
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

  private formatDate(date: Date | null): string {
    if (!date) {
      return this.copy().dateUnavailable;
    }

    return new Intl.DateTimeFormat(this.localeService.locale(), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  private loadReferencePhone(): void {
    const storedCountry = this.fieldValue('private.reference.contactCountry');
    const storedNational = this.fieldValue('private.reference.contactNational');
    if (storedCountry && storedNational) {
      this.referencePhoneCountry.set(storedCountry as CountryCode);
      this.referencePhoneNational.set(storedNational);
      return;
    }

    const parsedPhone = parsePhoneNumberFromString(this.fieldValue('private.reference.contact'));
    if (parsedPhone?.country) {
      this.referencePhoneCountry.set(parsedPhone.country);
      this.referencePhoneNational.set(parsedPhone.nationalNumber);
    }
  }

  private normalizedReferencePhone(formData: FormData): string {
    const nationalPhone = this.textValue(formData, 'referenceContact');
    if (!nationalPhone) {
      return '';
    }

    const country = this.textValue(formData, 'referencePhoneCountry') as CountryCode;
    return parsePhoneNumberFromString(nationalPhone, country)?.number ?? '';
  }

  private isValidReferencePhone(formData: FormData): boolean {
    const country = this.textValue(formData, 'referencePhoneCountry') as CountryCode;
    const phone = parsePhoneNumberFromString(this.textValue(formData, 'referenceContact'), country);
    return !!phone && phone.country === country && phone.isValid();
  }

  private countryDisplayName(country: CountryCode): string {
    return new Intl.DisplayNames([this.localeService.locale()], { type: 'region' }).of(country) ?? country;
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

  private moneyValue(formData: FormData, key: string): number | null {
    return this.parseMoney(this.textValue(formData, key));
  }

  private parseMoney(rawValue: string): number | null {
    const value = rawValue.replace(/\s|€/g, '').trim();
    if (!value) return null;

    const normalized = value.includes(',')
      ? value.replace(/\./g, '').replace(',', '.')
      : /^\d{1,3}(\.\d{3})+$/.test(value)
        ? value.replace(/\./g, '')
        : value;
    const amount = Number(normalized);
    return Number.isFinite(amount) ? amount : null;
  }

  private formatMoney(value: number): string {
    return new Intl.NumberFormat('pt-PT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
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
      throw new Error(this.copy().certificateImageOnly);
    }

    if (value.size > CERTIFICATE_IMAGE_MAX_FILE_BYTES) {
      throw new Error(this.copy().certificateMax);
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

  private async compressImageElementToJpegBlob(
    image: HTMLImageElement,
    maxDimension: number,
    targetBytes: number,
    minQuality: number,
    minDimension: number,
    errorMessage: string,
  ): Promise<Blob> {
    let { width, height } = this.fitImageSize(image.width, image.height, maxDimension);
    let bestBlob: Blob | null = null;

    while (width >= minDimension && height >= minDimension) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error(this.copy().optimizeImage);
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      for (let quality = 0.82; quality >= minQuality; quality -= 0.08) {
        const blob = await this.canvasToJpegBlob(canvas, quality);
        bestBlob = !bestBlob || blob.size < bestBlob.size ? blob : bestBlob;
        if (blob.size <= targetBytes) {
          return blob;
        }
      }

      width = Math.floor(width * 0.82);
      height = Math.floor(height * 0.82);
    }

    if (bestBlob) {
      return bestBlob;
    }

    throw new Error(errorMessage);
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
        throw new Error(this.copy().optimizeImage);
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

    throw new Error(this.copy().optimizeImage);
  }

  private canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
            return;
          }

          reject(new Error(this.copy().optimizeImage));
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
      image.onerror = () => reject(new Error(this.copy().optimizeImage));
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

        reject(new Error(this.copy().optimizeImage));
      };
      reader.onerror = () => reject(new Error(this.copy().optimizeImage));
      reader.readAsDataURL(file);
    });
  }
}
