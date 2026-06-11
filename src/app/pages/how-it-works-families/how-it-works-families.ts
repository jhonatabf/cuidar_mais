import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-how-it-works-families',
  imports: [RouterLink],
  template: `
    <section class="page hero hero-compact">
      <div>
        <p class="eyebrow">Como funciona familias</p>
        <h1>Encontre apoio humano para rotinas que precisam de cuidado extra.</h1>
        <p class="lead">
          Familias podem pesquisar, comparar perfis, guardar favoritos e gerir pedidos de cuidado.
        </p>
        <div class="actions">
          <a class="button" routerLink="/encontrar-cuidador">Pesquisar cuidadores</a>
          <a class="button-secondary" routerLink="/dashboard/familia">Ver dashboard</a>
        </div>
      </div>
    </section>

    <section class="page section grid grid-3">
      @for (item of items; track item.title) {
        <article class="card feature-card">
          <span class="badge">{{ item.badge }}</span>
          <h3>{{ item.title }}</h3>
          <p class="muted">{{ item.text }}</p>
        </article>
      }
    </section>
  `,
})
export class HowItWorksFamiliesComponent {
  protected readonly items = [
    { badge: 'Pedido', title: 'Necessidades claras', text: 'Registe mobilidade, medicacao, alimentacao, higiene e companhia.' },
    { badge: 'Selecao', title: 'Comparacao objetiva', text: 'Filtre por zona, experiencia, turnos, idioma e preco por hora.' },
    { badge: 'Gestao', title: 'Rotina acompanhada', text: 'Consulte visitas, tarefas, notas do cuidador e proximas acoes.' },
  ];
}
