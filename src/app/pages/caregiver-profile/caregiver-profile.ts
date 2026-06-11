import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-caregiver-profile',
  imports: [RouterLink],
  template: `
    <section class="page hero hero-compact">
      <div>
        <p class="eyebrow">Perfil do cuidador</p>
        <h1>Ana Silva</h1>
        <p class="lead">
          Auxiliar de geriatria em Lisboa, com experiencia em companhia, higiene,
          mobilidade e apoio a pessoas com demencia inicial.
        </p>
        <div class="actions">
          <a class="button" routerLink="/cadastro">Pedir contacto</a>
          <a class="button-secondary" routerLink="/encontrar-cuidador">Voltar a pesquisa</a>
        </div>
      </div>
      <aside class="card card-body">
        <span class="badge">Verificada</span>
        <h3>Resumo</h3>
        <ul class="check-list">
          <li>8 anos de experiencia</li>
          <li>Disponivel dias uteis</li>
          <li>18 eur por hora</li>
          <li>Português e ingles</li>
        </ul>
      </aside>
    </section>

    <section class="page section grid grid-2">
      <article class="card card-body">
        <h2>Competencias</h2>
        <ul class="check-list">
          <li>Higiene pessoal e conforto</li>
          <li>Preparacao de refeicoes simples</li>
          <li>Acompanhamento a consultas</li>
          <li>Registo de notas para a familia</li>
        </ul>
      </article>
      <article class="card card-body">
        <h2>Avaliacoes</h2>
        <ul class="profile-list">
          <li><strong>Familia Rocha</strong><p class="muted">Muito cuidadosa, pontual e serena.</p></li>
          <li><strong>Familia Martins</strong><p class="muted">Ajudou-nos a criar uma rotina segura.</p></li>
        </ul>
      </article>
    </section>
  `,
})
export class CaregiverProfileComponent {}
