import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AdminPermissions, AdminService, ReviewProfileType, ReviewQueueItem } from '../../core/services/admin';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-admin-review-detail',
  imports: [RouterLink],
  template: `
    <section class="page admin-detail">
      <div class="admin-topbar">
        <a class="button-secondary back-link" routerLink="/admin">Voltar ao admin</a>
        <button class="button-secondary" type="button" (click)="logout()">Sair</button>
      </div>

      @if (errorMessage()) {
        <p class="form-message error-message" role="alert">{{ errorMessage() }}</p>
      }
      @if (message()) {
        <p class="form-message success-message" role="status">{{ message() }}</p>
      }

      @if (item()) {
        <div class="section-header">
          <p class="eyebrow">Análise de cadastro</p>
          <h1>{{ item()?.fullName }}</h1>
          <p class="lead">{{ profileTypeLabel(item()?.type) }} · {{ statusLabel(item()?.status || 'pending') }}</p>
        </div>

        <section class="card card-body action-panel">
          <div>
            <span class="badge">Estado</span>
            <h2>{{ statusLabel(item()?.status || 'pending') }}</h2>
            <p class="muted">Bloqueado por: {{ item()?.lockedBy || 'ninguém' }}</p>
          </div>
          <div class="detail-actions">
            @if (permissions().canReview && canStartReview()) {
              <button class="button" type="button" (click)="startReview()">{{ item()?.type === 'family' && item()?.status !== 'pending' ? 'Rever cadastro' : 'Iniciar análise' }}</button>
            }
            @if (permissions().canUnlockReview && item()?.status === 'analysing') {
              <button class="button-secondary" type="button" (click)="unlockReview()">Destravar</button>
            }
          </div>
        </section>

        <section class="grid grid-2">
          <article class="card card-body">
            <h2>Dados principais</h2>
            <dl class="detail-list">
              <div><dt>Nome</dt><dd>{{ mainValue('fullName') }}</dd></div>
              <div><dt>Email</dt><dd>{{ mainValue('email') }}</dd></div>
              <div><dt>Distrito</dt><dd>{{ mainValue('district') }}</dd></div>
              <div><dt>Concelho</dt><dd>{{ mainValue('county') }}</dd></div>
              <div><dt>Telefone</dt><dd>{{ mainValue('phone') }}</dd></div>
            </dl>
          </article>

          <article class="card card-body">
            <h2>Documentação</h2>
            <dl class="detail-list">
              <div><dt>Data de nascimento</dt><dd>{{ mainValue('birthDate') }}</dd></div>
              <div><dt>NIF</dt><dd>{{ privateValue('nif') }}</dd></div>
              <div><dt>Documento</dt><dd>{{ privateValue('documentType') }} · {{ privateValue('idDocument') }}</dd></div>
              <div><dt>Morada</dt><dd>{{ privateValue('address') }}</dd></div>
              <div><dt>Código Postal</dt><dd>{{ privateValue('postalCode') }}</dd></div>
              <div><dt>Sem pendência criminal</dt><dd>{{ privateValue('criminalRecordNoPending') }}</dd></div>
            </dl>
          </article>
        </section>

        <section class="card card-body document-review-section">
          <div>
            <span class="badge">Documentos</span>
            <h2>Documentos para análise</h2>
            <p class="muted">Abra a imagem em nova aba para ampliar e conferir os detalhes.</p>
          </div>
          <div class="document-review-grid">
            @for (document of reviewDocuments(); track document.kind) {
              <article class="document-card">
                <div>
                  <h3>{{ document.label }}</h3>
                  <p class="muted">{{ document.fileName }}</p>
                </div>
                @if (document.url) {
                  <a [href]="document.url" target="_blank" rel="noopener" [attr.aria-label]="'Abrir ' + document.label">
                    <img [src]="document.url" [alt]="document.label" />
                  </a>
                } @else {
                  <div class="document-missing">
                    <span>Imagem não disponível</span>
                  </div>
                }
              </article>
            }
          </div>
        </section>

        @if (item()?.type === 'caregiver') {
          <section class="card card-body">
            <h2>Perfil do cuidador</h2>
            <dl class="detail-list compact-list">
              <div><dt>Resumo</dt><dd>{{ caregiverPublicValue('summary') }}</dd></div>
              <div><dt>Experiência</dt><dd>{{ caregiverPublicValue('experienceYears') }} anos</dd></div>
              <div><dt>Serviços</dt><dd>{{ caregiverPublicValue('serviceTypes') }}</dd></div>
              <div><dt>Competências</dt><dd>{{ caregiverPublicValue('skills') }}</dd></div>
              <div><dt>Idiomas</dt><dd>{{ caregiverPublicValue('languages') }}</dd></div>
            </dl>
          </section>
        }

        @if (item()?.type === 'family') {
          <section class="card card-body">
            <h2>Cadastro da família</h2>
            <dl class="detail-list compact-list">
              <div><dt>Nome da família</dt><dd>{{ familyValue('householdName') }}</dd></div>
              <div><dt>Relação com o utente</dt><dd>{{ familyValue('relationToCareRecipient') }}</dd></div>
              <div><dt>Quantidade de utentes</dt><dd>{{ familyValue('careRecipients.count') }}</dd></div>
              <div><dt>Faixas etárias</dt><dd>{{ familyValue('careRecipients.ageGroups') }}</dd></div>
              <div><dt>Cuidados necessários</dt><dd>{{ familyValue('careNeeds.services') }}</dd></div>
              <div><dt>Rotina desejada</dt><dd>{{ familyValue('careNeeds.schedule') }}</dd></div>
              <div><dt>Tipo de acompanhamento</dt><dd>{{ familyValue('careNeeds.preferredCareType') }}</dd></div>
              <div><dt>Orçamento</dt><dd>{{ familyBudgetValue() }}</dd></div>
              <div><dt>Código postal / CEP</dt><dd>{{ familyValue('location.postalCode') }}</dd></div>
              <div><dt>Morada de referência</dt><dd>{{ familyValue('location.address') }}</dd></div>
              <div><dt>Membros indicados</dt><dd>{{ familyMembersValue() }}</dd></div>
              <div><dt>Convites por email</dt><dd>{{ familyInvitesValue() }}</dd></div>
              <div><dt>Acessibilidade</dt><dd>{{ familyValue('home.accessibility') }}</dd></div>
              <div><dt>Animais em casa</dt><dd>{{ familyValue('home.pets') }}</dd></div>
              <div><dt>Contacto de emergência</dt><dd>{{ familyEmergencyContactValue() }}</dd></div>
            </dl>
          </section>
        }

        @if (permissions().canReview && item()?.status === 'analysing') {
          <section class="card card-body decision-panel">
            <h2>Decisão</h2>
            <div class="detail-actions">
              <button class="button" type="button" (click)="approve()">Aprovar</button>
              <button class="btn btn-danger" type="button" (click)="showRejectForm()">Rejeitar</button>
            </div>
            @if (rejectFormVisible()) {
              <form class="form-grid reject-form" (submit)="reject($event)">
                <label>Justificativa da rejeição
                  <textarea name="rejectionReason" required placeholder="Explique o que precisa ser corrigido."></textarea>
                </label>
                <div class="detail-actions">
                  <button class="btn btn-danger" type="submit">Confirmar rejeição</button>
                  <button class="btn btn-secondary" type="button" (click)="hideRejectForm()">Cancelar</button>
                </div>
              </form>
            }
          </section>
        }
      } @else if (!errorMessage()) {
        <section class="card card-body">
          <h2>Cadastro não encontrado</h2>
          <p class="muted">Volte para a fila e escolha um cadastro disponível.</p>
        </section>
      }
    </section>
  `,
  styles: `
    .admin-detail {
      display: grid;
      gap: 22px;
    }

    .back-link {
      width: fit-content;
    }

    .admin-topbar {
      display: flex;
      gap: 14px;
      align-items: center;
      justify-content: space-between;
    }

    .action-panel {
      display: flex;
      gap: 18px;
      align-items: center;
      justify-content: space-between;
    }

    .detail-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .detail-list {
      display: grid;
      gap: 12px;
      margin: 0;
    }

    .detail-list div {
      display: grid;
      gap: 4px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--color-border);
    }

    .compact-list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .document-review-section {
      display: grid;
      gap: 18px;
    }

    .document-review-section h2 {
      margin: 10px 0 6px;
    }

    .document-review-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .document-card {
      display: grid;
      gap: 12px;
      min-width: 0;
      padding: 14px;
      border: 1px solid var(--color-border);
      border-radius: 14px;
      background: #fff;
    }

    .document-card h3,
    .document-card p {
      margin: 0;
    }

    .document-card a,
    .document-missing {
      display: grid;
      min-height: 230px;
      overflow: hidden;
      place-items: center;
      border: 1px solid var(--color-border);
      border-radius: 12px;
      background: #f8fbf6;
    }

    .document-card img {
      width: 100%;
      height: 100%;
      max-height: 360px;
      object-fit: contain;
      background: #fff;
    }

    .document-missing {
      color: var(--color-muted);
      font-weight: 800;
      text-align: center;
    }

    dt {
      color: var(--color-muted);
      font-weight: 850;
    }

    dd {
      margin: 0;
      color: var(--color-ink);
      line-height: 1.55;
      overflow-wrap: anywhere;
    }

    .decision-panel {
      display: grid;
      gap: 16px;
    }

    .reject-form {
      padding-top: 14px;
      border-top: 1px solid var(--color-border);
    }

    @media (max-width: 760px) {
      .action-panel {
        align-items: flex-start;
        flex-direction: column;
      }

      .compact-list {
        grid-template-columns: 1fr;
      }

      .document-review-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class AdminReviewDetailComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly auth = inject(Auth);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly item = signal<ReviewQueueItem | null>(null);
  protected readonly permissions = signal<AdminPermissions>({
    canAccessAdmin: false,
    canManageAdmins: false,
    canReview: false,
    canUnlockReview: false,
  });
  protected readonly message = signal('');
  protected readonly errorMessage = signal('');
  protected readonly rejectFormVisible = signal(false);

  async ngOnInit(): Promise<void> {
    const profile = await this.admin.getCurrentAdminProfile();
    this.permissions.set(this.admin.getPermissions(profile));
    await this.loadItem();
  }

  protected async startReview(): Promise<void> {
    await this.runAction(async () => {
      await this.admin.startReview(this.reviewType(), this.reviewId());
      this.message.set('Análise iniciada.');
    });
  }

  protected async unlockReview(): Promise<void> {
    await this.runAction(async () => {
      await this.admin.unlockReview(this.reviewType(), this.reviewId());
      this.message.set('Análise destravada.');
    });
  }

  protected canStartReview(): boolean {
    const item = this.item();
    if (!item) {
      return false;
    }
    return item.type === 'family' ? item.status !== 'analysing' : item.status === 'pending';
  }

  protected async logout(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/admin/login');
  }

  protected async approve(): Promise<void> {
    this.rejectFormVisible.set(false);
    await this.runAction(async () => {
      await this.admin.decideReview(this.reviewType(), this.reviewId(), 'approved');
      this.message.set('Cadastro aprovado.');
      await this.router.navigateByUrl('/admin');
    });
  }

  protected showRejectForm(): void {
    this.message.set('');
    this.errorMessage.set('');
    this.rejectFormVisible.set(true);
  }

  protected hideRejectForm(): void {
    this.rejectFormVisible.set(false);
  }

  protected async reject(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    if (!form.reportValidity()) {
      return;
    }

    const formData = new FormData(form);
    await this.runAction(async () => {
      await this.admin.decideReview(this.reviewType(), this.reviewId(), 'rejected', this.textValue(formData, 'rejectionReason'));
      this.message.set('Cadastro rejeitado.');
      await this.router.navigateByUrl('/admin');
    });
  }

  protected profileTypeLabel(type?: string): string {
    return type === 'family' ? 'Família' : 'Cuidador';
  }

  protected mainValue(key: string): string {
    if (this.item()?.type === 'caregiver') {
      const publicProfileValue = this.valueAt(`publicProfile.${key}`);
      if (publicProfileValue !== 'Não informado') {
        return publicProfileValue;
      }

      const privateValue = this.valueAt(`private.${key}`);
      if (privateValue !== 'Não informado') {
        return privateValue;
      }

      const accountValue = this.valueAt(`account.${key}`);
      if (accountValue !== 'Não informado') {
        return accountValue;
      }

      return this.valueAt(key);
    }

    if (key === 'district' || key === 'county') {
      return this.valueAt(`location.${key}`);
    }

    return this.valueAt(key);
  }

  protected privateValue(key: string): string {
    if (this.item()?.type === 'family') {
      return this.valueAt(`private.${key}`);
    }

    return this.valueAt(`private.${key}`);
  }

  protected documentFileName(kind: string): string {
    return this.valueAt(`private.documents.${kind}.fileName`);
  }

  protected documentUrl(kind: string): string | null {
    const value = this.rawValueAt(`private.documents.${kind}.downloadUrl`);
    return typeof value === 'string' && value.trim() ? value : null;
  }

  protected reviewDocuments(): Array<{ kind: string; label: string; fileName: string; url: string | null }> {
    const documents = [
      { kind: 'identityFront', label: 'Frente do documento' },
      { kind: 'identityBack', label: 'Verso do documento' },
      { kind: 'addressProof', label: 'Comprovativo de morada' },
      { kind: 'criminalRecordCertificate', label: 'Atestado de criminalidade' },
    ];

    return documents
      .filter((document) => document.kind !== 'identityBack' || privateDocumentType(this.item()?.raw) !== 'Passaporte')
      .map((document) => ({
        ...document,
        fileName: this.documentFileName(document.kind),
        url: this.documentUrl(document.kind),
      }));

    function privateDocumentType(raw: Record<string, unknown> | undefined): string {
      const privateData = raw?.['private'];
      if (!privateData || typeof privateData !== 'object') {
        return '';
      }

      const value = (privateData as Record<string, unknown>)['documentType'];
      return typeof value === 'string' ? value : '';
    }
  }

  protected caregiverPublicValue(key: string): string {
    return this.valueAt(`publicProfile.${key}`);
  }

  protected familyValue(path: string): string {
    return this.valueAt(`familyProfile.${path}`);
  }

  protected familyBudgetValue(): string {
    const amount = this.familyValue('budget.amount');
    const period = this.familyValue('budget.period');
    if (amount === 'Não informado' && period === 'Não informado') {
      return 'Não informado';
    }

    return `${amount} € · ${period}`;
  }

  protected familyMembersValue(): string {
    const members = this.rawValueAt('familyProfile.members');
    if (!Array.isArray(members) || members.length === 0) {
      return 'Não informado';
    }

    return members
      .map((member) => {
        if (!member || typeof member !== 'object') {
          return '';
        }

        const data = member as Record<string, unknown>;
        return [data['name'], data['relation'], data['email']]
          .filter((value): value is string => typeof value === 'string' && !!value.trim())
          .join(' · ');
      })
      .filter(Boolean)
      .join('; ') || 'Não informado';
  }

  protected familyInvitesValue(): string {
    const members = this.rawValueAt('familyProfile.members');
    if (!Array.isArray(members)) {
      return 'Não informado';
    }

    const invites = members
      .filter((member): member is Record<string, unknown> => !!member && typeof member === 'object')
      .filter((member) => member['invite'] === true)
      .map((member) => member['email'])
      .filter((email): email is string => typeof email === 'string' && !!email.trim());

    return invites.length ? invites.join(', ') : 'Nenhum convite solicitado';
  }

  protected familyEmergencyContactValue(): string {
    const values = [
      this.familyValue('emergencyContact.name'),
      this.familyValue('emergencyContact.relation'),
      this.familyValue('emergencyContact.phone'),
    ].filter((value) => value !== 'Não informado');

    return values.length ? values.join(' · ') : 'Não informado';
  }

  protected statusLabel(status: string): string {
    switch (status) {
      case 'analysing':
        return 'Em análise';
      case 'approved':
        return 'Aprovado';
      case 'rejected':
        return 'Rejeitado';
      default:
        return 'Pendente';
    }
  }

  private async loadItem(): Promise<void> {
    this.errorMessage.set('');
    try {
      this.item.set(await this.admin.getReviewItem(this.reviewType(), this.reviewId()));
    } catch (error) {
      this.errorMessage.set(this.auth.getFirebaseErrorMessage(error, 'admin'));
    }
  }

  private async runAction(action: () => Promise<void>): Promise<void> {
    this.errorMessage.set('');
    this.message.set('');
    try {
      await action();
      await this.loadItem();
    } catch (error) {
      this.errorMessage.set(this.auth.getFirebaseErrorMessage(error, 'admin'));
    }
  }

  private reviewType(): ReviewProfileType {
    return this.route.snapshot.paramMap.get('type') === 'family' ? 'family' : 'caregiver';
  }

  private reviewId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  private valueAt(path: string): string {
    const value = this.rawValueAt(path);

    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'number') {
      return String(value);
    }
    if (typeof value === 'boolean') {
      return value ? 'Sim' : 'Não';
    }

    return typeof value === 'string' && value.trim() ? value : 'Não informado';
  }

  private rawValueAt(path: string): unknown {
    const value = path.split('.').reduce<unknown>((current, key) => {
      if (!current || typeof current !== 'object') {
        return undefined;
      }

      return (current as Record<string, unknown>)[key];
    }, this.item()?.raw);

    return value;
  }

  private textValue(formData: FormData, key: string): string {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : '';
  }
}
