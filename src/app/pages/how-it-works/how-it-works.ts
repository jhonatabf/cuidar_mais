import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-how-it-works',
  imports: [RouterLink],
  template: `
    <section class="page hero hero-compact">
      <div>
        <p class="eyebrow">Como funciona</p>
        <h1>Do pedido inicial ao cuidado acompanhado, tudo em quatro passos.</h1>
        <p class="lead">
          O MVP cobre a jornada principal: recolha das necessidades, matching, conversa
          inicial e acompanhamento do servico.
        </p>
        <div class="actions">
          <a class="button" routerLink="/como-funciona/familias">Para familias</a>
          <a class="button-secondary" routerLink="/como-funciona/cuidadores">Para cuidadores</a>
        </div>
      </div>
    </section>

    <section class="page section">
      <ol class="timeline">
        @for (step of steps; track step.title) {
          <li>
            <span class="badge">{{ step.number }}</span>
            <h3>{{ step.title }}</h3>
            <p class="muted">{{ step.text }}</p>
          </li>
        }
      </ol>
    </section>
  `,
})
export class HowItWorksComponent {
  protected readonly steps = [
    { number: '01', title: 'Conte-nos o que precisa', text: 'Crie um pedido com local, horarios, tipo de apoio e nivel de autonomia.' },
    { number: '02', title: 'Veja cuidadores compativeis', text: 'Compare experiencia, disponibilidade, preco estimado e avaliacoes.' },
    { number: '03', title: 'Combine detalhes', text: 'Use o contacto inicial para alinhar rotina, expectativas e plano de cuidado.' },
    { number: '04', title: 'Acompanhe o servico', text: 'Dashboards mostram proximas visitas, tarefas, mensagens e historico.' },
  ];
}
