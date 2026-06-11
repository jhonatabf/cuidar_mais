import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-family-dashboard',
  imports: [RouterLink],
  template: `
    <section class="page">
      <div class="section-header">
        <p class="eyebrow">Dashboard familia</p>
        <h1>Visao geral dos cuidados contratados.</h1>
        <p class="lead">Resumo do plano, proximas visitas e pedidos em aberto.</p>
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
            <article class="card card-body"><span class="badge">Hoje</span><h3>Proxima visita</h3><p class="muted">Ana Silva, 15:00</p></article>
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
export class FamilyDashboardComponent {
  protected readonly visits = [
    { person: 'Ana Silva', task: 'Companhia, refeicao e notas da manha', time: 'Hoje 15:00' },
    { person: 'Ana Silva', task: 'Apoio em higiene e caminhada curta', time: 'Amanha 09:00' },
    { person: 'Rita Costa', task: 'Substituicao aprovada pela familia', time: 'Sexta 16:30' },
  ];
}
