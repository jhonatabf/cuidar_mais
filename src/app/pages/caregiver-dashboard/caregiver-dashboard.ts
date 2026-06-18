import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-caregiver-dashboard',
  imports: [RouterLink],
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
          <span class="status-indicator" aria-hidden="true"></span>
          <div>
            <p>Estado do cadastro</p>
            <h2>{{ approvalStatusLabel() }}</h2>
          </div>
        </div>
        <p class="status-description">{{ approvalMessage() }}</p>
      </article>

      <div class="dashboard-shell">
        <aside class="card sidebar">
          <a href="#">Agenda</a>
          <a href="#">Pedidos</a>
          <a href="#">Perfil</a>
          <a href="#">Pagamentos</a>
        </aside>
        <div class="grid">
          @if (showCompleteCaregiverProfile()) {
            <article class="card card-body dashboard-alert">
              <div>
                <span class="badge">Cadastro pendente</span>
                <h3>Conclua o seu perfil de cuidador</h3>
                <p class="muted">
                  Ainda não encontramos um cadastro de cuidador vinculado a esta conta.
                  Complete os dados para criar o perfil profissional.
                </p>
              </div>
              <a class="button" routerLink="/seja-cuidador">Concluir cadastro</a>
            </article>
          } @else {
            <article class="card card-body dashboard-alert">
              <div>
                <span class="badge">Perfil de cuidador</span>
                <h3>Dados do cuidador cadastrados</h3>
                <p class="muted">
                  Consulte ou atualize os dados profissionais apresentados às famílias.
                </p>
              </div>
              @if (canEditProfile()) {
                <a class="button" routerLink="/seja-cuidador">Editar dados</a>
              } @else {
                <button class="button-secondary" type="button" disabled>Alteração bloqueada</button>
              }
            </article>
          }

          <div class="grid dashboard-summary">
            <article class="card card-body"><span class="badge">Novos pedidos</span><h3>4 pedidos</h3><p class="muted">aguardam resposta</p></article>
            <article class="card card-body"><span class="badge">Mensagens diretas</span><h3>2 mensagens</h3><p class="muted">aguardam leitura</p></article>
          </div>
          <div class="table-like">
            @for (task of tasks; track task.time) {
              <article>
                <strong>{{ task.family }}</strong>
                <span class="muted">{{ task.note }}</span>
                <span class="badge">{{ task.time }}</span>
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

    .status-indicator {
      width: 18px;
      height: 18px;
      flex: 0 0 18px;
      border: 4px solid rgba(255, 255, 255, 0.82);
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 0 1px currentColor;
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
      grid-template-columns: 1fr auto;
      gap: 18px;
      align-items: center;
    }

    .dashboard-summary {
      grid-template-columns: repeat(2, minmax(0, 1fr));
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
      this.approvalMessage.set('Conclua o cadastro de cuidador para o submeter à validação da equipa Cuidar+.');
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

  private getApprovalMessage(summary: ReturnType<Auth['getCaregiverApprovalSummary']>): string {
    if (summary.approvalStatus === 'rejected') {
      return 'O cadastro não foi aprovado. Reveja os dados do perfil e faça as correções necessárias antes de o submeter novamente.';
    }

    if (summary.approvalStatus === 'analysing') {
      return 'A equipa Cuidar+ está a analisar os dados e documentos enviados. Aguarde pela conclusão da validação.';
    }

    if (summary.approvalStatus === 'pending') {
      return 'O cadastro foi recebido e aguarda o início da validação pela equipa Cuidar+.';
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
