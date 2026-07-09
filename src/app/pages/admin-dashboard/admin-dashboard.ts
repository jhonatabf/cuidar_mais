import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AdminPermissions, AdminProfile, AdminService, ReviewQueueItem } from '../../core/services/admin';
import { Auth } from '../../core/services/auth';

type AdminSection = 'overview' | 'reviews' | 'admins' | 'future';

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

      <div class="admin-layout">
        <aside class="admin-menu" aria-label="Menu administrativo">
          @for (item of menuItems(); track item.id) {
            <button
              type="button"
              [class.is-active]="activeSection() === item.id"
              [disabled]="item.disabled"
              (click)="selectSection(item.id)"
            >
              <span class="material-symbols-rounded" aria-hidden="true">{{ item.icon }}</span>
              <span>
                <strong>{{ item.label }}</strong>
                <small>{{ item.description }}</small>
              </span>
            </button>
          }
        </aside>

        <div class="admin-content">
          @if (activeSection() === 'overview') {
            <section class="admin-section">
              <div class="grid grid-3">
                <article class="card card-body">
                  <span class="badge">Perfil</span>
                  <h3>{{ roleLabel(currentAdmin()?.role) }}</h3>
                  <p class="muted">{{ currentAdmin()?.email || 'Sessão administrativa' }}</p>
                </article>
                <article class="card card-body">
                  <span class="badge">Cadastros</span>
                  <h3>{{ reviewQueue().length }}</h3>
                  <p class="muted">cadastros disponíveis para revisão</p>
                </article>
                <article class="card card-body">
                  <span class="badge">Permissões</span>
                  <h3>{{ permissions().canReview ? 'Revisão ativa' : 'Gestão administrativa' }}</h3>
                  <p class="muted">{{ permissions().canManageAdmins ? 'Pode gerir perfis administrativos' : 'Sem gestão de administradores' }}</p>
                </article>
              </div>
            </section>
          }

          @if (activeSection() === 'reviews') {
            <section class="card card-body admin-section">
              <div class="section-line">
                <div>
                  <span class="badge">Revisão</span>
                  <h2>Cadastros de usuários</h2>
                </div>
                <button class="button-secondary" type="button" (click)="loadData()">Atualizar</button>
              </div>

              <div class="admin-filter-line">
                <button type="button" [class.is-active]="reviewFilter() === 'all'" (click)="reviewFilter.set('all')">Todos</button>
                <button type="button" [class.is-active]="reviewFilter() === 'pending'" (click)="reviewFilter.set('pending')">Pendentes</button>
                <button type="button" [class.is-active]="reviewFilter() === 'analysing'" (click)="reviewFilter.set('analysing')">Em análise</button>
                <button type="button" [class.is-active]="reviewFilter() === 'approved'" (click)="reviewFilter.set('approved')">Aprovados</button>
                <button type="button" [class.is-active]="reviewFilter() === 'rejected'" (click)="reviewFilter.set('rejected')">Rejeitados</button>
              </div>

              <div class="table-like admin-table">
                @for (item of filteredReviewQueue(); track item.type + item.id) {
                  <article>
                    <strong>{{ item.fullName }}</strong>
                    <span class="muted">{{ profileTypeLabel(item.type) }} · {{ item.district }} · {{ statusLabel(item.status) }}</span>
                    <a class="badge" [routerLink]="['/admin/revisoes', item.type, item.id]">Abrir</a>
                  </article>
                } @empty {
                  <article>
                    <strong>Sem cadastros para este filtro</strong>
                    <span class="muted">Novos pedidos aparecerão aqui quando forem submetidos.</span>
                    <span class="badge">0</span>
                  </article>
                }
              </div>
            </section>
          }

          @if (activeSection() === 'admins' && permissions().canManageAdmins) {
            <section class="card card-body admin-section">
              <div class="section-line">
                <div>
                  <span class="badge">Acessos</span>
                  <h2>Gestão de administradores</h2>
                </div>
              </div>

              <form class="form-grid admin-form" (submit)="saveAdmin($event)">
                <label>UID do utilizador<input name="uid" required placeholder="UID Firebase Auth" [readOnly]="!!editingAdmin()" [value]="editingAdmin()?.uid ?? ''" /></label>
                <label>Email<input name="email" type="email" required placeholder="admin@exemplo.pt" [value]="editingAdmin()?.email ?? ''" /></label>
                <label>Nome<input name="displayName" placeholder="Nome interno" [value]="editingAdmin()?.displayName ?? ''" /></label>
                <label>Perfil
                  <select name="role" required [value]="editingAdmin()?.role ?? 'reviewer'">
                    @if (currentAdmin()?.role === 'super_user') {
                      <option value="super_user">Super utilizador</option>
                    }
                    <option value="admin">Administrador</option>
                    <option value="reviewer">Revisor</option>
                  </select>
                </label>
                <label class="check-line"><input name="enabled" type="checkbox" [checked]="editingAdmin()?.enabled ?? true" /> Ativo</label>
                <button class="button" type="submit">{{ editingAdmin() ? 'Atualizar perfil' : 'Guardar perfil' }}</button>
                @if (editingAdmin()) {
                  <button class="button-secondary" type="button" (click)="cancelAdminEdit()">Cancelar edição</button>
                }
              </form>

              <div class="table-like admin-table">
                @for (adminProfile of adminProfiles(); track adminProfile.uid) {
                  <article>
                    <strong>{{ adminProfile.displayName || adminProfile.email || adminProfile.uid }}</strong>
                    <span class="muted">{{ roleLabel(adminProfile.role) }} · {{ adminProfile.enabled ? 'ativo' : 'inativo' }}</span>
                    <button class="badge admin-inline-action" type="button" (click)="editAdminProfile(adminProfile)">Editar</button>
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

          @if (activeSection() === 'future') {
            <section class="card card-body admin-section">
              <div class="section-line">
                <div>
                  <span class="badge">Em breve</span>
                  <h2>Novas funcionalidades</h2>
                </div>
              </div>
              <p class="muted">Este menu já está preparado para receber novas áreas administrativas sem misturar funcionalidades na mesma tela.</p>
            </section>
          }

          @if (activeSection() === 'admins' && !permissions().canManageAdmins) {
            <section class="card card-body admin-section">
              <span class="badge">Sem permissão</span>
              <h2>Gestão de administradores indisponível</h2>
              <p class="muted">Apenas administradores com permissão de gestão podem criar ou editar perfis administrativos.</p>
            </section>
          }
        </div>
      </div>
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

    .admin-layout {
      display: grid;
      grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
      gap: 22px;
      align-items: start;
    }

    .admin-menu {
      position: sticky;
      top: 18px;
      display: grid;
      gap: 10px;
      padding: 14px;
      border: 1px solid rgba(220, 233, 216, 0.82);
      border-radius: 18px;
      background: #fff;
      box-shadow: var(--shadow-card);
    }

    .admin-menu button {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      width: 100%;
      padding: 12px;
      border: 1px solid transparent;
      border-radius: 12px;
      background: transparent;
      color: var(--color-ink);
      text-align: left;
      cursor: pointer;
    }

    .admin-menu button:hover,
    .admin-menu button:focus-visible,
    .admin-menu button.is-active {
      border-color: rgba(21, 128, 61, 0.22);
      background: var(--color-primary-soft);
    }

    .admin-menu button:disabled {
      opacity: 0.58;
      cursor: not-allowed;
    }

    .admin-menu .material-symbols-rounded {
      color: var(--color-primary);
      font-size: 24px;
    }

    .admin-menu strong,
    .admin-menu small {
      display: block;
    }

    .admin-menu small {
      margin-top: 3px;
      color: var(--color-muted);
      font-weight: 700;
      line-height: 1.35;
    }

    .admin-content {
      min-width: 0;
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

    .admin-form input[readonly] {
      border-color: rgba(203, 213, 225, 0.9);
      background: #f8fafc;
      color: var(--color-disabled-text);
      cursor: not-allowed;
    }

    .admin-filter-line {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .admin-filter-line button {
      min-height: 36px;
      padding: 0 12px;
      border: 1px solid var(--color-border);
      border-radius: 999px;
      background: #fff;
      color: var(--color-ink);
      font: inherit;
      font-weight: 850;
      cursor: pointer;
    }

    .admin-filter-line button.is-active {
      border-color: var(--color-primary);
      background: var(--color-primary);
      color: #fff;
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

    .admin-inline-action {
      border: 0;
      font: inherit;
      cursor: pointer;
    }

    @media (max-width: 800px) {
      .admin-layout {
        grid-template-columns: 1fr;
      }

      .admin-menu {
        position: static;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .admin-form {
        grid-template-columns: 1fr;
      }

      .section-line {
        align-items: flex-start;
        flex-direction: column;
      }
    }

    @media (max-width: 560px) {
      .admin-menu {
        grid-template-columns: 1fr;
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
  protected readonly editingAdmin = signal<AdminProfile | null>(null);
  protected readonly message = signal('');
  protected readonly errorMessage = signal('');
  protected readonly activeSection = signal<AdminSection>('overview');
  protected readonly reviewFilter = signal<'all' | ReviewQueueItem['status']>('all');
  protected readonly menuItems = computed(() => [
    {
      id: 'overview' as const,
      icon: 'dashboard',
      label: 'Visão geral',
      description: 'Resumo do painel',
      disabled: false,
    },
    {
      id: 'reviews' as const,
      icon: 'fact_check',
      label: 'Cadastros',
      description: 'Aprovar, reprovar ou rever usuários',
      disabled: false,
    },
    {
      id: 'admins' as const,
      icon: 'admin_panel_settings',
      label: 'Administradores',
      description: 'Criar ou editar acessos admin',
      disabled: !this.permissions().canManageAdmins,
    },
    {
      id: 'future' as const,
      icon: 'add_circle',
      label: 'Novas áreas',
      description: 'Espaço para futuras funcionalidades',
      disabled: false,
    },
  ]);
  protected readonly filteredReviewQueue = computed(() => {
    const filter = this.reviewFilter();
    if (filter === 'all') {
      return this.reviewQueue();
    }

    return this.reviewQueue().filter((item) => item.status === filter);
  });

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
      this.errorMessage.set(this.auth.getFirebaseErrorMessage(error, 'admin'));
    }
  }

  protected async logout(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/admin/login');
  }

  protected selectSection(section: AdminSection): void {
    if (section === 'admins' && !this.permissions().canManageAdmins) {
      return;
    }

    this.activeSection.set(section);
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
      this.editingAdmin.set(null);
      this.message.set('Perfil administrativo guardado.');
      await this.loadData();
    } catch (error) {
      this.errorMessage.set(this.auth.getFirebaseErrorMessage(error, 'admin'));
    }
  }

  protected editAdminProfile(profile: AdminProfile): void {
    this.message.set('');
    this.errorMessage.set('');
    this.editingAdmin.set(profile);
    this.activeSection.set('admins');
  }

  protected cancelAdminEdit(): void {
    this.editingAdmin.set(null);
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
