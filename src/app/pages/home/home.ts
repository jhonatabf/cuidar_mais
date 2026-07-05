import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AppLocale, LocaleService } from '../../core/services/locale';

const HOME_COPY = {
  'pt-PT': {
    heroTitle: 'O verdadeiro cuidado começa com a',
    heroHighlight: 'pessoa certa.',
    heroLead: 'Ligamos famílias a cuidadores qualificados e de confiança.',
    familyAction: 'Sou uma família',
    caregiverAction: 'Sou cuidador',
    heroImage: 'Cuidadora a acompanhar uma pessoa idosa',
    benefitsLabel: 'Principais benefícios',
    benefits: [
      { icon: 'speed', title: 'Ligação rápida', text: 'Encontre o perfil ideal em poucos cliques.' },
      { icon: 'verified_user', title: 'Perfis verificados', text: 'Documentos e dados analisados para maior confiança.' },
      { icon: 'reviews', title: 'Avaliações mútuas', text: 'Maior transparência para ambas as partes.' },
      { icon: 'support_agent', title: 'Apoio humano', text: 'Ajuda próxima sempre que precisar.' },
    ],
    howTitle: 'Como funciona',
    steps: [
      { icon: 'person_add', number: '1', title: 'Registe-se', text: 'Crie o seu perfil de forma simples e rápida.' },
      { icon: 'manage_search', number: '2', title: 'Procure ou ofereça', text: 'Encontre cuidadores ou oportunidades compatíveis.' },
      { icon: 'chat', number: '3', title: 'Converse', text: 'Esclareça dúvidas e combine detalhes através do chat interno.' },
      { icon: 'gavel', number: '4', title: 'Contrate com segurança', text: 'Avalie, combine e avance com responsabilidade.' },
    ],
    supportTitle: 'Encontre o apoio ideal para cada momento',
    services: [
      { icon: 'local_hospital', title: 'Acompanhamento hospitalar' },
      { icon: 'home_health', title: 'Cuidados diários' },
      { icon: 'diversity_1', title: 'Companhia' },
      { icon: 'shower', title: 'Higiene pessoal' },
      { icon: 'restaurant', title: 'Refeições' },
      { icon: 'nightlight', title: 'Noite / Pernoita' },
    ],
    audienceTitle: 'Para quem é a Cuidar+?',
    familyTitle: 'Para famílias',
    familyText: 'Encontre cuidadores experientes perto de si, com avaliações reais de outras famílias.',
    familyCta: 'Quero encontrar',
    caregiverTitle: 'Para cuidadores',
    caregiverText: 'Registe-se gratuitamente, destaque as suas competências e encontre famílias que precisam de si.',
    caregiverCta: 'Quero registar-me',
    testimonial: 'Encontrámos uma cuidadora maravilhosa para a minha mãe. Profissional, atenciosa e de confiança. Recomendo!',
    joinTitle: 'Registe-se gratuitamente e encontre a melhor ligação.',
    joinCta: 'Comece agora',
    safety: [
      { icon: 'verified_user', title: 'Perfis verificados', text: 'Documentos analisados para maior confiança.' },
      { icon: 'fact_check', title: 'Antecedentes verificados', text: 'Cuidadores com registo criminal verificado.' },
      { icon: 'stars', title: 'Avaliações reais', text: 'Avaliações mútuas para uma comunidade mais segura.' },
      { icon: 'lock', title: 'Ambiente seguro', text: 'Os seus dados são protegidos com encriptação e confidencialidade.' },
    ],
  },
  'en-GB': {
    heroTitle: 'Genuine care begins with the',
    heroHighlight: 'right person.',
    heroLead: 'We connect families with qualified, trusted caregivers.',
    familyAction: 'I am a family member',
    caregiverAction: 'I am a caregiver',
    heroImage: 'Caregiver accompanying an older person',
    benefitsLabel: 'Main benefits',
    benefits: [
      { icon: 'speed', title: 'Quick connection', text: 'Find the right profile in just a few clicks.' },
      { icon: 'verified_user', title: 'Verified profiles', text: 'Documents and details reviewed for greater confidence.' },
      { icon: 'reviews', title: 'Mutual reviews', text: 'Greater transparency for both parties.' },
      { icon: 'support_agent', title: 'Human support', text: 'Helpful, personal support whenever you need it.' },
    ],
    howTitle: 'How it works',
    steps: [
      { icon: 'person_add', number: '1', title: 'Register', text: 'Create your profile simply and quickly.' },
      { icon: 'manage_search', number: '2', title: 'Search or offer care', text: 'Find compatible caregivers or opportunities.' },
      { icon: 'chat', number: '3', title: 'Talk', text: 'Ask questions and agree details through the internal chat.' },
      { icon: 'gavel', number: '4', title: 'Hire with confidence', text: 'Review, agree and proceed responsibly.' },
    ],
    supportTitle: 'Find the right support for every moment',
    services: [
      { icon: 'local_hospital', title: 'Hospital accompaniment' },
      { icon: 'home_health', title: 'Daily care' },
      { icon: 'diversity_1', title: 'Companionship' },
      { icon: 'shower', title: 'Personal hygiene' },
      { icon: 'restaurant', title: 'Meals' },
      { icon: 'nightlight', title: 'Night / Overnight care' },
    ],
    audienceTitle: 'Who is Cuidar+ for?',
    familyTitle: 'For families',
    familyText: 'Find experienced caregivers near you, with genuine reviews from other families.',
    familyCta: 'Find a caregiver',
    caregiverTitle: 'For caregivers',
    caregiverText: 'Register free of charge, showcase your skills and find families who need your support.',
    caregiverCta: 'Register as a caregiver',
    testimonial: 'We found a wonderful caregiver for my mother. Professional, attentive and trustworthy. I highly recommend her!',
    joinTitle: 'Register free of charge and find the right connection.',
    joinCta: 'Get started',
    safety: [
      { icon: 'verified_user', title: 'Verified profiles', text: 'Documents reviewed for greater confidence.' },
      { icon: 'fact_check', title: 'Background checks', text: 'Caregivers with verified criminal record checks.' },
      { icon: 'stars', title: 'Genuine reviews', text: 'Mutual reviews for a safer community.' },
      { icon: 'lock', title: 'Secure environment', text: 'Your details are protected through encryption and confidentiality.' },
    ],
  },
} as const;

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <section class="page home-hero">
      <div class="hero-copy">
        <h1>{{ copy().heroTitle }} <span>{{ copy().heroHighlight }}</span></h1>
        <p class="lead">{{ copy().heroLead }}</p>

        <div class="actions">
          <a class="btn btn-primary" routerLink="/encontrar-cuidador">{{ copy().familyAction }}</a>
          <a class="btn btn-secondary" routerLink="/seja-cuidador">{{ copy().caregiverAction }}</a>
        </div>
      </div>

      <div class="hero-visual" [attr.aria-label]="copy().heroImage">
        <div class="care-photo"></div>
      </div>
    </section>

    <section class="page benefit-strip" [attr.aria-label]="copy().benefitsLabel">
      @for (benefit of copy().benefits; track benefit.title) {
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
        <h2>{{ copy().howTitle }}</h2>
      </div>
      <div class="steps-row">
        @for (step of copy().steps; track step.title) {
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
        <h2>{{ copy().supportTitle }}</h2>
      </div>
      <div class="service-grid">
        @for (service of copy().services; track service.title) {
          <article>
            <span class="material-symbols-rounded icon-badge icon-badge--soft" aria-hidden="true">{{ service.icon }}</span>
            <h3>{{ service.title }}</h3>
          </article>
        }
      </div>
    </section>

    <section class="page audience-panel">
      <div class="section-header">
        <h2>{{ copy().audienceTitle }}</h2>
      </div>

      <div class="audience-grid">
        <article class="audience-card family-card">
          <span class="material-symbols-rounded icon-badge icon-badge--soft" aria-hidden="true">family_restroom</span>
          <div>
            <h3>{{ copy().familyTitle }}</h3>
            <p>{{ copy().familyText }}</p>
            <a class="btn btn-primary" routerLink="/encontrar-cuidador">{{ copy().familyCta }}</a>
          </div>
          <div class="mini-photo family-photo"></div>
        </article>

        <article class="audience-card caregiver-card">
          <span class="material-symbols-rounded icon-badge icon-badge--soft" aria-hidden="true">medical_services</span>
          <div>
            <h3>{{ copy().caregiverTitle }}</h3>
            <p>{{ copy().caregiverText }}</p>
            <a class="btn btn-register" routerLink="/seja-cuidador">{{ copy().caregiverCta }}</a>
          </div>
          <div class="mini-photo caregiver-photo"></div>
        </article>

        <article class="testimonial-card">
          <span class="quote">“</span>
          <p>“{{ copy().testimonial }}”</p>
          <strong>— Carla S.</strong>
          <div class="dots" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
        </article>

        <article class="phone-card">
          <div>
            <h3>{{ copy().joinTitle }}</h3>
            <a class="btn btn-action" routerLink="/cadastro">{{ copy().joinCta }}</a>
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
      @for (item of copy().safety; track item.title) {
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
  private readonly localeService = inject(LocaleService);

  protected copy(): (typeof HOME_COPY)[AppLocale] {
    return HOME_COPY[this.localeService.locale()];
  }
}
