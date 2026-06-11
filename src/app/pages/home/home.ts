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
          <a class="button" routerLink="/encontrar-cuidador">Sou uma familia</a>
          <a class="button-secondary" routerLink="/seja-cuidador">Sou cuidador</a>
        </div>
      </div>

      <div class="hero-visual" aria-label="Cuidadora acompanhando idosa">
        <div class="care-photo"></div>
      </div>
    </section>

    <section class="page benefit-strip" aria-label="Beneficios principais">
      @for (benefit of benefits; track benefit.title) {
        <article>
          <span class="line-icon">{{ benefit.icon }}</span>
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
            <span class="round-icon">{{ step.icon }}</span>
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
            <span class="round-icon">{{ service.icon }}</span>
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
          <span class="round-icon">👥</span>
          <div>
            <h3>Para familias</h3>
            <p>Encontre cuidadores experientes, proximos a voce, com avaliacoes reais de outras familias.</p>
            <a class="button" routerLink="/encontrar-cuidador">Quero encontrar</a>
          </div>
          <div class="mini-photo family-photo"></div>
        </article>

        <article class="audience-card caregiver-card">
          <span class="round-icon">♡</span>
          <div>
            <h3>Para cuidadores</h3>
            <p>Cadastre-se gratuitamente, destaque suas habilidades e encontre familias que precisam de voce.</p>
            <a class="button" routerLink="/seja-cuidador">Quero me cadastrar</a>
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
            <a class="button" routerLink="/cadastro">Comece agora</a>
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
          <span class="line-icon">{{ item.icon }}</span>
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
    { icon: '↯', title: 'Conexao rapida', text: 'Encontre o perfil ideal em poucos cliques.' },
    { icon: '□', title: 'Perfis verificados', text: 'Documentos e antecedentes checados.' },
    { icon: '☆', title: 'Avaliacoes mutuas', text: 'Mais transparencia para ambas as partes.' },
    { icon: '♧', title: 'Suporte humano', text: 'Estamos aqui para ajudar sempre que precisar.' },
  ];

  protected readonly steps = [
    { icon: '♙', number: '1', title: 'Cadastre-se', text: 'Crie seu perfil de forma simples e rapida.' },
    { icon: '☷', number: '2', title: 'Busque ou ofereca', text: 'Encontre cuidadores ou oportunidades compativeis.' },
    { icon: '☏', number: '3', title: 'Converse', text: 'Tire duvidas e alinhe detalhes pelo chat interno.' },
    { icon: '□', number: '4', title: 'Contrate com seguranca', text: 'Avalie, combine e comece a jornada.' },
  ];

  protected readonly services = [
    { icon: '♙', title: 'Acompanhamento hospitalar' },
    { icon: '☼', title: 'Cuidados diarios' },
    { icon: '♁', title: 'Companhia' },
    { icon: '⌂', title: 'Higiene pessoal' },
    { icon: '♨', title: 'Refeicoes' },
    { icon: '☾', title: 'Noite / Pernoite' },
  ];

  protected readonly safety = [
    { icon: '□', title: 'Perfis verificados', text: 'Documentos analisados para mais confianca.' },
    { icon: '☷', title: 'Antecedentes checados', text: 'Cuidadores com antecedentes criminais verificados.' },
    { icon: '☆', title: 'Avaliacoes reais', text: 'Avaliacoes mutuas para uma comunidade mais segura.' },
    { icon: '▢', title: 'Ambiente seguro', text: 'Seu dados protegidos com criptografia e sigilo.' },
  ];
}
