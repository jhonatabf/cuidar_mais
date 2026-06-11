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
                  O perfil ainda está como rascunho. Complete os dados para preparar a revisão e ativação.
                </p>
              </div>
              <a class="button" routerLink="/seja-cuidador">Concluir cadastro</a>
            </article>
          }

          <article class="card card-body dashboard-alert">
            <div>
              <span class="badge">Perfil adicional</span>
              <h3>Criar perfil de família</h3>
              <p class="muted">
                Em breve poderá usar a mesma conta para gerir pedidos como família.
              </p>
            </div>
            <button class="button-secondary" type="button" disabled>Disponível em breve</button>
          </article>

          <div class="grid grid-3">
            <article class="card card-body"><span class="badge">Semana</span><h3>18 horas</h3><p class="muted">trabalho confirmado</p></article>
            <article class="card card-body"><span class="badge">Novos</span><h3>4 pedidos</h3><p class="muted">aguardam resposta</p></article>
            <article class="card card-body"><span class="badge">Perfil</span><h3>{{ profileStatusLabel() }}</h3><p class="muted">estado atual</p></article>
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
    .dashboard-alert {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 18px;
      align-items: center;
    }

    .dashboard-alert h3 {
      margin-top: 12px;
    }

    @media (max-width: 700px) {
      .dashboard-alert {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class CaregiverDashboardComponent implements OnInit {
  private readonly auth = inject(Auth);

  protected readonly showCompleteCaregiverProfile = signal(false);
  protected readonly profileStatusLabel = signal('A verificar');

  protected readonly tasks = [
    { family: 'Familia Rocha', note: 'Visita de companhia e refeicao', time: 'Hoje 15:00' },
    { family: 'Familia Martins', note: 'Pedido novo para fins de semana', time: 'Responder' },
    { family: 'Familia Alves', note: 'Atualizar relatorio da visita', time: 'Pendente' },
  ];

  async ngOnInit(): Promise<void> {
    const user = await this.auth.getCurrentUser();
    if (!user) {
      this.profileStatusLabel.set('Sem sessão');
      return;
    }

    const status = await this.auth.getCaregiverStatus(user.uid);
    this.showCompleteCaregiverProfile.set(status !== 'active' && status !== 'completed');
    this.profileStatusLabel.set(this.getStatusLabel(status));
  }

  private getStatusLabel(status: string | null): string {
    switch (status) {
      case 'active':
      case 'completed':
        return 'Ativo';
      case 'draft':
        return 'Rascunho';
      case 'pending':
        return 'Pendente';
      default:
        return 'Por criar';
    }
  }
}
