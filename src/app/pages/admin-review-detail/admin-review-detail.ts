import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AdminPermissions, AdminService, ReviewQueueItem } from '../../core/services/admin';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-admin-review-detail',
  imports: [RouterLink],
  template: `
    <section class="page admin-detail">
      <a class="button-secondary back-link" routerLink="/admin">Voltar ao admin</a>

      @if (errorMessage()) {
        <p class="form-message error-message" role="alert">{{ errorMessage() }}</p>
      }
      @if (message()) {
        <p class="form-message success-message">{{ message() }}</p>
      }

      @if (item()) {
        <div class="section-header">
          <p class="eyebrow">Análise de cadastro</p>
          <h1>{{ item()?.fullName }}</h1>
          <p class="lead">{{ item()?.type === 'caregiver' ? 'Cuidador' : 'Família' }} · {{ statusLabel(item()?.status || 'pending') }}</p>
        </div>

        <section class="card card-body action-panel">
          <div>
            <span class="badge">Estado</span>
            <h2>{{ statusLabel(item()?.status || 'pending') }}</h2>
            <p class="muted">Bloqueado por: {{ item()?.lockedBy || 'ninguém' }}</p>
          </div>
          <div class="actions">
            @if (permissions().canReview && item()?.status === 'pending') {
              <button class="button" type="button" (click)="startReview()">Iniciar análise</button>
            }
            @if (permissions().canUnlockReview && item()?.status === 'analysing') {
              <button class="button-secondary" type="button" (click)="unlockReview()">Destravar</button>
            }
          </div>
        </section>

        <section class="grid grid-2">
          <article class="card card-body">
            <h2>Perfil público</h2>
            <dl class="detail-list">
              <div><dt>Nome</dt><dd>{{ publicValue('fullName') }}</dd></div>
              <div><dt>Distrito</dt><dd>{{ publicValue('district') }}</dd></div>
              <div><dt>Concelho</dt><dd>{{ publicValue('county') }}</dd></div>
              <div><dt>Resumo</dt><dd>{{ publicValue('summary') }}</dd></div>
              <div><dt>Experiência</dt><dd>{{ publicValue('experienceYears') }} anos</dd></div>
            </dl>
          </article>

          <article class="card card-body">
            <h2>Dados privados</h2>
            <dl class="detail-list">
              <div><dt>Data de nascimento</dt><dd>{{ privateValue('birthDate') }}</dd></div>
              <div><dt>Telemóvel</dt><dd>{{ privateValue('phone') }}</dd></div>
              <div><dt>NIF</dt><dd>{{ privateValue('nif') }}</dd></div>
              <div><dt>Documento</dt><dd>{{ privateValue('documentType') }} · {{ privateValue('idDocument') }}</dd></div>
              <div><dt>Código Postal</dt><dd>{{ privateValue('postalCode') }}</dd></div>
            </dl>
          </article>
        </section>

        @if (permissions().canReview && item()?.status === 'analysing') {
          <section class="card card-body decision-panel">
            <h2>Decisão</h2>
            <div class="actions">
              <button class="button" type="button" (click)="approve()">Aprovar</button>
            </div>
            <form class="form-grid" (submit)="reject($event)">
              <label>Justificativa da rejeição
                <textarea name="rejectionReason" required placeholder="Explique o que precisa ser corrigido."></textarea>
              </label>
              <button class="button-secondary" type="submit">Rejeitar cadastro</button>
            </form>
          </section>
        }
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

    .action-panel {
      display: flex;
      gap: 18px;
      align-items: center;
      justify-content: space-between;
    }

    .actions {
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

    dt {
      color: var(--color-muted);
      font-weight: 850;
    }

    dd {
      margin: 0;
      color: var(--color-ink);
      line-height: 1.55;
    }

    .decision-panel {
      display: grid;
      gap: 16px;
    }

    @media (max-width: 760px) {
      .action-panel {
        align-items: flex-start;
        flex-direction: column;
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

  async ngOnInit(): Promise<void> {
    const profile = await this.admin.getCurrentAdminProfile();
    this.permissions.set(this.admin.getPermissions(profile));
    await this.loadItem();
  }

  protected async startReview(): Promise<void> {
    await this.runAction(async () => {
      await this.admin.startCaregiverReview(this.reviewId());
      this.message.set('Análise iniciada.');
    });
  }

  protected async unlockReview(): Promise<void> {
    await this.runAction(async () => {
      await this.admin.unlockCaregiverReview(this.reviewId());
      this.message.set('Análise destravada.');
    });
  }

  protected async approve(): Promise<void> {
    await this.runAction(async () => {
      await this.admin.decideCaregiverReview(this.reviewId(), 'approved');
      this.message.set('Cadastro aprovado.');
      await this.router.navigateByUrl('/admin');
    });
  }

  protected async reject(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    if (!form.reportValidity()) {
      return;
    }

    const formData = new FormData(form);
    await this.runAction(async () => {
      await this.admin.decideCaregiverReview(this.reviewId(), 'rejected', this.textValue(formData, 'rejectionReason'));
      this.message.set('Cadastro rejeitado.');
      await this.router.navigateByUrl('/admin');
    });
  }

  protected publicValue(key: string): string {
    return this.valueAt(`publicProfile.${key}`);
  }

  protected privateValue(key: string): string {
    return this.valueAt(`private.${key}`);
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
      this.item.set(await this.admin.getReviewItem(this.reviewId()));
    } catch (error) {
      this.errorMessage.set(this.auth.getFirebaseErrorMessage(error));
    }
  }

  private async runAction(action: () => Promise<void>): Promise<void> {
    this.errorMessage.set('');
    this.message.set('');
    try {
      await action();
      await this.loadItem();
    } catch (error) {
      this.errorMessage.set(this.auth.getFirebaseErrorMessage(error));
    }
  }

  private reviewId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  private valueAt(path: string): string {
    const value = path.split('.').reduce<unknown>((current, key) => {
      if (!current || typeof current !== 'object') {
        return undefined;
      }

      return (current as Record<string, unknown>)[key];
    }, this.item()?.raw);

    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'number') {
      return String(value);
    }

    return typeof value === 'string' ? value : 'Não informado';
  }

  private textValue(formData: FormData, key: string): string {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : '';
  }
}
