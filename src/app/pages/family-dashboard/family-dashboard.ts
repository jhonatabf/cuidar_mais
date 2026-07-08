import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';

import { Auth, FamilyRegistration, UserAccount } from '../../core/services/auth';
import { AppLocale, LocaleService } from '../../core/services/locale';

const FAMILY_COPY = {
  'pt-PT': {
    loading: 'A carregar cadastro de família...',
    stepAria: 'Etapa 3 de 3: cadastro de família',
    step: 'Etapa 3 de 3',
    stepName: 'Cadastro de família',
    title: 'Conte-nos quem precisa de cuidado e como podemos ajudar.',
    lead: 'O cadastro de família ajuda a equipa da wecareparents a compreender a casa, os utentes, os cuidados necessários e o orçamento disponível para futuros matches automáticos.',
    prerequisite: 'Pré-requisito',
    adultResponsible: 'Responsável maior de idade',
    adultResponsibleText: 'Para cadastrar uma família, a pessoa responsável precisa ter 18 anos ou mais.',
    budgetPrivacy: 'O valor informado será usado para match automático, não para pesquisa manual por cuidadores.',
    signupSummaryAria: 'Resumo do cadastro',
    blocked: 'Cadastro bloqueado',
    adultRequiredTitle: 'É necessário ser maior de idade.',
    adultRequiredText: 'A data de nascimento dos dados pessoais indica que ainda não é possível assumir a responsabilidade por um cadastro de família.',
    familyIdentification: 'Identificação da família',
    familyIdentificationHelp: 'Informação interna para organizar o cadastro e os convites.',
    householdName: 'Nome da família ou casa',
    householdPlaceholder: 'Ex.: Família Silva',
    relationToRecipient: 'Relação com o utente',
    select: 'Selecionar',
    familyMembers: 'Membros da família',
    familyMembersHelp: 'Convide por email familiares que também poderão gerir os cuidados do idoso cadastrado. Ao aceitar o convite, essa pessoa ficará associada a esta família e terá esta etapa preenchida automaticamente.',
    name: 'Nome',
    memberNamePlaceholder: 'Nome do membro',
    relation: 'Relação',
    memberRelationPlaceholder: 'Ex.: irmã, filho',
    inviteByEmail: 'Convidar por email',
    remove: 'Remover',
    addMember: 'Adicionar membro',
    recipientsAndCare: 'Utentes e cuidados',
    recipientsAndCareHelp: 'Detalhe quantas pessoas precisam de cuidado e quais tarefas são esperadas.',
    recipientCount: 'Número de idosos ou pessoas com necessidade de cuidado',
    preferredCareType: 'Tipo de acompanhamento preferido',
    ageGroups: 'Faixa etária dos utentes',
    careServices: 'Cuidados necessários',
    customCare: 'Outro cuidado necessário',
    customCarePlaceholder: 'Descreva algum cuidado necessário que não esteja na lista.',
    requiredDays: 'Dias necessários',
    requiredPeriods: 'Horários necessários',
    routine: 'Rotina',
    routinePlaceholder: 'Ex.: apoio ao banho, refeições, companhia ou medicação.',
    careNotes: 'Observações sobre saúde, autonomia ou preferências',
    careNotesPlaceholder: 'Descreva mobilidade, medicação, companhia, alimentação ou outros detalhes.',
    budget: 'Orçamento',
    budgetHelp: 'O orçamento será usado apenas para o match automático.',
    availableValue: 'Valor disponível (€)',
    valuePlaceholder: 'Ex.: 15',
    budgetPeriod: 'Periodicidade',
    homeLocation: 'Casa e localização',
    homeLocationHelp: 'Dados da casa onde os cuidados serão prestados, separados dos dados pessoais.',
    homeType: 'Tipo de casa',
    samePersonalLocation: 'A localização da casa da família é a mesma localização do cadastro pessoal.',
    postalCode: 'Código postal / CEP',
    postalCodePlaceholder: 'Ex.: 4000-000',
    address: 'Morada de referência',
    addressPlaceholder: 'Rua, número, complemento',
    district: 'Distrito',
    county: 'Concelho',
    locationReference: 'Referência de localização',
    locationReferencePlaceholder: 'Ex.: perto do metro, zona com estacionamento',
    homeAccessibility: 'Acessibilidade da casa',
    pets: 'Existem animais em casa',
    homeNotes: 'Notas sobre a casa',
    homeNotesPlaceholder: 'Ex.: escadas, elevador pequeno, necessidade de entrar com chave.',
    emergencyContact: 'Contacto de emergência',
    emergencyContactHelp: 'Contacto alternativo para situações relevantes sobre os cuidados.',
    emergencyName: 'Nome do contacto de emergência',
    fullNamePlaceholder: 'Nome completo',
    emergencyRelation: 'Relação do contacto de emergência',
    emergencyRelationPlaceholder: 'Ex.: filha, irmão',
    emergencyPhone: 'Telefone do contacto de emergência',
    callingCode: 'Indicativo',
    phone: 'Telefone',
    confirmation: 'Confirmação',
    confirmationHelp: 'Após guardar, o cadastro fica disponível para análise administrativa.',
    automaticMatchConsent: 'Confirmo que o orçamento informado pode ser usado futuramente no match automático.',
    cancel: 'Cancelar',
    saving: 'A guardar...',
    save: 'Guardar cadastro de família',
    saved: 'Cadastro de família guardado e enviado para análise.',
    dashboardEyebrow: 'Dashboard família',
    dashboardTitle: 'Visão geral dos cuidados contratados.',
    dashboardLead: 'Resumo do plano, próximas visitas e pedidos em aberto.',
    summary: 'Resumo',
    caregivers: 'Cuidadores',
    messages: 'Mensagens',
    payments: 'Pagamentos',
    familyRegistration: 'Cadastro da família',
    updateRegistration: 'Atualizar cadastro',
    additionalProfile: 'Perfil adicional',
    createCaregiverTitle: 'Criar perfil de cuidador',
    createCaregiverText: 'Use a mesma conta para também oferecer serviços como cuidador.',
    active: 'Ativo',
    today: 'Hoje',
    pending: 'Pendente',
    weeklyPlan: 'Plano semanal',
    nextVisit: 'Próxima visita',
    scheduledVisits: '5 visitas agendadas',
    unansweredMessages: '2 por responder',
    close: 'Fechar mensagem',
    validationAdult: 'É necessário ser maior de idade para cadastrar uma família.',
    validationHousehold: 'Informe o nome da família ou casa.',
    validationRelation: 'Informe a sua relação com o utente.',
    validationRecipientCount: 'Informe quantas pessoas precisam de cuidado.',
    validationAgeGroups: 'Selecione a faixa etária dos utentes.',
    validationCareServices: 'Selecione pelo menos um cuidado necessário.',
    validationWeekDays: 'Selecione os dias em que os cuidados serão necessários.',
    validationPeriods: 'Selecione os horários em que os cuidados serão necessários.',
    validationCareType: 'Informe o tipo de acompanhamento preferido.',
    validationBudget: 'Informe o valor disponível e a periodicidade.',
    validationPostalCode: 'Informe o código postal / CEP.',
    validationEmergencyPhone: 'Informe um telefone de emergência válido para o indicativo selecionado.',
    validationInviteEmail: 'Para convidar um membro, informe um email válido.',
    validationMatchConsent: 'Confirme que o orçamento pode ser usado futuramente no match automático.',
    statusApproved: 'Aprovado',
    statusAnalysing: 'Em análise',
    statusRejected: 'Correção necessária',
    statusPending: 'Pendente',
    statusApprovedMessage: 'O cadastro da família foi aprovado pela equipa wecareparents.',
    statusAnalysingMessage: 'O cadastro está a ser analisado pela equipa wecareparents.',
    statusRejectedMessage: 'O cadastro foi rejeitado. Atualize as informações solicitadas e envie novamente.',
    statusPendingMessage: 'O cadastro foi enviado e aguarda análise da equipa wecareparents.',
  },
  'en-GB': {
    loading: 'Loading family registration...',
    stepAria: 'Step 3 of 3: family registration',
    step: 'Step 3 of 3',
    stepName: 'Family registration',
    title: 'Tell us who needs care and how we can help.',
    lead: 'Family registration helps the wecareparents team understand the home, the care recipients, the required care and the budget available for future automatic matches.',
    prerequisite: 'Requirement',
    adultResponsible: 'Adult responsible person',
    adultResponsibleText: 'To register a family, the responsible person must be 18 or older.',
    budgetPrivacy: 'The amount provided will be used for automatic matching, not for manual caregiver search.',
    signupSummaryAria: 'Registration summary',
    blocked: 'Registration blocked',
    adultRequiredTitle: 'You must be an adult.',
    adultRequiredText: 'The date of birth in your personal details shows that you cannot yet take responsibility for a family registration.',
    familyIdentification: 'Family identification',
    familyIdentificationHelp: 'Internal information to organise the registration and invitations.',
    householdName: 'Family or household name',
    householdPlaceholder: 'E.g. Silva family',
    relationToRecipient: 'Relationship to the care recipient',
    select: 'Select',
    familyMembers: 'Family members',
    familyMembersHelp: 'Invite relatives by email so they can also manage care for the registered older person. When they accept, they will be associated with this family and this step will be completed automatically for them.',
    name: 'Name',
    memberNamePlaceholder: 'Member name',
    relation: 'Relationship',
    memberRelationPlaceholder: 'E.g. sister, son',
    inviteByEmail: 'Invite by email',
    remove: 'Remove',
    addMember: 'Add member',
    recipientsAndCare: 'Care recipients and needs',
    recipientsAndCareHelp: 'Describe how many people need care and which tasks are expected.',
    recipientCount: 'Number of older people or people needing care',
    preferredCareType: 'Preferred care arrangement',
    ageGroups: 'Care recipient age groups',
    careServices: 'Required care',
    customCare: 'Other required care',
    customCarePlaceholder: 'Describe any required care that is not listed.',
    requiredDays: 'Required days',
    requiredPeriods: 'Required times',
    routine: 'Routine',
    routinePlaceholder: 'E.g. bathing support, meals, companionship or medication.',
    careNotes: 'Notes about health, independence or preferences',
    careNotesPlaceholder: 'Describe mobility, medication, companionship, diet or other details.',
    budget: 'Budget',
    budgetHelp: 'The budget will only be used for automatic matching.',
    availableValue: 'Available amount (€)',
    valuePlaceholder: 'E.g. 15',
    budgetPeriod: 'Frequency',
    homeLocation: 'Home and location',
    homeLocationHelp: 'Details of the home where care will be provided, separate from personal data.',
    homeType: 'Home type',
    samePersonalLocation: 'The family home location is the same as the location in the personal registration.',
    postalCode: 'Postcode',
    postalCodePlaceholder: 'E.g. 4000-000',
    address: 'Reference address',
    addressPlaceholder: 'Street, number, extra details',
    district: 'District',
    county: 'Municipality',
    locationReference: 'Location reference',
    locationReferencePlaceholder: 'E.g. near the underground, parking nearby',
    homeAccessibility: 'Home accessibility',
    pets: 'There are pets at home',
    homeNotes: 'Notes about the home',
    homeNotesPlaceholder: 'E.g. stairs, small lift, key access required.',
    emergencyContact: 'Emergency contact',
    emergencyContactHelp: 'Alternative contact for relevant care-related situations.',
    emergencyName: 'Emergency contact name',
    fullNamePlaceholder: 'Full name',
    emergencyRelation: 'Emergency contact relationship',
    emergencyRelationPlaceholder: 'E.g. daughter, brother',
    emergencyPhone: 'Emergency contact phone',
    callingCode: 'Country calling code',
    phone: 'Phone',
    confirmation: 'Confirmation',
    confirmationHelp: 'After saving, the registration will be available for administrative review.',
    automaticMatchConsent: 'I confirm that the stated budget may be used for future automatic matching.',
    cancel: 'Cancel',
    saving: 'Saving...',
    save: 'Save family registration',
    saved: 'Family registration saved and submitted for review.',
    dashboardEyebrow: 'Family dashboard',
    dashboardTitle: 'Overview of contracted care.',
    dashboardLead: 'Summary of the plan, upcoming visits and open requests.',
    summary: 'Summary',
    caregivers: 'Caregivers',
    messages: 'Messages',
    payments: 'Payments',
    familyRegistration: 'Family registration',
    updateRegistration: 'Update registration',
    additionalProfile: 'Additional profile',
    createCaregiverTitle: 'Create caregiver profile',
    createCaregiverText: 'Use the same account to also offer services as a caregiver.',
    active: 'Active',
    today: 'Today',
    pending: 'Pending',
    weeklyPlan: 'Weekly plan',
    nextVisit: 'Next visit',
    scheduledVisits: '5 scheduled visits',
    unansweredMessages: '2 unanswered',
    close: 'Close message',
    validationAdult: 'You must be an adult to register a family.',
    validationHousehold: 'Enter the family or household name.',
    validationRelation: 'Enter your relationship to the care recipient.',
    validationRecipientCount: 'Enter how many people need care.',
    validationAgeGroups: 'Select the care recipient age group.',
    validationCareServices: 'Select at least one required care service.',
    validationWeekDays: 'Select the days when care will be required.',
    validationPeriods: 'Select the times when care will be required.',
    validationCareType: 'Select the preferred care arrangement.',
    validationBudget: 'Enter the available amount and frequency.',
    validationPostalCode: 'Enter the postcode.',
    validationEmergencyPhone: 'Enter a valid emergency phone number for the selected country calling code.',
    validationInviteEmail: 'To invite a member, enter a valid email.',
    validationMatchConsent: 'Confirm that the budget may be used for future automatic matching.',
    statusApproved: 'Approved',
    statusAnalysing: 'Under review',
    statusRejected: 'Correction required',
    statusPending: 'Pending',
    statusApprovedMessage: 'The family registration has been approved by the wecareparents team.',
    statusAnalysingMessage: 'The registration is being reviewed by the wecareparents team.',
    statusRejectedMessage: 'The registration was rejected. Update the requested information and submit it again.',
    statusPendingMessage: 'The registration has been submitted and is awaiting review by the wecareparents team.',
  },
} as const;

