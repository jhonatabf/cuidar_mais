import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Auth, CaregiverRegistration } from '../../core/services/auth';

@Component({
  selector: 'app-become-caregiver',
  imports: [RouterLink],
  template: `
    <section class="page caregiver-signup-hero">
      <div>
        <p class="eyebrow">Cadastro de cuidadora</p>
        <h1>Crie um perfil claro, confiável e rápido de avaliar.</h1>
        <p class="lead">
          O cadastro inicial recolhe apenas o essencial para apresentar a profissional
          às famílias, mantendo dados sensíveis privados.
        </p>
      </div>

      <aside class="signup-summary" aria-label="Resumo do cadastro">
        <span class="badge">MVP</span>
        <h3>Perfil público enxuto</h3>
        <p>As famílias verão resumo, serviços, disponibilidade, localização aproximada, idiomas e competências.</p>
        <p class="privacy-note">NIF, documento, morada e contactos privados não aparecem no perfil público.</p>
      </aside>
    </section>

    <section class="page signup-layout">
      <aside class="signup-nav" aria-label="Secções do cadastro">
        @for (section of sections; track section) {
          <a [href]="'#' + section.id" (click)="scrollToSection($event, section.id)">{{ section.label }}</a>
        }
      </aside>

      <form class="caregiver-form" (submit)="onSubmit($event)">
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
            <label><input type="checkbox" name="acceptedTerms" required /> Aceito os <a routerLink="/termos">Termos e Condições</a> <strong>*</strong></label>
            <label><input type="checkbox" name="acceptedPrivacy" required /> Aceito a <a routerLink="/privacidade">Política de Privacidade</a> <strong>*</strong></label>
          </div>
        </section>

        <section id="dados-pessoais" class="signup-section">
          <div class="section-title">
            <span>2</span>
            <div>
              <h2>Dados pessoais</h2>
              <p>Dados básicos para identificação e contacto.</p>
            </div>
          </div>
          <div class="form-grid two-columns">
            <label>Nome completo <strong>*</strong><input name="fullName" required placeholder="Nome e apelido" /></label>
            <label>Data de nascimento <strong>*</strong><input type="date" name="birthDate" required /></label>
            <label>Sexo <strong>*</strong>
              <select name="gender" required>
                <option value="">Selecionar</option>
                <option>Feminino</option>
                <option>Masculino</option>
                <option>Outro</option>
                <option>Prefiro não indicar</option>
              </select>
            </label>
            <label>Nacionalidade <strong>*</strong><input name="nationality" required placeholder="Portuguesa" /></label>
            <label>Telemóvel <strong>*</strong><input type="tel" name="phone" required placeholder="+351 900 000 000" /></label>
            <label>Foto de perfil<input type="file" name="profilePhoto" accept="image/*" /></label>
            <label>NIF <small>privado</small><input name="nif" inputmode="numeric" placeholder="Opcional nesta fase" /></label>
            <label>Documento de identificação <small>privado</small><input name="idDocument" placeholder="Opcional nesta fase" /></label>
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
            <label>Distrito <strong>*</strong><input name="district" required placeholder="Lisboa" /></label>
            <label>Concelho <strong>*</strong><input name="county" required placeholder="Oeiras" /></label>
            <label>Código Postal <strong>*</strong><input name="postalCode" required placeholder="0000-000" /></label>
            <label>Raio máximo de deslocação
              <select name="travelRadius">
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
            <label class="span-2">Morada completa <small>privada</small><input name="address" placeholder="Rua, número, localidade" /></label>
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
            <label>Resumo profissional <strong>*</strong><textarea name="summary" required maxlength="650" placeholder="Descreva a sua experiência, estilo de cuidado e tipo de pessoa que costuma acompanhar."></textarea></label>
            <label>Anos de experiência <strong>*</strong><input type="number" name="experienceYears" required min="0" max="60" placeholder="Ex.: 5" /></label>
          </div>
          <fieldset>
            <legend>Tipos de serviço prestados <strong>*</strong></legend>
            <div class="checkbox-grid">
              @for (service of serviceTypes; track service) {
                <label><input type="checkbox" name="serviceTypes" [value]="service" /> {{ service }}</label>
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
          <fieldset>
            <legend>Formação profissional</legend>
            <div class="checkbox-grid compact">
              @for (course of trainingTypes; track course) {
                <label><input type="checkbox" name="trainingTypes" [value]="course" /> {{ course }}</label>
              }
            </div>
          </fieldset>
          <div class="form-grid three-columns training-details">
            <label>Nome do curso<input name="courseName" placeholder="Ex.: Auxiliar de geriatria" /></label>
            <label>Entidade formadora<input name="trainingEntity" placeholder="Nome da instituição" /></label>
            <label>Ano de conclusão<input type="number" name="completionYear" min="1950" max="2030" placeholder="2024" /></label>
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
                <label><input type="checkbox" name="weekDays" [value]="day" /> {{ day }}</label>
              }
            </div>
          </fieldset>
          <fieldset>
            <legend>Períodos <strong>*</strong></legend>
            <div class="checkbox-grid compact">
              @for (period of periods; track period) {
                <label><input type="checkbox" name="periods" [value]="period" /> {{ period }}</label>
              }
            </div>
          </fieldset>
          <fieldset>
            <legend>Disponível para</legend>
            <div class="checkbox-grid compact">
              @for (type of availabilityTypes; track type) {
                <label><input type="checkbox" name="availabilityTypes" [value]="type" /> {{ type }}</label>
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
            <label>Valor por hora (€) <strong>*</strong><input type="number" name="hourlyRate" required min="0" step="0.5" placeholder="15" /></label>
            <label>Valor por turno<input type="number" name="shiftRate" min="0" step="0.5" /></label>
            <label>Valor por dia<input type="number" name="dayRate" min="0" step="0.5" /></label>
            <label>Valor mensal<input type="number" name="monthlyRate" min="0" step="0.5" /></label>
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
              <label><input type="checkbox" name="skills" [value]="skill" /> {{ skill }}</label>
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
                <label><input type="checkbox" name="languages" [value]="language" /> {{ language }}</label>
              }
            </div>
          </fieldset>
          <fieldset>
            <legend>Mobilidade</legend>
            <div class="checkbox-grid compact">
              <label><input type="checkbox" name="drivingLicense" /> Possui carta de condução</label>
              <label><input type="checkbox" name="ownVehicle" /> Possui viatura própria</label>
              <label><input type="checkbox" name="acceptsTravel" /> Aceita deslocações</label>
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
            <label>Nome da referência<input name="referenceName" placeholder="Nome completo" /></label>
            <label>Contacto<input name="referenceContact" placeholder="Telemóvel ou email" /></label>
            <label>Relação profissional<input name="referenceRelation" placeholder="Ex.: antiga família, instituição" /></label>
          </div>
        </section>

        <div class="form-actions">
          @if (errorMessage) {
            <p class="form-message error-message" role="alert">{{ errorMessage }}</p>
          }
          @if (successMessage) {
            <p class="form-message success-message" role="status">{{ successMessage }}</p>
          }
          <button class="button" type="submit" [disabled]="isSubmitting">
            {{ isSubmitting ? 'A gravar...' : 'Guardar cadastro inicial' }}
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

  protected readonly sections = [
    { id: 'conta', label: 'Conta' },
    { id: 'dados-pessoais', label: 'Dados pessoais' },
    { id: 'localizacao', label: 'Localização' },
    { id: 'perfil-profissional', label: 'Perfil' },
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
  }

  protected async onSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.errorMessage = '';
    this.successMessage = '';

    const form = event.currentTarget as HTMLFormElement;
    if (!form.reportValidity()) {
      return;
    }

    const formData = new FormData(form);
    const data = this.buildCaregiverRegistration(formData);
    const missingGroup = this.getMissingRequiredGroup(data);
    if (missingGroup) {
      this.errorMessage = `Selecione pelo menos uma opção em ${missingGroup}.`;
      return;
    }

    this.isSubmitting = true;
    try {
      await this.authService.registerCaregiver(data);
      form.reset();
      this.successMessage = 'Cadastro gravado com sucesso. O perfil foi criado como rascunho.';
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

  private buildCaregiverRegistration(formData: FormData): CaregiverRegistration {
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
        profilePhotoName: this.fileName(formData, 'profilePhoto'),
        private: {
          nif: this.textValue(formData, 'nif'),
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
        trainingTypes: this.arrayValue(formData, 'trainingTypes'),
        courseName: this.textValue(formData, 'courseName'),
        trainingEntity: this.textValue(formData, 'trainingEntity'),
        completionYear: this.numberValue(formData, 'completionYear'),
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

  private fileName(formData: FormData, key: string): string {
    const value = formData.get(key);
    return value instanceof File && value.name ? value.name : '';
  }
}
