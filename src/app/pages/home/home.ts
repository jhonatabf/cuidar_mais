import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <section class="page home-hero">
      <div class="hero-copy">
        <h1>Cuidado de verdade começa com a <span>pessoa certa.</span></h1>
        <p class="lead">Conectamos familias a cuidadores qualificados e confiaveis.</p>

        <div class="actions">
          <a class="btn btn-primary" routerLink="/encontrar-cuidador">Sou uma familia</a>
          <a class="btn btn-secondary" routerLink="/seja-cuidador">Sou cuidador</a>
        </div>
      </div>

      <div class="hero-visual" aria-label="Cuidadora acompanhando idosa">
        <div class="care-photo"></div>
      </div>
    </section>

    <section class="page benefit-strip" aria-label="Beneficios principais">
      @for (benefit of benefits; track benefit.title) {
        <article>
          <span class="material-symbols-rounded icon-badge icon-badge--soft" aria-hidden="true">{{ benefit.icon }}</span>
          <div>
            <h3>{{ benefit.title }}</h3>
            <p>{{ benefit.text }}</p>
          </div>
        </article>
      }
    </section>

    <section class="page section how-home">
      <div class="section-header">
        <h2>Como funciona</h2>
      </div>
      <div class="steps-row">
        @for (step of steps; track step.title) {
          <article>
            <span class="material-symbols-rounded icon-badge icon-badge--soft" aria-hidden="true">{{ step.icon }}</span>
            <strong>{{ step.number }}</strong>
            <h3>{{ step.title }}</h3>
            <p>{{ step.text }}</p>
          </article>
        }
      </div>
    </section>

    <section class="page section support-section">
      <div class="section-header">
        <h2>Encontre o apoio ideal para cada momento</h2>
      </div>
      <div class="service-grid">
        @for (service of services; track service.title) {
          <article>
            <span class="material-symbols-rounded icon-badge icon-badge--soft" aria-hidden="true">{{ service.icon }}</span>
            <h3>{{ service.title }}</h3>
          </article>
        }
      </div>
    </section>

    <section class="page audience-panel">
      <div class="section-header">
        <h2>Para quem e a Cuidar+?</h2>
      </div>

      <div class="audience-grid">
        <article class="audience-card family-card">
          <span class="material-symbols-rounded icon-badge icon-badge--soft" aria-hidden="true">family_restroom</span>
          <div>
            <h3>Para familias</h3>
            <p>Encontre cuidadores experientes, proximos a voce, com avaliacoes reais de outras familias.</p>
            <a class="btn btn-primary" routerLink="/encontrar-cuidador">Quero encontrar</a>
          </div>
          <div class="mini-photo family-photo"></div>
        </article>

        <article class="audience-card caregiver-card">
          <span class="material-symbols-rounded icon-badge icon-badge--soft" aria-hidden="true">medical_services</span>
          <div>
            <h3>Para cuidadores</h3>
            <p>Cadastre-se gratuitamente, destaque suas habilidades e encontre familias que precisam de voce.</p>
            <a class="btn btn-register" routerLink="/seja-cuidador">Quero me cadastrar</a>
          </div>
          <div class="mini-photo caregiver-photo"></div>
        </article>

        <article class="testimonial-card">
          <span class="quote">“</span>
          <p>"Encontramos uma cuidadora maravilhosa para minha mae. Profissional, atenciosa e confiavel. Recomendo!"</p>
          <strong>— Carla S.</strong>
          <div class="dots" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
        </article>

        <article class="phone-card">
          <div>
            <h3>Cadastre-se gratis e encontre a melhor conexao.</h3>
            <a class="btn btn-action" routerLink="/cadastro">Comece agora</a>
          </div>
          <div class="phone-mock" aria-hidden="true">
            <span>Cuidar+</span>
            <div></div>
            <div></div>
            <div></div>
          </div>
        </article>
      </div>
    </section>

    <section class="page section safety-grid">
      @for (item of safety; track item.title) {
        <article>
          <span class="material-symbols-rounded icon-badge icon-badge--soft" aria-hidden="true">{{ item.icon }}</span>
          <div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.text }}</p>
          </div>
        </article>
      }
    </section>
  `,
  styleUrl: './home.scss',
})
export class HomeComponent {
  protected readonly benefits = [
    { icon: 'speed', title: 'Conexão rápida', text: 'Encontre o perfil ideal em poucos cliques.' },
    { icon: 'verified_user', title: 'Perfis verificados', text: 'Documentos e dados analisados para mais confiança.' },
    { icon: 'reviews', title: 'Avaliações mútuas', text: 'Mais transparência para ambas as partes.' },
    { icon: 'support_agent', title: 'Suporte humano', text: 'Ajuda próxima sempre que precisar.' },
  ];

  protected readonly steps = [
    { icon: 'person_add', number: '1', title: 'Cadastre-se', text: 'Crie o seu perfil de forma simples e rápida.' },
    { icon: 'manage_search', number: '2', title: 'Busque ou ofereça', text: 'Encontre cuidadores ou oportunidades compatíveis.' },
    { icon: 'chat', number: '3', title: 'Converse', text: 'Tire dúvidas e alinhe detalhes pelo chat interno.' },
    { icon: 'gavel', number: '4', title: 'Contrate com segurança', text: 'Avalie, combine e avance com responsabilidade.' },
  ];

  protected readonly services = [
    { icon: 'local_hospital', title: 'Acompanhamento hospitalar' },
    { icon: 'home_health', title: 'Cuidados diários' },
    { icon: 'diversity_1', title: 'Companhia' },
    { icon: 'shower', title: 'Higiene pessoal' },
    { icon: 'restaurant', title: 'Refeições' },
    { icon: 'nightlight', title: 'Noite / Pernoite' },
  ];

  protected readonly safety = [
    { icon: 'verified_user', title: 'Perfis verificados', text: 'Documentos analisados para mais confiança.' },
    { icon: 'fact_check', title: 'Antecedentes checados', text: 'Cuidadores com antecedentes criminais verificados.' },
    { icon: 'stars', title: 'Avaliações reais', text: 'Avaliações mútuas para uma comunidade mais segura.' },
    { icon: 'lock', title: 'Ambiente seguro', text: 'Os seus dados protegidos com criptografia e sigilo.' },
  ];
}
