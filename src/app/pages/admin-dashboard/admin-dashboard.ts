import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AdminPermissions, AdminProfile, AdminService, ReviewQueueItem } from '../../core/services/admin';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink],
  template: `
    <section class="page admin-page">
      <div class="admin-topbar">
        <span class="badge">Painel administrativo</span>
        <button class="button-secondary" type="button" (click)="logout()">Sair</button>
      </div>

      <div class="section-header">
        <p class="eyebrow">Administração</p>
        <h1>Revisões e permissões.</h1>
        <p class="lead">Área restrita para validação de cadastros e gestão dos perfis administrativos da wecareparents.</p>
      </div>

      @if (message()) {
        <p class="form-message success-message" role="status">{{ message() }}</p>
      }
      @if (errorMessage()) {
        <p class="form-message error-message" role="alert">{{ errorMessage() }}</p>
      }

      <div class="grid grid-3">
        <article class="card card-body">
          <span class="badge">Perfil</span>
          <h3>{{ roleLabel(currentAdmin()?.role) }}</h3>
          <p class="muted">{{ currentAdmin()?.email || 'Sessão administrativa' }}</p>
        </article>
        <article class="card card-body">
          <span class="badge">Fila</span>
          <h3>{{ reviewQueue().length }}</h3>
          <p class="muted">cadastros pendentes ou em análise</p>
        </article>
        <article class="card card-body">
          <span class="badge">Permissões</span>
          <h3>{{ permissions().canReview ? 'Revisão ativa' : 'Gestão administrativa' }}</h3>
          <p class="muted">{{ permissions().canManageAdmins ? 'Pode gerir perfis administrativos' : 'Sem gestão de administradores' }}</p>
        </article>
      </div>

      <section class="card card-body admin-section">
        <div class="section-line">
          <div>
            <span class="badge">Revisão</span>
            <h2>Fila de cadastros</h2>
          </div>
          <button class="button-secondary" type="button" (click)="loadData()">Atualizar</button>
        </div>

        <div class="table-like admin-table">
          @for (item of reviewQueue(); track item.type + item.id) {
            <article>
              <strong>{{ item.fullName }}</strong>
              <span class="muted">{{ profileTypeLabel(item.type) }} · {{ item.district }} · {{ statusLabel(item.status) }}</span>
              <a class="badge" [routerLink]="['/admin/revisoes', item.type, item.id]">Abrir</a>
            </article>
          } @empty {
            <article>
              <strong>Sem cadastros na fila</strong>
              <span class="muted">Novos pedidos aparecerão aqui quando forem submetidos.</span>
              <span class="badge">0</span>
            </article>
          }
        </div>
      </section>

      @if (permissions().canManageAdmins) {
        <section class="card card-body admin-section">
          <div class="section-line">
            <div>
              <span class="badge">Acessos</span>
              <h2>Gestão de administradores</h2>
            </div>
          </div>

          <form class="form-grid admin-form" (submit)="saveAdmin($event)">
            <label>UID do utilizador<input name="uid" required placeholder="UID Firebase Auth" /></label>
            <label>Email<input name="email" type="email" required placeholder="admin@exemplo.pt" /></label>
            <label>Nome<input name="displayName" placeholder="Nome interno" /></label>
            <label>Perfil
              <select name="role" required>
                @if (currentAdmin()?.role === 'super_user') {
                  <option value="super_user">Super utilizador</option>
                }
                <option value="admin">Administrador</option>
                <option value="reviewer">Revisor</option>
              </select>
            </label>
            <label class="check-line"><input name="enabled" type="checkbox" checked /> Ativo</label>
            <button class="button" type="submit">Guardar perfil</button>
          </form>

          <div class="table-like admin-table">
            @for (adminProfile of adminProfiles(); track adminProfile.uid) {
              <article>
                <strong>{{ adminProfile.displayName || adminProfile.email || adminProfile.uid }}</strong>
                <span class="muted">{{ roleLabel(adminProfile.role) }} · {{ adminProfile.enabled ? 'ativo' : 'inativo' }}</span>
                <span class="badge">{{ adminProfile.uid }}</span>
              </article>
            } @empty {
              <article>
                <strong>Sem perfis listados</strong>
                <span class="muted">Crie perfis por UID para conceder acesso ao admin.</span>
                <span class="badge">Admin</span>
              </article>
            }
          </div>
        </section>
      }
    </section>
  `,
  styles: `
    .admin-page {
      display: grid;
      gap: 22px;
    }

    .admin-section {
      display: grid;
      gap: 18px;
    }

    .admin-topbar {
      display: flex;
      gap: 14px;
      align-items: center;
      justify-content: space-between;
    }

    .section-line {
      display: flex;
      gap: 18px;
      align-items: center;
      justify-content: space-between;
    }

    .section-line h2 {
      margin: 10px 0 0;
    }

    .admin-form {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      align-items: end;
    }

    .check-line {
      display: flex;
      gap: 10px;
      align-items: center;
      min-height: 48px;
    }

    .check-line input {
      width: auto;
    }

    .admin-table strong,
    .admin-table .muted {
      min-width: 0;
      overflow-wrap: anywhere;
    }

    @media (max-width: 800px) {
      .admin-form {
        grid-template-columns: 1fr;
      }

      .section-line {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `,
})
export class AdminDashboardComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly currentAdmin = signal<AdminProfile | null>(null);
  protected readonly permissions = signal<AdminPermissions>({
    canAccessAdmin: false,
    canManageAdmins: false,
    canReview: false,
    canUnlockReview: false,
  });
  protected readonly reviewQueue = signal<ReviewQueueItem[]>([]);
  protected readonly adminProfiles = signal<AdminProfile[]>([]);
  protected readonly message = signal('');
  protected readonly errorMessage = signal('');

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  protected async loadData(): Promise<void> {
    this.errorMessage.set('');
    try {
      const profile = await this.admin.getCurrentAdminProfile();
      this.currentAdmin.set(profile);
      this.permissions.set(this.admin.getPermissions(profile));
      this.reviewQueue.set(await this.admin.listReviewQueue());
      if (this.permissions().canManageAdmins) {
        this.adminProfiles.set(await this.admin.listAdminProfiles());
      }
    } catch (error) {
      this.errorMessage.set(this.auth.getFirebaseErrorMessage(error));
    }
  }

  protected async logout(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/admin/login');
  }

  protected async saveAdmin(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.message.set('');
    this.errorMessage.set('');

    const form = event.currentTarget as HTMLFormElement;
    if (!form.reportValidity()) {
      return;
    }

    const formData = new FormData(form);
    try {
      await this.admin.saveAdminProfile({
        uid: this.textValue(formData, 'uid'),
        email: this.textValue(formData, 'email'),
        displayName: this.textValue(formData, 'displayName'),
        role: this.textValue(formData, 'role') as AdminProfile['role'],
        enabled: formData.has('enabled'),
      });
      form.reset();
      this.message.set('Perfil administrativo guardado.');
      await this.loadData();
    } catch (error) {
      this.errorMessage.set(this.auth.getFirebaseErrorMessage(error));
    }
  }

  protected profileTypeLabel(type?: string): string {
    return type === 'family' ? 'Família' : 'Cuidador';
  }

  protected roleLabel(role?: string): string {
    switch (role) {
      case 'super_user':
        return 'Super utilizador';
      case 'admin':
        return 'Administrador';
      case 'reviewer':
        return 'Revisor';
      default:
        return 'A verificar';
    }
  }

  protected statusLabel(status: string): string {
    switch (status) {
      case 'analysing':
        return 'em análise';
      case 'approved':
        return 'aprovado';
      case 'rejected':
        return 'rejeitado';
      default:
        return 'pendente';
    }
  }

  private textValue(formData: FormData, key: string): string {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : '';
  }
}
