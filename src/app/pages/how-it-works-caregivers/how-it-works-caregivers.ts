import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-how-it-works-caregivers',
  imports: [RouterLink],
  template: `
    <section class="page hero hero-compact">
      <div>
        <p class="eyebrow">Como funciona cuidadores</p>
        <h1>Receba pedidos alinhados com a sua experiencia e disponibilidade.</h1>
        <p class="lead">
          Cuidadores criam perfil, validam dados, indicam disponibilidade e acompanham
          reservas num painel proprio.
        </p>
        <div class="actions">
          <a class="button" [routerLink]="primaryActionPath()">
            {{ isCheckingProfile() ? 'A verificar...' : primaryActionLabel() }}
          </a>
          <a class="button-secondary" routerLink="/dashboard/cuidador">Ver dashboard</a>
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
export class HowItWorksCaregiversComponent implements OnInit {
  private readonly auth = inject(Auth);

  protected readonly primaryActionLabel = signal('Entrar / Cadastrar');
  protected readonly primaryActionPath = signal('/login');
  protected readonly isCheckingProfile = signal(true);

  protected readonly items = [
    { badge: 'Perfil', title: 'Apresente experiencia', text: 'Inclua areas de cuidado, formacao, documentos e uma biografia simples.' },
    { badge: 'Matching', title: 'Aceite bons pedidos', text: 'Veja familias proximas, duracao, tarefas e valor estimado antes de responder.' },
    { badge: 'Rotina', title: 'Organize o trabalho', text: 'Acompanhe agenda, notas de visita e proximos pagamentos simulados.' },
  ];

  async ngOnInit(): Promise<void> {
    try {
      const user = await this.auth.getCurrentUser();
      if (!user) {
        this.primaryActionLabel.set('Entrar / Cadastrar');
        this.primaryActionPath.set('/login');
        return;
      }

      const caregiverStatus = await this.auth.getCaregiverStatus(user.uid);
      if (caregiverStatus === 'active' || caregiverStatus === 'completed') {
        this.primaryActionLabel.set('Acessar dashboard');
        this.primaryActionPath.set('/dashboard/cuidador');
        return;
      }

      if (caregiverStatus === 'draft') {
        this.primaryActionLabel.set('Continuar cadastro');
        this.primaryActionPath.set('/dashboard/cuidador');
        return;
      }

      this.primaryActionLabel.set('Criar perfil');
      this.primaryActionPath.set('/seja-cuidador');
    } finally {
      this.isCheckingProfile.set(false);
    }
  }
}