const FAMILY_OPTION_LABELS: Record<AppLocale, Record<string, string>> = {
  'pt-PT': {},
  'en-GB': {
    'Filho/a': 'Son/daughter',
    'Cônjuge': 'Spouse',
    'Irmão/ã': 'Sibling',
    'Neto/a': 'Grandchild',
    'Responsável legal': 'Legal guardian',
    'Outro': 'Other',
    'Menos de 18': 'Under 18',
    '18 a 59': '18 to 59',
    '60 a 74': '60 to 74',
    '75 a 84': '75 to 84',
    '85+': '85+',
    'Pontual': 'One-off',
    'Recorrente semanal': 'Weekly recurring',
    'Diário': 'Daily',
    'Noite': 'Night',
    '24 horas': '24 hours',
    'Interno': 'Live-in',
    'Segunda': 'Monday',
    'Terça': 'Tuesday',
    'Quarta': 'Wednesday',
    'Quinta': 'Thursday',
    'Sexta': 'Friday',
    'Sábado': 'Saturday',
    'Domingo': 'Sunday',
    'Manhã': 'Morning',
    'Tarde': 'Afternoon',
    'Por hora': 'Per hour',
    'Por turno': 'Per shift',
    'Por dia': 'Per day',
    'Por semana': 'Per week',
    'Por mês': 'Per month',
    'Companhia': 'Companionship',
    'Higiene pessoal': 'Personal hygiene',
    'Preparação de refeições': 'Meal preparation',
    'Administração de medicação': 'Medication administration',
    'Acompanhamento a consultas': 'Appointment accompaniment',
    'Limpeza doméstica leve': 'Light housekeeping',
    'Mobilidade reduzida': 'Reduced mobility',
    'Acompanhamento noturno': 'Night support',
    'Cuidados paliativos': 'Palliative care',
    'Demência': 'Dementia',
    'Apartamento': 'Flat',
    'Moradia': 'House',
    'Quarto em residência': 'Room in residence',
    'Lar familiar': 'Family home',
    'Elevador': 'Lift',
    'Sem escadas': 'No stairs',
    'Cama articulada': 'Adjustable bed',
    'Casa de banho adaptada': 'Adapted bathroom',
    'Cadeira de rodas': 'Wheelchair',
    'Acesso por transporte público': 'Public transport access',
  },
};

