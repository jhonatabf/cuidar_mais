import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideCalendarDays,
  LucideCircleCheckBig,
  LucideCircleX,
  LucideClipboardList,
  LucideClock3,
  LucideFilePenLine,
  LucideInbox,
  LucideLockKeyhole,
  LucideMessageCircle,
  LucideSearch,
  LucideSquarePen,
  LucideUserRound,
  LucideUserRoundPlus,
  LucideWalletCards,
} from '@lucide/angular';

import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-caregiver-dashboard',
  imports: [
    RouterLink,
    LucideCalendarDays,
    LucideCircleCheckBig,
    LucideCircleX,
    LucideClipboardList,
    LucideClock3,
    LucideFilePenLine,
    LucideInbox,
    LucideLockKeyhole,
    LucideMessageCircle,
    LucideSearch,
    LucideSquarePen,
    LucideUserRound,
    LucideUserRoundPlus,
    LucideWalletCards,
  ],
  template: `
    <section class="page">
      <div class="section-header">
        <p class="eyebrow">Dashboard cuidador</p>
        <h1>Agenda, pedidos e perfil profissional.</h1>
        <p class="lead">Um painel simples para gerir disponibilidade e trabalho aceito.</p>
      </div>

      <article
        class="registration-status"
        [class.status-incomplete]="statusTone() === 'incomplete'"
        [class.status-pending]="statusTone() === 'pending'"
        [class.status-analysing]="statusTone() === 'analysing'"
        [class.status-rejected]="statusTone() === 'rejected'"
        [class.status-approved]="statusTone() === 'approved'"
      >
        <div class="status-heading">
          <span class="status-icon">
            @switch (statusTone()) {
              @case ('approved') { <svg lucideCircleCheckBig size="28"></svg> }
              @case ('rejected') { <svg lucideCircleX size="28"></svg> }
              @case ('analysing') { <svg lucideSearch size="28"></svg> }
              @case ('pending') { <svg lucideClock3 size="28"></svg> }
              @default { <svg lucideFilePenLine size="28"></svg> }
            }
          </span>
          <div>
            <p>Estado do cadastro</p>
            <h2>{{ approvalStatusLabel() }}</h2>
          </div>
        </div>
        <p class="status-description">{{ approvalMessage() }}</p>
      </article>

      <div class="dashboard-shell">
        <aside class="card sidebar">
          <a href="#"><svg lucideCalendarDays size="20"></svg><span>Agenda</span></a>
          <a href="#"><svg lucideClipboardList size="20"></svg><span>Pedidos</span></a>
          <a href="#"><svg lucideUserRound size="20"></svg><span>Perfil</span></a>
          <a href="#"><svg lucideWalletCards size="20"></svg><span>Pagamentos</span></a>
        </aside>
        <div class="grid">
          @if (showCompleteCaregiverProfile()) {
            <article class="card card-body dashboard-alert">
              <span class="feature-icon"><svg lucideUserRoundPlus size="26"></svg></span>
              <div>
                <span class="badge">Cadastro pendente</span>
                <h3>Conclua o seu perfil de cuidador</h3>
                <p class="muted">
                  Ainda não encontramos um cadastro de cuidador vinculado a esta conta.
                  Complete os dados para criar o perfil profissional.
                </p>
              </div>
              <a class="button action-link" routerLink="/seja-cuidador"><svg lucideFilePenLine size="18"></svg>Concluir cadastro</a>
            </article>
          } @else {
            <article class="card card-body dashboard-alert">
              <span class="feature-icon"><svg lucideUserRound size="26"></svg></span>
              <div>
                <span class="badge">Perfil de cuidador</span>
                <h3>Dados do cuidador cadastrados</h3>
                <p class="muted">
                  Consulte ou atualize os dados profissionais apresentados às famílias.
                </p>
              </div>
              @if (canEditProfile()) {
                <a class="button action-link" routerLink="/seja-cuidador"><svg lucideSquarePen size="18"></svg>Editar dados</a>
              } @else {
                <button class="btn btn-disabled action-link" type="button" disabled><svg lucideLockKeyhole size="18"></svg>Alteração bloqueada</button>
              }
            </article>
          }

          <div class="grid dashboard-summary">
            <article
              class="card card-body summary-card request-card"
              [class.summary-empty]="requestUrgency() === 'empty'"
              [class.summary-attention]="requestUrgency() === 'attention'"
              [class.summary-urgent]="requestUrgency() === 'urgent'"
            >
              <span class="summary-icon"><svg lucideInbox size="26"></svg></span>
              <div>
                <div class="summary-label-row">
                  <span class="category-label">Novos pedidos</span>
                  <span class="urgency-chip">{{ requestAttentionLabel() }}</span>
                </div>
                <h3>{{ requestCountLabel() }}</h3>
                <p>{{ requestAgeLabel() }}</p>
              </div>
            </article>
            <article
              class="card card-body summary-card message-card"
              [class.summary-empty]="messageUrgency() === 'empty'"
              [class.summary-attention]="messageUrgency() === 'attention'"
              [class.summary-urgent]="messageUrgency() === 'urgent'"
            >
              <span class="summary-icon"><svg lucideMessageCircle size="26"></svg></span>
              <div>
                <div class="summary-label-row">
                  <span class="category-label">Mensagens diretas</span>
                  <span class="urgency-chip">{{ messageAttentionLabel() }}</span>
                </div>
                <h3>{{ messageCountLabel() }}</h3>
                <p>{{ messageAgeLabel() }}</p>
              </div>
            </article>
          </div>
          <div class="table-like">
            @for (task of tasks; track task.time) {
              <article>
                <strong>{{ task.family }}</strong>
                <span class="muted">{{ task.note }}</span>
                <span class="badge task-time"><svg lucideClock3 size="15"></svg>{{ task.time }}</span>
              </article>
            }
          </div>
        </div>
      </div>
    </section>
  `,
  styles: `
    .registration-status {
      display: grid;
      grid-template-columns: minmax(0, 0.72fr) minmax(280px, 1.28fr);
      gap: 28px;
      align-items: center;
      margin: 24px 0 32px;
      padding: 26px 28px;
      border: 1px solid;
      border-left-width: 6px;
      border-radius: 8px;
    }

    .status-heading {
      display: flex;
      gap: 14px;
      align-items: center;
    }

    .status-heading p,
    .status-description {
      margin: 0;
    }

    .status-heading p {
      margin-bottom: 4px;
      font-size: 0.78rem;
      font-weight: 900;
      text-transform: uppercase;
    }

    .status-heading h2 {
      margin: 0;
      font-size: 1.55rem;
    }

    .status-description {
      line-height: 1.6;
      font-weight: 450;
    }

    .status-icon,
    .feature-icon,
    .summary-icon {
      display: grid;
      flex: 0 0 auto;
      place-items: center;
      border-radius: 50%;
    }

    .status-icon {
      width: 52px;
      height: 52px;
      background: rgba(255, 255, 255, 0.72);
    }

    .sidebar a {
      display: flex;
      gap: 11px;
      align-items: center;
    }

    .sidebar svg {
      flex: 0 0 20px;
    }

    .status-incomplete,
    .status-pending {
      border-color: #8ab6df;
      background: #edf6ff;
      color: #285f91;
    }

    .status-analysing {
      border-color: #e4a23d;
      background: #fff5e5;
      color: #8a5000;
    }

    .status-rejected {
      border-color: #d75c5c;
      background: #fff0f0;
      color: #9d2929;
    }

    .status-approved {
      border-color: #43a367;
      background: #edf9f1;
      color: #176b38;
    }

    .dashboard-alert {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 18px;
      align-items: center;
    }

    .feature-icon,
    .summary-icon {
      width: 48px;
      height: 48px;
      background: var(--color-primary-soft);
      color: var(--color-primary-strong);
    }

    .action-link,
    .task-time {
      display: inline-flex;
      gap: 8px;
      align-items: center;
    }

    .action-link svg,
    .task-time svg {
      flex: 0 0 auto;
    }

    .dashboard-summary {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .summary-card {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 16px;
      align-items: center;
      border: 1px solid;
      border-left-width: 5px;
      color: var(--summary-text);
      transition: background 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
    }

    .summary-card h3 {
      margin: 12px 0 4px;
      color: var(--summary-text);
    }

    .summary-card p {
      margin: 0;
      color: var(--summary-muted);
    }

    .summary-card .summary-icon {
      background: var(--summary-icon-bg);
      color: var(--summary-accent);
    }

    .summary-label-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
    }

    .category-label,
    .urgency-chip {
      font-size: 0.76rem;
      font-weight: 900;
    }

    .category-label {
      color: var(--summary-accent);
      text-transform: uppercase;
    }

    .urgency-chip {
      padding: 5px 8px;
      border: 1px solid var(--summary-border);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.72);
      color: var(--summary-text);
    }

    .request-card {
      --summary-accent: #a45f00;
      --summary-text: #684000;
      --summary-muted: #795b2b;
      --summary-border: #efcc7d;
      --summary-icon-bg: #ffefc2;
      border-color: var(--summary-border);
      background: #fffaf0;
    }

    .request-card.summary-attention {
      --summary-border: #dfa11e;
      --summary-icon-bg: #ffdf87;
      background: #fff3cd;
    }

    .request-card.summary-urgent {
      --summary-border: #c77a00;
      --summary-icon-bg: #ffc95f;
      background: #ffe9b5;
      box-shadow: inset 5px 0 0 #c93434;
    }

    .message-card {
      --summary-accent: #1769a2;
      --summary-text: #174c72;
      --summary-muted: #476b84;
      --summary-border: #9bc9eb;
      --summary-icon-bg: #dcedfa;
      border-color: var(--summary-border);
      background: #f1f8fe;
    }

    .message-card.summary-attention {
      --summary-border: #438fc8;
      --summary-icon-bg: #b9ddf7;
      background: #dfeffb;
    }

    .message-card.summary-urgent {
      --summary-border: #1f6fae;
      --summary-icon-bg: #91c8ef;
      background: #cfe7f8;
      box-shadow: inset 5px 0 0 #c93434;
    }

    .summary-urgent .urgency-chip {
      border-color: #d86a6a;
      background: #fff0f0;
      color: #9d2929;
    }

    .summary-empty {
      --summary-accent: #68776f;
      --summary-text: #405047;
      --summary-muted: #68776f;
      --summary-border: #d8e0dc;
      --summary-icon-bg: #edf1ef;
      background: #f7f9f8;
    }

    .dashboard-alert h3 {
      margin-top: 12px;
    }

    @media (max-width: 700px) {
      .registration-status {
        grid-template-columns: 1fr;
        gap: 16px;
        padding: 22px 20px;
      }

      .dashboard-alert {
        grid-template-columns: 1fr;
      }

      .feature-icon {
        width: 44px;
        height: 44px;
      }

      .dashboard-summary {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class CaregiverDashboardComponent implements OnInit {
  private readonly auth = inject(Auth);

  protected readonly showCompleteCaregiverProfile = signal(false);
  protected readonly approvalStatusLabel = signal('A verificar');
  protected readonly approvalMessage = signal('O cadastro está vinculado a esta conta.');
  protected readonly canEditProfile = signal(true);
  protected readonly statusTone = signal<'incomplete' | 'pending' | 'analysing' | 'rejected' | 'approved'>('incomplete');

  // Dados temporários até à ligação das coleções de pedidos e mensagens.
  protected readonly pendingRequestCount = signal(4);
  protected readonly oldestPendingRequestDays = signal(2);
  protected readonly unreadMessageCount = signal(2);
  protected readonly oldestUnreadMessageDays = signal(4);

  protected readonly requestUrgency = computed(() =>
    this.getUrgency(this.pendingRequestCount(), this.oldestPendingRequestDays(), 2, 3),
  );
  protected readonly messageUrgency = computed(() =>
    this.getUrgency(this.unreadMessageCount(), this.oldestUnreadMessageDays(), 2, 3),
  );
  protected readonly requestAttentionLabel = computed(() =>
    this.getAttentionLabel(this.requestUrgency(), 'Responder hoje'),
  );
  protected readonly messageAttentionLabel = computed(() =>
    this.getAttentionLabel(this.messageUrgency(), 'Acompanhar'),
  );
  protected readonly requestCountLabel = computed(() =>
    `${this.pendingRequestCount()} ${this.pendingRequestCount() === 1 ? 'pedido' : 'pedidos'}`,
  );
  protected readonly messageCountLabel = computed(() =>
    `${this.unreadMessageCount()} ${this.unreadMessageCount() === 1 ? 'mensagem' : 'mensagens'}`,
  );
  protected readonly requestAgeLabel = computed(() =>
    this.getAgeLabel(this.pendingRequestCount(), this.oldestPendingRequestDays(), 'antigo'),
  );
  protected readonly messageAgeLabel = computed(() =>
    this.getAgeLabel(this.unreadMessageCount(), this.oldestUnreadMessageDays(), 'antiga'),
  );

  protected readonly tasks = [
    { family: 'Familia Rocha', note: 'Visita de companhia e refeicao', time: 'Hoje 15:00' },
    { family: 'Familia Martins', note: 'Pedido novo para fins de semana', time: 'Responder' },
    { family: 'Familia Alves', note: 'Atualizar relatorio da visita', time: 'Pendente' },
  ];

  async ngOnInit(): Promise<void> {
    const user = await this.auth.getCurrentUser();
    if (!user) {
      return;
    }

    const caregiverProfile = await this.auth.getCaregiverProfile(user.uid);

    this.showCompleteCaregiverProfile.set(!caregiverProfile);

    if (!caregiverProfile) {
      this.approvalStatusLabel.set('Por concluir');
      this.approvalMessage.set('Conclua o cadastro de cuidador para o submeter à validação da equipa wecareparents.');
      this.statusTone.set('incomplete');
      return;
    }

    const approvalSummary = this.auth.getCaregiverApprovalSummary(caregiverProfile);
    this.approvalStatusLabel.set(this.getApprovalStatusLabel(approvalSummary.approvalStatus));
    this.canEditProfile.set(approvalSummary.canEdit);
    this.approvalMessage.set(this.getApprovalMessage(approvalSummary));
    this.statusTone.set(approvalSummary.approvalStatus);
  }

  private getApprovalStatusLabel(status: string): string {
    switch (status) {
      case 'analysing':
      case 'analysinig':
        return 'Em análise';
      case 'approved':
        return 'Aprovado';
      case 'rejected':
        return 'Recusado';
      default:
        return 'Pendente';
    }
  }

  private getUrgency(
    count: number,
    oldestAgeDays: number,
    attentionAfterDays: number,
    urgentAfterDays: number,
  ): 'empty' | 'normal' | 'attention' | 'urgent' {
    if (count === 0) {
      return 'empty';
    }
    if (oldestAgeDays > urgentAfterDays) {
      return 'urgent';
    }
    if (oldestAgeDays >= attentionAfterDays) {
      return 'attention';
    }
    return 'normal';
  }

  private getAttentionLabel(
    urgency: 'empty' | 'normal' | 'attention' | 'urgent',
    attentionLabel: string,
  ): string {
    switch (urgency) {
      case 'empty':
        return 'Sem pendências';
      case 'urgent':
        return 'Requer atenção';
      case 'attention':
        return attentionLabel;
      default:
        return 'Novo';
    }
  }

  private getAgeLabel(count: number, oldestAgeDays: number, adjective: 'antigo' | 'antiga'): string {
    if (count === 0) {
      return 'Nenhuma resposta pendente';
    }
    if (oldestAgeDays === 0) {
      return `Mais ${adjective} recebido hoje`;
    }
    return `Mais ${adjective} há ${oldestAgeDays} ${oldestAgeDays === 1 ? 'dia' : 'dias'}`;
  }

  private getApprovalMessage(summary: ReturnType<Auth['getCaregiverApprovalSummary']>): string {
    if (summary.approvalStatus === 'rejected') {
      return 'O cadastro não foi aprovado. Reveja os dados do perfil e faça as correções necessárias antes de o submeter novamente.';
    }

    if (summary.approvalStatus === 'analysing') {
      return 'A equipa wecareparents está a analisar os dados e documentos enviados. Aguarde pela conclusão da validação.';
    }

    if (summary.approvalStatus === 'pending') {
      return 'O cadastro foi recebido e aguarda o início da validação pela equipa wecareparents.';
    }

    const approvalDate = this.formatDate(summary.approvalDate);
    if (!summary.canEdit) {
      return `Cadastro aprovado em ${approvalDate}. Os dados pessoais só poderão ser alterados novamente a partir de ${this.formatDate(summary.canEditFrom)}.`;
    }

    return `Cadastro aprovado em ${approvalDate}. Já pode solicitar uma nova alteração; depois disso, os dados voltarão para validação.`;
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
}
