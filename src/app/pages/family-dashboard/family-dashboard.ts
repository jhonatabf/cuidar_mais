import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';

import { Auth, FamilyRegistration, UserAccount } from '../../core/services/auth';

@Component({
  selector: 'app-family-dashboard',
  imports: [RouterLink],
  template: `
    @if (isLoading()) {
      <section class="page">
        <p class="form-message success-message">A carregar cadastro de família...</p>
      </section>
    } @else if (showFamilyForm()) {
      <section class="page family-signup-hero">
        <div>
          <p class="eyebrow">Cadastro de família</p>
          <h1>Conte-nos quem precisa de cuidado e como podemos ajudar.</h1>
          <p class="lead">
            O cadastro de família ajuda a Cuidar+ entender a casa, os utentes, os cuidados necessários e o orçamento
            disponível para futuros matches automáticos.
          </p>
        </div>
        <aside class="signup-summary" aria-label="Resumo do cadastro">
          <span class="badge">Pré-requisito</span>
          <h3>Responsável maior de idade</h3>
          <p>Para cadastrar uma família, a pessoa responsável precisa ter 18 anos ou mais.</p>
          <p class="privacy-note">O valor informado será usado para match automático, não para pesquisa manual por cuidadores.</p>
        </aside>
      </section>

      <section class="page family-signup-page">
        @if (errorMessage()) {
          <p class="form-message error-message" role="alert">{{ errorMessage() }}</p>
        }
        @if (message()) {
          <p class="form-message success-message" role="status">{{ message() }}</p>
        }

        @if (!isResponsibleAdult()) {
          <article class="card card-body blocked-card">
            <span class="badge">Cadastro bloqueado</span>
            <h2>É necessário ser maior de idade.</h2>
            <p class="muted">
              A data de nascimento dos dados pessoais indica que ainda não é possível assumir a responsabilidade por um
              cadastro de família.
            </p>
          </article>
        } @else {
          <form class="family-form form-grid" novalidate (submit)="onSubmit($event)">
            <section class="form-section">
              <div class="section-title">
                <span>1</span>
                <div>
                  <h2>Identificação da família</h2>
                  <p>Informação interna para organizar o cadastro e os convites.</p>
                </div>
              </div>
              <div class="form-grid two-columns">
                <label>
                  <span class="label-line">Nome da família ou casa <strong>*</strong></span>
                  <input name="householdName" required placeholder="Ex.: Família Silva" [value]="fieldValue('householdName')" />
                </label>
                <label>
                  <span class="label-line">Relação com o utente <strong>*</strong></span>
                  <select name="relationToCareRecipient" required [value]="fieldValue('relationToCareRecipient')">
                    <option value="">Selecionar</option>
                    @for (relation of relationOptions; track relation) {
                      <option [value]="relation">{{ relation }}</option>
                    }
                  </select>
                </label>
              </div>
            </section>

            <section class="form-section">
              <div class="section-title">
                <span>2</span>
                <div>
                  <h2>Membros da família</h2>
                  <p>Pode convidar outras pessoas por email para acompanhar o cadastro.</p>
                </div>
              </div>
              <div class="member-list">
                @for (entryId of memberEntryIds(); track entryId) {
                  <div class="member-entry">
                    <div class="form-grid three-columns">
                      <label>
                        <span class="label-line">Nome</span>
                        <input [name]="'memberName-' + entryId" placeholder="Nome do membro" [value]="memberFieldValue(entryId, 'name')" />
                      </label>
                      <label>
                        <span class="label-line">Email</span>
                        <input type="email" [name]="'memberEmail-' + entryId" placeholder="email@exemplo.com" [value]="memberFieldValue(entryId, 'email')" />
                      </label>
                      <label>
                        <span class="label-line">Relação</span>
                        <input [name]="'memberRelation-' + entryId" placeholder="Ex.: irmã, filho" [value]="memberFieldValue(entryId, 'relation')" />
                      </label>
                    </div>
                    <div class="member-actions">
                      <label class="check-option">
                        <input type="checkbox" [name]="'memberInvite-' + entryId" [checked]="memberInviteChecked(entryId)" />
                        Convidar por email
                      </label>
                      @if (memberEntryIds().length > 1) {
                        <button type="button" class="btn btn-danger button-small" (click)="removeMemberEntry(entryId)">Remover</button>
                      }
                    </div>
                  </div>
                }
              </div>
              <button type="button" class="button-secondary button-small add-button" (click)="addMemberEntry()">Adicionar membro</button>
            </section>

            <section class="form-section">
              <div class="section-title">
                <span>3</span>
                <div>
                  <h2>Utentes e cuidados</h2>
                  <p>Detalhe quantas pessoas precisam de cuidado e quais tarefas são esperadas.</p>
                </div>
              </div>
              <div class="form-grid two-columns">
                <label>
                  <span class="label-line">Número de idosos ou pessoas com necessidade de cuidado <strong>*</strong></span>
                  <input type="number" name="careRecipientsCount" required min="1" max="10" [value]="fieldValue('careRecipients.count')" />
                </label>
                <label>
                  <span class="label-line">Tipo de acompanhamento preferido <strong>*</strong></span>
                  <select name="preferredCareType" required [value]="fieldValue('careNeeds.preferredCareType')">
                    <option value="">Selecionar</option>
                    @for (careType of preferredCareTypes; track careType) {
                      <option [value]="careType">{{ careType }}</option>
                    }
                  </select>
                </label>
              </div>

              <fieldset>
                <legend>Faixa etária dos utentes <strong>*</strong></legend>
                <div class="checkbox-grid compact">
                  @for (ageGroup of ageGroups; track ageGroup) {
                    <label><input type="checkbox" name="ageGroups" [value]="ageGroup" [checked]="isChecked('careRecipients.ageGroups', ageGroup)" /> {{ ageGroup }}</label>
                  }
                </div>
              </fieldset>

              <fieldset>
                <legend>Cuidados necessários <strong>*</strong></legend>
                <div class="checkbox-grid">
                  @for (service of careNeedOptions; track service) {
                    <label><input type="checkbox" name="careServices" [value]="service" [checked]="isChecked('careNeeds.services', service)" /> {{ service }}</label>
                  }
                </div>
              </fieldset>

              <div class="form-grid two-columns">
                <label>
                  <span class="label-line">Rotina ou frequência desejada <strong>*</strong></span>
                  <textarea name="schedule" required maxlength="600" placeholder="Ex.: manhãs de segunda a sexta, apoio ao banho e refeições.">{{ fieldValue('careNeeds.schedule') }}</textarea>
                </label>
                <label>
                  <span class="label-line">Observações sobre saúde, autonomia ou preferências</span>
                  <textarea name="careDescription" maxlength="800" placeholder="Descreva mobilidade, medicação, companhia, alimentação ou outros detalhes.">{{ fieldValue('careNeeds.description') }}</textarea>
                </label>
              </div>
            </section>

            <section class="form-section">
              <div class="section-title">
                <span>4</span>
                <div>
                  <h2>Orçamento e localização</h2>
                  <p>O orçamento será usado apenas para o match automático.</p>
                </div>
              </div>
              <div class="form-grid three-columns">
                <label>
                  <span class="label-line">Valor disponível (€) <strong>*</strong></span>
                  <input type="number" name="budgetAmount" required min="1" step="0.5" placeholder="Ex.: 15" [value]="fieldValue('budget.amount')" />
                </label>
                <label>
                  <span class="label-line">Periodicidade <strong>*</strong></span>
                  <select name="budgetPeriod" required [value]="fieldValue('budget.period')">
                    <option value="">Selecionar</option>
                    @for (period of budgetPeriods; track period) {
                      <option [value]="period">{{ period }}</option>
                    }
                  </select>
                </label>
                <label>
                  <span class="label-line">Código postal / CEP <strong>*</strong></span>
                  <input name="postalCode" required placeholder="Ex.: 4000-000" [value]="fieldValue('location.postalCode') || account()?.private?.postalCode || ''" />
                </label>
              </div>
              <div class="form-grid two-columns">
                <label>
                  <span class="label-line">Morada de referência</span>
                  <input name="address" placeholder="Rua, número, complemento" [value]="fieldValue('location.address') || account()?.private?.address || ''" />
                </label>
                <label>
                  <span class="label-line">Distrito</span>
                  <input name="district" placeholder="Distrito" [value]="fieldValue('location.district') || account()?.location?.district || ''" />
                </label>
                <label>
                  <span class="label-line">Concelho</span>
                  <input name="county" placeholder="Concelho" [value]="fieldValue('location.county') || account()?.location?.county || ''" />
                </label>
                <label>
                  <span class="label-line">Referência de localização</span>
                  <input name="locationNotes" placeholder="Ex.: perto do metro, zona com estacionamento" [value]="fieldValue('location.notes')" />
                </label>
              </div>
            </section>

            <section class="form-section">
              <div class="section-title">
                <span>5</span>
                <div>
                  <h2>Casa e contacto de emergência</h2>
                  <p>Campos adicionais para tornar o match mais realista.</p>
                </div>
              </div>
              <div class="form-grid two-columns">
                <label>
                  <span class="label-line">Tipo de casa</span>
                  <select name="homeType" [value]="fieldValue('home.type')">
                    <option value="">Selecionar</option>
                    @for (homeType of homeTypes; track homeType) {
                      <option [value]="homeType">{{ homeType }}</option>
                    }
                  </select>
                </label>
                <label>
                  <span class="label-line">Nome do contacto de emergência</span>
                  <input name="emergencyName" placeholder="Nome completo" [value]="fieldValue('emergencyContact.name')" />
                </label>
                <fieldset class="emergency-phone-fieldset">
                  <legend>Telefone do contacto de emergência</legend>
                  <div class="emergency-phone-fields">
                    <label>
                      <span class="label-line">Indicativo</span>
                      <select name="emergencyPhoneCountry" [value]="emergencyPhoneCountry()" (change)="onEmergencyPhoneCountryChange($event)">
                        @for (country of countries; track country.code) {
                          <option [value]="country.code">{{ country.name }} (+{{ country.callingCode }})</option>
                        }
                      </select>
                    </label>
                    <label>
                      <span class="label-line">Telefone</span>
                      <input name="emergencyPhone" inputmode="tel" placeholder="912 345 678" [value]="emergencyPhoneNational()" />
                    </label>
                  </div>
                </fieldset>
                <label>
                  <span class="label-line">Relação do contacto de emergência</span>
                  <input name="emergencyRelation" placeholder="Ex.: filha, irmão" [value]="fieldValue('emergencyContact.relation')" />
                </label>
              </div>

              <fieldset>
                <legend>Acessibilidade da casa</legend>
                <div class="checkbox-grid compact">
                  @for (item of accessibilityOptions; track item) {
                    <label><input type="checkbox" name="accessibility" [value]="item" [checked]="isChecked('home.accessibility', item)" /> {{ item }}</label>
                  }
                </div>
              </fieldset>

              <label class="check-option">
                <input type="checkbox" name="pets" [checked]="booleanFieldValue('home.pets')" />
                Existem animais em casa
              </label>

              <label>
                <span class="label-line">Notas sobre a casa</span>
                <textarea name="homeNotes" maxlength="600" placeholder="Ex.: escadas, elevador pequeno, necessidade de entrar com chave.">{{ fieldValue('home.notes') }}</textarea>
              </label>
            </section>

            <section class="form-section">
              <div class="section-title">
                <span>6</span>
                <div>
                  <h2>Confirmação</h2>
                  <p>Após guardar, o cadastro fica disponível para análise administrativa.</p>
                </div>
              </div>
              <label class="check-option">
                <input type="checkbox" name="automaticMatchConsent" required [checked]="booleanFieldValue('automaticMatchConsent')" />
                Confirmo que o orçamento informado pode ser usado futuramente no match automático.
              </label>
              <div class="form-actions">
                @if (account()?.familyProfile?.completed) {
                  <button type="button" class="btn btn-danger" (click)="cancelEdit()">Cancelar</button>
                }
                <button class="button" type="submit" [disabled]="isSubmitting()">
                  {{ isSubmitting() ? 'A guardar...' : 'Guardar cadastro de família' }}
                </button>
              </div>
            </section>
          </form>
        }
      </section>
    } @else {
      <section class="page">
        <div class="section-header">
          <p class="eyebrow">Dashboard família</p>
          <h1>Visão geral dos cuidados contratados.</h1>
          <p class="lead">Resumo do plano, próximas visitas e pedidos em aberto.</p>
        </div>
        <div class="dashboard-shell">
          <aside class="card sidebar">
            <a href="#">Resumo</a>
            <a href="#">Cuidadores</a>
            <a href="#">Mensagens</a>
            <a href="#">Pagamentos</a>
          </aside>
          <div class="grid">
            <article class="card card-body dashboard-alert">
              <div>
                <span class="badge">{{ familyStatusLabel() }}</span>
                <h3>Cadastro da família</h3>
                <p class="muted">
                  {{ familyStatusMessage() }}
                </p>
              </div>
              <button class="button-secondary" type="button" (click)="editFamilyProfile()">Atualizar cadastro</button>
            </article>

            <article class="card card-body dashboard-alert">
              <div>
                <span class="badge">Perfil adicional</span>
                <h3>Criar perfil de cuidador</h3>
                <p class="muted">
                  Use a mesma conta para também oferecer serviços como cuidador.
                </p>
              </div>
              <a class="button" routerLink="/seja-cuidador">Criar perfil de cuidador</a>
            </article>

            <div class="grid grid-3">
              <article class="card card-body"><span class="badge">Ativo</span><h3>Plano semanal</h3><p class="muted">5 visitas agendadas</p></article>
              <article class="card card-body"><span class="badge">Hoje</span><h3>Próxima visita</h3><p class="muted">Ana Silva, 15:00</p></article>
              <article class="card card-body"><span class="badge">Pendente</span><h3>Mensagens</h3><p class="muted">2 por responder</p></article>
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

    .label-line {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
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
      .family-signup-hero,
      .two-columns,
      .three-columns,
      .emergency-phone-fields,
      .dashboard-alert {
        grid-template-columns: 1fr;
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

  protected readonly account = signal<UserAccount | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly showFamilyForm = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly message = signal('');
  protected readonly memberEntryIds = signal<string[]>(['member-1']);
  protected readonly emergencyPhoneCountry = signal<CountryCode>('PT');
  protected readonly emergencyPhoneNational = signal('');

  protected readonly countries = getCountries().map((code) => ({
    code,
    name: this.countryDisplayName(code),
    callingCode: getCountryCallingCode(code),
  }));

  protected readonly relationOptions = ['Filho/a', 'Cônjuge', 'Irmão/ã', 'Neto/a', 'Responsável legal', 'Outro'];
  protected readonly ageGroups = ['Menos de 18', '18 a 59', '60 a 74', '75 a 84', '85+'];
  protected readonly preferredCareTypes = ['Pontual', 'Recorrente semanal', 'Diário', 'Noite', '24 horas', 'Interno'];
  protected readonly budgetPeriods = ['Por hora', 'Por turno', 'Por dia', 'Por semana', 'Por mês'];
  protected readonly careNeedOptions = [
    'Companhia',
    'Higiene pessoal',
    'Preparação de refeições',
    'Medicação',
    'Mobilidade',
    'Acompanhamento médico',
    'Cuidados pós-operatórios',
    'Demência ou Alzheimer',
    'Limpeza leve',
    'Dormir na casa',
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

  protected addMemberEntry(): void {
    this.memberEntryIds.update((entries) => [...entries, `member-${Date.now()}-${entries.length}`]);
  }

  protected removeMemberEntry(entryId: string): void {
    this.memberEntryIds.update((entries) => entries.filter((entry) => entry !== entryId));
  }

  protected onEmergencyPhoneCountryChange(event: Event): void {
    this.emergencyPhoneCountry.set((event.target as HTMLSelectElement).value as CountryCode);
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

  protected async onSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
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
      this.message.set('Cadastro de família guardado e enviado para análise.');
    } catch (error) {
      this.errorMessage.set(this.auth.getFirebaseErrorMessage(error));
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
      return 'Aprovado';
    }
    if (status === 'analysing') {
      return 'Em análise';
    }
    if (status === 'rejected') {
      return 'Correção necessária';
    }
    return 'Pendente';
  }

  protected familyStatusMessage(): string {
    const status = this.account()?.familyProfileStatus;
    if (status === 'approved') {
      return 'O cadastro da família foi aprovado pela equipa Cuidar+.';
    }
    if (status === 'analysing') {
      return 'O cadastro está sendo analisado pela equipa Cuidar+.';
    }
    if (status === 'rejected') {
      return 'O cadastro foi rejeitado. Atualize as informações solicitadas e envie novamente.';
    }
    return 'O cadastro foi enviado e aguarda análise da equipa Cuidar+.';
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
    this.showFamilyForm.set(!account?.familyProfile?.completed || account.familyProfileStatus === 'draft');
    this.isLoading.set(false);
  }

  private syncMemberEntries(account: UserAccount | null): void {
    const memberCount = Math.max(account?.familyProfile?.members?.length ?? 0, 1);
    this.memberEntryIds.set(Array.from({ length: memberCount }, (_, index) => `member-${index + 1}`));
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
      return 'É necessário ser maior de idade para cadastrar uma família.';
    }

    if (!registration.householdName) {
      return 'Informe o nome da família ou casa.';
    }

    if (!registration.relationToCareRecipient) {
      return 'Informe a sua relação com o utente.';
    }

    if (!registration.careRecipients.count || registration.careRecipients.count < 1) {
      return 'Informe quantas pessoas precisam de cuidado.';
    }

    if (registration.careRecipients.ageGroups.length === 0) {
      return 'Selecione a faixa etária dos utentes.';
    }

    if (registration.careNeeds.services.length === 0) {
      return 'Selecione pelo menos um cuidado necessário.';
    }

    if (!registration.careNeeds.schedule) {
      return 'Informe a rotina ou frequência desejada.';
    }

    if (!registration.careNeeds.preferredCareType) {
      return 'Informe o tipo de acompanhamento preferido.';
    }

    if (!registration.budget.amount || registration.budget.amount <= 0 || !registration.budget.period) {
      return 'Informe o valor disponível e a periodicidade.';
    }

    if (!registration.location.postalCode) {
      return 'Informe o código postal / CEP.';
    }

    if (registration.emergencyContact.phoneNational && !this.isValidEmergencyPhone(registration)) {
      return 'Informe um telefone de emergência válido para o indicativo selecionado.';
    }

    const invalidInvite = registration.members.some((member) => member.invite && !this.isValidEmail(member.email));
    if (invalidInvite) {
      return 'Para convidar um membro, informe um email válido.';
    }

    if (!registration.automaticMatchConsent) {
      return 'Confirme que o orçamento pode ser usado futuramente no match automático.';
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
    return new Intl.DisplayNames(['pt-PT'], { type: 'region' }).of(country) ?? country;
  }
}