@Component({
  selector: 'app-family-dashboard',
  imports: [RouterLink],
  template: `
    @if (isLoading()) {
      <section class="page">
        <p class="form-message success-message">{{ copy().loading }}</p>
      </section>
    } @else if (showFamilyForm()) {
      <section class="page family-signup-hero">
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
          <p class="lead">{{ copy().lead }}</p>
        </div>
        <aside class="signup-summary" [attr.aria-label]="copy().signupSummaryAria">
          <span class="badge">{{ copy().prerequisite }}</span>
          <h3>{{ copy().adultResponsible }}</h3>
          <p>{{ copy().adultResponsibleText }}</p>
          <p class="privacy-note">{{ copy().budgetPrivacy }}</p>
        </aside>
      </section>

      <section class="page family-signup-page">
        @if (!isResponsibleAdult()) {
          <article class="card card-body blocked-card">
            <span class="badge">{{ copy().blocked }}</span>
            <h2>{{ copy().adultRequiredTitle }}</h2>
            <p class="muted">{{ copy().adultRequiredText }}</p>
          </article>
        } @else {
          <form class="family-form form-grid" [class.show-validation-errors]="hasSubmitted()" novalidate (submit)="onSubmit($event)">
            <section class="form-section">
              <div class="section-title">
                <span>1</span>
                <div>
                  <h2>{{ copy().familyIdentification }}</h2>
                  <p>{{ copy().familyIdentificationHelp }}</p>
                </div>
              </div>
              <div class="form-grid two-columns">
                <label>
                  <span class="label-line">{{ copy().householdName }} <strong>*</strong></span>
                  <input name="householdName" required [placeholder]="copy().householdPlaceholder" [value]="fieldValue('householdName')" />
                </label>
                <label>
                  <span class="label-line">{{ copy().relationToRecipient }} <strong>*</strong></span>
                  <select name="relationToCareRecipient" required [value]="fieldValue('relationToCareRecipient')">
                    <option value="">{{ copy().select }}</option>
                    @for (relation of relationOptions; track relation) {
                      <option [value]="relation">{{ optionLabel(relation) }}</option>
                    }
                  </select>
                </label>
              </div>
            </section>

            <section class="form-section">
              <div class="section-title">
                <span>2</span>
                <div>
                  <h2>{{ copy().familyMembers }}</h2>
                  <p>{{ copy().familyMembersHelp }}</p>
                </div>
              </div>
              <div class="member-list">
                @for (entryId of memberEntryIds(); track entryId) {
                  <div class="member-entry">
                    <div class="form-grid three-columns">
                      <label>
                        <span class="label-line">{{ copy().name }}</span>
                        <input [name]="'memberName-' + entryId" [placeholder]="copy().memberNamePlaceholder" [value]="memberFieldValue(entryId, 'name')" />
                      </label>
                      <label>
                        <span class="label-line">Email</span>
                        <input type="email" [name]="'memberEmail-' + entryId" placeholder="email@exemplo.com" [value]="memberFieldValue(entryId, 'email')" />
                      </label>
                      <label>
                        <span class="label-line">{{ copy().relation }}</span>
                        <input [name]="'memberRelation-' + entryId" [placeholder]="copy().memberRelationPlaceholder" [value]="memberFieldValue(entryId, 'relation')" />
                      </label>
                    </div>
                    <div class="member-actions">
                      <label class="check-option">
                        <input type="checkbox" [name]="'memberInvite-' + entryId" [checked]="memberInviteChecked(entryId)" />
                        {{ copy().inviteByEmail }}
                      </label>
                      @if (memberEntryIds().length > 1) {
                        <button type="button" class="btn btn-danger button-small" (click)="removeMemberEntry(entryId)">{{ copy().remove }}</button>
                      }
                    </div>
                  </div>
                }
              </div>
              <button type="button" class="button-secondary button-small add-button" (click)="addMemberEntry()">{{ copy().addMember }}</button>
            </section>

            <section class="form-section">
              <div class="section-title">
                <span>3</span>
                <div>
                  <h2>{{ copy().recipientsAndCare }}</h2>
                  <p>{{ copy().recipientsAndCareHelp }}</p>
                </div>
              </div>
              <div class="form-grid two-columns">
                <label>
                  <span class="label-line">{{ copy().recipientCount }} <strong>*</strong></span>
                  <input type="number" name="careRecipientsCount" required min="1" max="10" [value]="fieldValue('careRecipients.count')" />
                </label>
                <label>
                  <span class="label-line">{{ copy().preferredCareType }} <strong>*</strong></span>
                  <select name="preferredCareType" required [value]="fieldValue('careNeeds.preferredCareType')">
                    <option value="">{{ copy().select }}</option>
                    @for (careType of preferredCareTypes; track careType) {
                      <option [value]="careType">{{ optionLabel(careType) }}</option>
                    }
                  </select>
                </label>
              </div>

              <fieldset>
                <legend>{{ copy().ageGroups }} <strong>*</strong></legend>
                <div class="checkbox-grid compact">
                  @for (ageGroup of ageGroups; track ageGroup) {
                    <label><input type="checkbox" name="ageGroups" [value]="ageGroup" [checked]="isChecked('careRecipients.ageGroups', ageGroup)" /> {{ optionLabel(ageGroup) }}</label>
                  }
                </div>
              </fieldset>

              <fieldset>
                <legend>{{ copy().careServices }} <strong>*</strong></legend>
                <div class="checkbox-grid">
                  @for (service of careNeedOptions; track service) {
                    <label><input type="checkbox" name="careServices" [value]="service" [checked]="isChecked('careNeeds.services', service)" /> {{ optionLabel(service) }}</label>
                  }
                </div>
              </fieldset>

              <label>
                <span class="label-line">{{ copy().customCare }}</span>
                <textarea name="customCareService" maxlength="500" [placeholder]="copy().customCarePlaceholder">{{ fieldValue('careNeeds.customService') }}</textarea>
              </label>

              <fieldset>
                <legend>{{ copy().requiredDays }} <strong>*</strong></legend>
                <div class="checkbox-grid compact">
                  @for (day of weekDays; track day) {
                    <label><input type="checkbox" name="weekDays" [value]="day" [checked]="isChecked('careNeeds.weekDays', day)" /> {{ optionLabel(day) }}</label>
                  }
                </div>
              </fieldset>

              <fieldset>
                <legend>{{ copy().requiredPeriods }} <strong>*</strong></legend>
                <div class="checkbox-grid compact">
                  @for (period of periods; track period) {
                    <label><input type="checkbox" name="periods" [value]="period" [checked]="isChecked('careNeeds.periods', period)" /> {{ optionLabel(period) }}</label>
                  }
                </div>
              </fieldset>

              <div class="form-grid two-columns">
                <label>
                  <span class="label-line">{{ copy().routine }}</span>
                  <textarea name="schedule" maxlength="600" [placeholder]="copy().routinePlaceholder">{{ fieldValue('careNeeds.schedule') }}</textarea>
                </label>
                <label>
                  <span class="label-line">{{ copy().careNotes }}</span>
                  <textarea name="careDescription" maxlength="800" [placeholder]="copy().careNotesPlaceholder">{{ fieldValue('careNeeds.description') }}</textarea>
                </label>
              </div>
            </section>

            <section class="form-section">
              <div class="section-title">
                <span>4</span>
                <div>
                  <h2>{{ copy().budget }}</h2>
                  <p>{{ copy().budgetHelp }}</p>
                </div>
              </div>
              <div class="form-grid two-columns">
                <label>
                  <span class="label-line">{{ copy().availableValue }} <strong>*</strong></span>
                  <input type="number" name="budgetAmount" required min="1" step="0.5" [placeholder]="copy().valuePlaceholder" [value]="fieldValue('budget.amount')" />
                </label>
                <label>
                  <span class="label-line">{{ copy().budgetPeriod }} <strong>*</strong></span>
                  <select name="budgetPeriod" required [value]="fieldValue('budget.period')">
                    <option value="">{{ copy().select }}</option>
                    @for (period of budgetPeriods; track period) {
                      <option [value]="period">{{ optionLabel(period) }}</option>
                    }
                  </select>
                </label>
              </div>
            </section>

            <section class="form-section">
              <div class="section-title">
                <span>5</span>
                <div>
                  <h2>{{ copy().homeLocation }}</h2>
                  <p>{{ copy().homeLocationHelp }}</p>
                </div>
              </div>
              <div class="form-grid two-columns">
                <label>
                  <span class="label-line">{{ copy().homeType }}</span>
                  <select name="homeType" [value]="fieldValue('home.type')">
                    <option value="">{{ copy().select }}</option>
                    @for (homeType of homeTypes; track homeType) {
                      <option [value]="homeType">{{ optionLabel(homeType) }}</option>
                    }
                  </select>
                </label>
              </div>

              <label class="check-option">
                <input type="checkbox" name="usePersonalLocation" [checked]="usePersonalLocation()" (change)="onUsePersonalLocationChange($event)" />
                {{ copy().samePersonalLocation }}
              </label>

              <div class="form-grid two-columns">
                <label>
                  <span class="label-line">{{ copy().postalCode }} <strong>*</strong></span>
                  <input name="postalCode" required [placeholder]="copy().postalCodePlaceholder" [readOnly]="usePersonalLocation()" [attr.aria-readonly]="usePersonalLocation()" [value]="familyLocationValue('postalCode')" />
                </label>
                <label>
                  <span class="label-line">{{ copy().address }}</span>
                  <input name="address" [placeholder]="copy().addressPlaceholder" [readOnly]="usePersonalLocation()" [attr.aria-readonly]="usePersonalLocation()" [value]="familyLocationValue('address')" />
                </label>
                <label>
                  <span class="label-line">{{ copy().district }}</span>
                  <input name="district" [placeholder]="copy().district" [readOnly]="usePersonalLocation()" [attr.aria-readonly]="usePersonalLocation()" [value]="familyLocationValue('district')" />
                </label>
                <label>
                  <span class="label-line">{{ copy().county }}</span>
                  <input name="county" [placeholder]="copy().county" [readOnly]="usePersonalLocation()" [attr.aria-readonly]="usePersonalLocation()" [value]="familyLocationValue('county')" />
                </label>
                <label class="span-2">
                  <span class="label-line">{{ copy().locationReference }}</span>
                  <input name="locationNotes" [placeholder]="copy().locationReferencePlaceholder" [value]="fieldValue('location.notes')" />
                </label>
              </div>

              <fieldset>
                <legend>{{ copy().homeAccessibility }}</legend>
                <div class="checkbox-grid compact">
                  @for (item of accessibilityOptions; track item) {
                    <label><input type="checkbox" name="accessibility" [value]="item" [checked]="isChecked('home.accessibility', item)" /> {{ optionLabel(item) }}</label>
                  }
                </div>
              </fieldset>

              <label class="check-option">
                <input type="checkbox" name="pets" [checked]="booleanFieldValue('home.pets')" />
                {{ copy().pets }}
              </label>

              <label>
                <span class="label-line">{{ copy().homeNotes }}</span>
                <textarea name="homeNotes" maxlength="600" [placeholder]="copy().homeNotesPlaceholder">{{ fieldValue('home.notes') }}</textarea>
              </label>
            </section>

            <section class="form-section">
              <div class="section-title">
                <span>6</span>
                <div>
                  <h2>{{ copy().emergencyContact }}</h2>
                  <p>{{ copy().emergencyContactHelp }}</p>
                </div>
              </div>
              <div class="form-grid two-columns">
                <label>
                  <span class="label-line">{{ copy().emergencyName }}</span>
                  <input name="emergencyName" [placeholder]="copy().fullNamePlaceholder" [value]="fieldValue('emergencyContact.name')" />
                </label>
                <label>
                  <span class="label-line">{{ copy().emergencyRelation }}</span>
                  <input name="emergencyRelation" [placeholder]="copy().emergencyRelationPlaceholder" [value]="fieldValue('emergencyContact.relation')" />
                </label>
                <fieldset class="emergency-phone-fieldset span-2">
                  <legend>{{ copy().emergencyPhone }}</legend>
                  <div class="emergency-phone-fields">
                    <label>
                      <span class="label-line">{{ copy().callingCode }}</span>
                      <select name="emergencyPhoneCountry" [value]="emergencyPhoneCountry()" (change)="onEmergencyPhoneCountryChange($event)">
                        @for (country of countries(); track country.code) {
                          <option [value]="country.code">{{ country.name }} (+{{ country.callingCode }})</option>
                        }
                      </select>
                    </label>
                    <label>
                      <span class="label-line">{{ copy().phone }}</span>
                      <input name="emergencyPhone" inputmode="tel" placeholder="912 345 678" [value]="emergencyPhoneNational()" />
                    </label>
                  </div>
                </fieldset>
              </div>
            </section>

            <section class="form-section">
              <div class="section-title">
                <span>7</span>
                <div>
                  <h2>{{ copy().confirmation }}</h2>
                  <p>{{ copy().confirmationHelp }}</p>
                </div>
              </div>
              <label class="check-option">
                <input type="checkbox" name="automaticMatchConsent" required [checked]="booleanFieldValue('automaticMatchConsent')" />
                {{ copy().automaticMatchConsent }}
              </label>
              <div class="form-actions">
                @if (account()?.familyProfile?.completed) {
                  <button type="button" class="btn btn-danger" (click)="cancelEdit()">{{ copy().cancel }}</button>
                }
                <button class="button" type="submit" [disabled]="isSubmitting()">
                  {{ isSubmitting() ? copy().saving : copy().save }}
                </button>
              </div>
            </section>
          </form>
        }
      </section>
    } @else {
      <section class="page">
        <div class="section-header">
          <p class="eyebrow">{{ copy().dashboardEyebrow }}</p>
          <h1>{{ copy().dashboardTitle }}</h1>
          <p class="lead">{{ copy().dashboardLead }}</p>
        </div>
        <div class="dashboard-shell">
          <aside class="card sidebar">
            <a href="#">{{ copy().summary }}</a>
            <a href="#">{{ copy().caregivers }}</a>
            <a href="#">{{ copy().messages }}</a>
            <a href="#">{{ copy().payments }}</a>
          </aside>
          <div class="grid">
            <article class="card card-body dashboard-alert">
              <div>
                <span class="badge">{{ familyStatusLabel() }}</span>
                <h3>{{ copy().familyRegistration }}</h3>
                <p class="muted">
                  {{ familyStatusMessage() }}
                </p>
              </div>
              <button class="button-secondary" type="button" (click)="editFamilyProfile()">{{ copy().updateRegistration }}</button>
            </article>

            <article class="card card-body dashboard-alert">
              <div>
                <span class="badge">{{ copy().additionalProfile }}</span>
                <h3>{{ copy().createCaregiverTitle }}</h3>
                <p class="muted">{{ copy().createCaregiverText }}</p>
              </div>
              <a class="button" routerLink="/seja-cuidador">{{ copy().createCaregiverTitle }}</a>
            </article>

            <div class="grid grid-3">
              <article class="card card-body"><span class="badge">{{ copy().active }}</span><h3>{{ copy().weeklyPlan }}</h3><p class="muted">{{ copy().scheduledVisits }}</p></article>
              <article class="card card-body"><span class="badge">{{ copy().today }}</span><h3>{{ copy().nextVisit }}</h3><p class="muted">Ana Silva, 15:00</p></article>
              <article class="card card-body"><span class="badge">{{ copy().pending }}</span><h3>{{ copy().messages }}</h3><p class="muted">{{ copy().unansweredMessages }}</p></article>
            </div>
            <div class="table-like">
              @for (visit of visits; track visit.time) {
                <article>
                  <strong>{{ visit.person }}</strong>
                  <span class="muted">{{ visit.task }}</span>
                  <span class="badge">{{ visit.time }}</span>
                </article>
              }
            </div>
          </div>
        </div>
      </section>
    }

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
  `,
  styles: `
    .family-signup-hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
      gap: 28px;
      align-items: start;
      padding-bottom: 20px;
    }

    .family-signup-page {
      padding-top: 0;
    }

    .snackbar {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 2000;
      display: flex;
      align-items: center;
      gap: 12px;
      width: min(560px, calc(100vw - 48px));
      margin: 0;
      padding: 14px 16px;
      border: 1px solid rgba(37, 99, 235, 0.24);
      border-radius: 12px;
      background: #f4f8ff;
      color: #1e4f9a;
      line-height: 1.5;
      box-shadow: 0 16px 40px rgba(16, 42, 34, 0.16);
      animation: snackbar-enter 0.25s ease-out;
    }

    .snackbar p {
      flex: 1;
      margin: 0;
      font-weight: 700;
    }

    .snackbar button {
      display: inline-flex;
      flex: 0 0 32px;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: currentColor;
      cursor: pointer;
    }

    .snackbar .material-symbols-rounded {
      font-size: 20px;
    }

    .snackbar button:hover,
    .snackbar button:focus-visible {
      background: rgba(16, 42, 34, 0.08);
    }

    .snackbar__icon {
      flex: 0 0 auto;
    }

    .snackbar--error {
      border-color: rgba(217, 119, 87, 0.34);
      background: #fff4ef;
      color: #873a28;
    }

    .snackbar--success {
      border-color: rgba(21, 128, 61, 0.28);
      background: #edf9ef;
      color: #146b37;
    }

    @keyframes snackbar-enter {
      from {
        opacity: 0;
        transform: translateY(12px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .registration-step {
      display: grid;
      grid-template-columns: 42px 1fr;
      gap: 10px 12px;
      width: min(100%, 320px);
      margin-bottom: 20px;
      color: var(--color-ink);
    }

    .registration-step__number {
      display: grid;
      grid-row: span 2;
      width: 42px;
      height: 42px;
      place-items: center;
      border-radius: 10px;
      background: var(--color-primary);
      color: #fff;
      font-weight: 900;
    }

    .registration-step > div:not(.registration-step__progress) {
      display: grid;
      gap: 2px;
    }

    .registration-step > div:not(.registration-step__progress) strong {
      font-size: 0.82rem;
      text-transform: uppercase;
    }

    .registration-step > div:not(.registration-step__progress) span {
      color: var(--color-muted);
      font-size: 0.9rem;
      font-weight: 750;
    }

    .registration-step__progress {
      grid-column: 2;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }

    .registration-step__progress span {
      height: 4px;
      border-radius: 2px;
      background: var(--color-border);
    }

    .registration-step__progress .is-active {
      background: var(--color-primary);
    }

    .signup-summary {
      display: grid;
      gap: 10px;
      padding: 22px;
      border: 1px solid rgba(220, 233, 216, 0.82);
      border-radius: 18px;
      background: #fff;
      box-shadow: var(--shadow-card);
    }

    .privacy-note {
      color: var(--color-muted);
      font-weight: 750;
      line-height: 1.45;
    }

    .family-form {
      gap: 22px;
    }

    .family-form.show-validation-errors input:required:invalid,
    .family-form.show-validation-errors select:required:invalid,
    .family-form.show-validation-errors textarea:required:invalid {
      border-color: #b83232;
      box-shadow: 0 0 0 1px rgba(184, 50, 50, 0.18);
    }

    .family-form.show-validation-errors input[type='checkbox']:required:invalid {
      outline: 2px solid rgba(184, 50, 50, 0.72);
      outline-offset: 2px;
    }

    .form-section {
      display: grid;
      gap: 18px;
      padding: 24px;
      border: 1px solid rgba(220, 233, 216, 0.82);
      border-radius: 18px;
      background: #fff;
    }

    .section-title {
      display: flex;
      gap: 14px;
      align-items: flex-start;
    }

    .section-title span {
      display: grid;
      min-width: 34px;
      height: 34px;
      place-items: center;
      border-radius: 50%;
      background: var(--color-primary-soft);
      color: var(--color-primary-strong);
      font-weight: 950;
    }

    .section-title h2 {
      margin: 0;
      color: var(--color-ink);
      font-size: 1.24rem;
    }

    .section-title p {
      margin: 4px 0 0;
      color: var(--color-muted);
    }

    .two-columns {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .three-columns {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .span-2 {
      grid-column: span 2;
    }

    .label-line {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }

    input[readonly] {
      border-color: rgba(203, 213, 225, 0.9);
      background: #f8fafc;
      color: var(--color-disabled-text);
      cursor: not-allowed;
    }

    textarea {
      min-height: 120px;
    }

    .checkbox-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px 14px;
    }

    .emergency-phone-fieldset {
      display: grid;
      gap: 12px;
      min-width: 0;
      margin: 0;
      padding: 16px;
      border: 1px solid rgba(220, 233, 216, 0.92);
      border-radius: 14px;
      background: #f8fbf6;
    }

    .emergency-phone-fieldset legend {
      padding: 0 4px;
      color: var(--color-ink);
      font-weight: 850;
    }

    .emergency-phone-fields {
      display: grid;
      grid-template-columns: minmax(220px, 0.9fr) minmax(220px, 1.1fr);
      gap: 12px;
    }

    .checkbox-grid.compact {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .checkbox-grid label,
    .check-option {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      color: var(--color-muted);
      font-weight: 750;
      line-height: 1.35;
    }

    .checkbox-grid input,
    .check-option input {
      width: auto;
      margin-top: 2px;
      accent-color: var(--color-primary);
    }

    .member-list {
      display: grid;
      gap: 14px;
    }

    .member-entry {
      display: grid;
      gap: 12px;
      padding: 16px;
      border: 1px solid rgba(220, 233, 216, 0.88);
      border-radius: 16px;
      background: #f8fbf6;
    }

    .member-actions,
    .form-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: flex-end;
      align-items: center;
    }

    .member-actions .check-option {
      margin-right: auto;
    }

    .add-button {
      width: fit-content;
    }

    .blocked-card {
      max-width: 760px;
    }

    .dashboard-alert {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 18px;
      align-items: center;
    }

    .dashboard-alert h3 {
      margin-top: 12px;
    }

    @media (max-width: 820px) {
      .snackbar {
        right: 14px;
        bottom: 14px;
        width: calc(100vw - 28px);
      }

      .family-signup-hero,
      .two-columns,
      .three-columns,
      .emergency-phone-fields,
      .dashboard-alert {
        grid-template-columns: 1fr;
      }

      .span-2 {
        grid-column: auto;
      }

      .checkbox-grid,
      .checkbox-grid.compact {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class FamilyDashboardComponent implements OnInit {
  private readonly auth = inject(Auth);
  private readonly localeService = inject(LocaleService);

  protected readonly account = signal<UserAccount | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly hasSubmitted = signal(false);
  protected readonly showFamilyForm = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly message = signal('');
  protected readonly memberEntryIds = signal<string[]>(['member-1']);
  protected readonly emergencyPhoneCountry = signal<CountryCode>('PT');
  protected readonly emergencyPhoneNational = signal('');
  protected readonly usePersonalLocation = signal(false);

  protected readonly countries = computed(() =>
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
  protected readonly snackbarKind = computed<'error' | 'success'>(() => this.errorMessage() ? 'error' : 'success');
  protected readonly snackbarMessage = computed(() => this.errorMessage() || this.message());
  protected readonly snackbarIcon = computed(() => this.snackbarKind() === 'error' ? 'error' : 'check_circle');

  protected readonly relationOptions = ['Filho/a', 'Cônjuge', 'Irmão/ã', 'Neto/a', 'Responsável legal', 'Outro'];
  protected readonly ageGroups = ['Menos de 18', '18 a 59', '60 a 74', '75 a 84', '85+'];
  protected readonly preferredCareTypes = ['Pontual', 'Recorrente semanal', 'Diário', 'Noite', '24 horas', 'Interno'];
  protected readonly weekDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  protected readonly periods = ['Manhã', 'Tarde', 'Noite'];
  protected readonly budgetPeriods = ['Por hora', 'Por turno', 'Por dia', 'Por semana', 'Por mês'];
  protected readonly careNeedOptions = [
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
  protected readonly homeTypes = ['Apartamento', 'Moradia', 'Quarto em residência', 'Lar familiar', 'Outro'];
  protected readonly accessibilityOptions = ['Elevador', 'Sem escadas', 'Cama articulada', 'Casa de banho adaptada', 'Cadeira de rodas', 'Acesso por transporte público'];

  protected readonly visits = [
    { person: 'Ana Silva', task: 'Companhia, refeição e notas da manhã', time: 'Hoje 15:00' },
    { person: 'Ana Silva', task: 'Apoio em higiene e caminhada curta', time: 'Amanhã 09:00' },
    { person: 'Rita Costa', task: 'Substituição aprovada pela família', time: 'Sexta 16:30' },
  ];

  async ngOnInit(): Promise<void> {
    await this.loadAccount();
  }

  protected copy(): (typeof FAMILY_COPY)[AppLocale] {
    return FAMILY_COPY[this.localeService.locale()];
  }

  protected optionLabel(value: string): string {
    return FAMILY_OPTION_LABELS[this.localeService.locale()][value] ?? value;
  }

  protected addMemberEntry(): void {
    this.memberEntryIds.update((entries) => [...entries, `member-${Date.now()}-${entries.length}`]);
  }

  protected removeMemberEntry(entryId: string): void {
    this.memberEntryIds.update((entries) => entries.filter((entry) => entry !== entryId));
  }

  protected onEmergencyPhoneCountryChange(event: Event): void {
    this.emergencyPhoneCountry.set((event.target as HTMLSelectElement).value as CountryCode);
  }

  protected onUsePersonalLocationChange(event: Event): void {
    this.usePersonalLocation.set((event.target as HTMLInputElement).checked);
  }

  protected editFamilyProfile(): void {
    this.errorMessage.set('');
    this.message.set('');
    this.showFamilyForm.set(true);
  }

  protected cancelEdit(): void {
    this.errorMessage.set('');
    this.message.set('');
    this.showFamilyForm.set(false);
  }

  protected closeSnackbar(): void {
    this.errorMessage.set('');
    this.message.set('');
  }

  protected async onSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.hasSubmitted.set(true);
    this.errorMessage.set('');
    this.message.set('');

    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const registration = this.buildFamilyRegistration(formData);
    const validationError = this.validateFamilyRegistration(registration);
    if (validationError) {
      this.errorMessage.set(validationError);
      return;
    }

    this.isSubmitting.set(true);
    try {
      await this.auth.registerFamily(registration);
      await this.loadAccount(false);
      this.showFamilyForm.set(false);
      this.message.set(this.copy().saved);
    } catch (error) {
      this.errorMessage.set(this.auth.getFirebaseErrorMessage(error, 'save'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected isResponsibleAdult(): boolean {
    const birthDate = this.account()?.birthDate;
    if (!birthDate) {
      return false;
    }

    const parsedBirthDate = new Date(`${birthDate}T00:00:00`);
    if (Number.isNaN(parsedBirthDate.getTime())) {
      return false;
    }

    const eighteenthBirthday = new Date(parsedBirthDate);
    eighteenthBirthday.setFullYear(parsedBirthDate.getFullYear() + 18);
    return eighteenthBirthday <= new Date();
  }

  protected fieldValue(path: string): string {
    const value = this.rawFamilyValue(path);
    if (typeof value === 'number') {
      return String(value);
    }

    return typeof value === 'string' ? value : '';
  }

  protected familyLocationValue(key: 'postalCode' | 'address' | 'district' | 'county'): string {
    if (this.usePersonalLocation()) {
      if (key === 'postalCode' || key === 'address') {
        return this.account()?.private?.[key] ?? '';
      }

      return this.account()?.location?.[key] ?? '';
    }

    return this.fieldValue(`location.${key}`);
  }

  protected booleanFieldValue(path: string): boolean {
    return this.rawFamilyValue(path) === true;
  }

  protected isChecked(path: string, option: string): boolean {
    const value = this.rawFamilyValue(path);
    return Array.isArray(value) && value.includes(option);
  }

  protected memberFieldValue(entryId: string, key: 'name' | 'email' | 'relation'): string {
    const index = this.memberEntryIds().indexOf(entryId);
    const members = this.account()?.familyProfile?.members ?? [];
    return members[index]?.[key] ?? '';
  }

  protected memberInviteChecked(entryId: string): boolean {
    const index = this.memberEntryIds().indexOf(entryId);
    const members = this.account()?.familyProfile?.members ?? [];
    return members[index]?.invite === true;
  }

  protected familyStatusLabel(): string {
    const status = this.account()?.familyProfileStatus;
    if (status === 'approved') {
      return this.copy().statusApproved;
    }
    if (status === 'analysing') {
      return this.copy().statusAnalysing;
    }
    if (status === 'rejected') {
      return this.copy().statusRejected;
    }
    return this.copy().statusPending;
  }

  protected familyStatusMessage(): string {
    const status = this.account()?.familyProfileStatus;
    if (status === 'approved') {
      return this.copy().statusApprovedMessage;
    }
    if (status === 'analysing') {
      return this.copy().statusAnalysingMessage;
    }
    if (status === 'rejected') {
      return this.copy().statusRejectedMessage;
    }
    return this.copy().statusPendingMessage;
  }

  private async loadAccount(showLoading = true): Promise<void> {
    if (showLoading) {
      this.isLoading.set(true);
    }

    const user = await this.auth.getCurrentUser();
    const account = user ? await this.auth.getUserAccount(user.uid) : null;
    this.account.set(account);
    this.syncMemberEntries(account);
    this.loadEmergencyPhone(account);
    this.syncUsePersonalLocation(account);
    this.showFamilyForm.set(!account?.familyProfile?.completed || account.familyProfileStatus === 'draft');
    this.isLoading.set(false);
  }

  private syncMemberEntries(account: UserAccount | null): void {
    const memberCount = Math.max(account?.familyProfile?.members?.length ?? 0, 1);
    this.memberEntryIds.set(Array.from({ length: memberCount }, (_, index) => `member-${index + 1}`));
  }

  private syncUsePersonalLocation(account: UserAccount | null): void {
    const familyLocation = account?.familyProfile?.location;
    if (!familyLocation) {
      this.usePersonalLocation.set(false);
      return;
    }

    this.usePersonalLocation.set(
      (familyLocation.postalCode || '') === (account?.private?.postalCode || '') &&
      (familyLocation.address || '') === (account?.private?.address || '') &&
      (familyLocation.district || '') === (account?.location?.district || '') &&
      (familyLocation.county || '') === (account?.location?.county || ''),
    );
  }

  private buildFamilyRegistration(formData: FormData): FamilyRegistration {
    const emergencyPhoneCountry = this.formValue(formData, 'emergencyPhoneCountry') as CountryCode;
    const emergencyPhoneNational = this.formValue(formData, 'emergencyPhone');
    const members = this.memberEntryIds()
      .map((entryId) => ({
        name: this.formValue(formData, `memberName-${entryId}`),
        email: this.formValue(formData, `memberEmail-${entryId}`),
        relation: this.formValue(formData, `memberRelation-${entryId}`),
        invite: formData.has(`memberInvite-${entryId}`),
      }))
      .filter((member) => member.name || member.email || member.relation);

    return {
      householdName: this.formValue(formData, 'householdName'),
      relationToCareRecipient: this.formValue(formData, 'relationToCareRecipient'),
      members,
      careRecipients: {
        count: Number(this.formValue(formData, 'careRecipientsCount')),
        ageGroups: this.formValues(formData, 'ageGroups'),
        notes: this.formValue(formData, 'careDescription'),
      },
      careNeeds: {
        services: this.formValues(formData, 'careServices'),
        customService: this.formValue(formData, 'customCareService'),
        weekDays: this.formValues(formData, 'weekDays'),
        periods: this.formValues(formData, 'periods'),
        description: this.formValue(formData, 'careDescription'),
        schedule: this.formValue(formData, 'schedule'),
        preferredCareType: this.formValue(formData, 'preferredCareType'),
      },
      budget: {
        amount: Number(this.formValue(formData, 'budgetAmount')),
        period: this.formValue(formData, 'budgetPeriod'),
      },
      location: {
        postalCode: this.formValue(formData, 'postalCode'),
        address: this.formValue(formData, 'address'),
        district: this.formValue(formData, 'district'),
        county: this.formValue(formData, 'county'),
        notes: this.formValue(formData, 'locationNotes'),
      },
      home: {
        type: this.formValue(formData, 'homeType'),
        accessibility: this.formValues(formData, 'accessibility'),
        pets: formData.has('pets'),
        notes: this.formValue(formData, 'homeNotes'),
      },
      emergencyContact: {
        name: this.formValue(formData, 'emergencyName'),
        phone: emergencyPhoneNational ? this.normalizedEmergencyPhone(formData) : '',
        phoneCountry: emergencyPhoneNational ? emergencyPhoneCountry : '',
        phoneCallingCode: emergencyPhoneNational ? `+${getCountryCallingCode(emergencyPhoneCountry)}` : '',
        phoneNational: emergencyPhoneNational,
        relation: this.formValue(formData, 'emergencyRelation'),
      },
      automaticMatchConsent: formData.has('automaticMatchConsent'),
    };
  }

  private validateFamilyRegistration(registration: FamilyRegistration): string {
    if (!this.isResponsibleAdult()) {
      return this.copy().validationAdult;
    }

    if (!registration.householdName) {
      return this.copy().validationHousehold;
    }

    if (!registration.relationToCareRecipient) {
      return this.copy().validationRelation;
    }

    if (!registration.careRecipients.count || registration.careRecipients.count < 1) {
      return this.copy().validationRecipientCount;
    }

    if (registration.careRecipients.ageGroups.length === 0) {
      return this.copy().validationAgeGroups;
    }

    if (registration.careNeeds.services.length === 0) {
      return this.copy().validationCareServices;
    }

    if (registration.careNeeds.weekDays.length === 0) {
      return this.copy().validationWeekDays;
    }

    if (registration.careNeeds.periods.length === 0) {
      return this.copy().validationPeriods;
    }

    if (!registration.careNeeds.preferredCareType) {
      return this.copy().validationCareType;
    }

    if (!registration.budget.amount || registration.budget.amount <= 0 || !registration.budget.period) {
      return this.copy().validationBudget;
    }

    if (!registration.location.postalCode) {
      return this.copy().validationPostalCode;
    }

    if (registration.emergencyContact.phoneNational && !this.isValidEmergencyPhone(registration)) {
      return this.copy().validationEmergencyPhone;
    }

    const invalidInvite = registration.members.some((member) => member.invite && !this.isValidEmail(member.email));
    if (invalidInvite) {
      return this.copy().validationInviteEmail;
    }

    if (!registration.automaticMatchConsent) {
      return this.copy().validationMatchConsent;
    }

    return '';
  }

  private rawFamilyValue(path: string): unknown {
    const familyProfile = this.account()?.familyProfile;
    if (!familyProfile) {
      return undefined;
    }

    return path.split('.').reduce<unknown>((current, key) => {
      if (!current || typeof current !== 'object') {
        return undefined;
      }

      return (current as Record<string, unknown>)[key];
    }, familyProfile);
  }

  private formValue(formData: FormData, name: string): string {
    const value = formData.get(name);
    return typeof value === 'string' ? value.trim() : '';
  }

  private formValues(formData: FormData, name: string): string[] {
    return formData
      .getAll(name)
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private loadEmergencyPhone(account: UserAccount | null): void {
    const emergencyContact = account?.familyProfile?.emergencyContact;
    if (emergencyContact?.phoneCountry && emergencyContact.phoneNational) {
      this.emergencyPhoneCountry.set(emergencyContact.phoneCountry as CountryCode);
      this.emergencyPhoneNational.set(emergencyContact.phoneNational);
      return;
    }

    const parsedPhone = parsePhoneNumberFromString(emergencyContact?.phone ?? '');
    if (parsedPhone?.country) {
      this.emergencyPhoneCountry.set(parsedPhone.country);
      this.emergencyPhoneNational.set(parsedPhone.nationalNumber);
      return;
    }

    this.emergencyPhoneNational.set(emergencyContact?.phone ?? '');
  }

  private normalizedEmergencyPhone(formData: FormData): string {
    const country = this.formValue(formData, 'emergencyPhoneCountry') as CountryCode;
    const phone = parsePhoneNumberFromString(this.formValue(formData, 'emergencyPhone'), country);
    return phone?.number ?? '';
  }

  private isValidEmergencyPhone(registration: FamilyRegistration): boolean {
    const phone = parsePhoneNumberFromString(
      registration.emergencyContact.phoneNational,
      registration.emergencyContact.phoneCountry as CountryCode,
    );
    return !!phone && phone.country === registration.emergencyContact.phoneCountry && phone.isValid();
  }

  private countryDisplayName(country: CountryCode): string {
    return new Intl.DisplayNames([this.localeService.locale()], { type: 'region' }).of(country) ?? country;
  }
}
