import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-find-caregiver',
  imports: [RouterLink],
  template: `
    <section class="page hero hero-compact">
      <div>
        <p class="eyebrow">Encontrar cuidador</p>
        <h1>Pesquise cuidadores disponiveis para a sua zona.</h1>
        <p class="lead">Filtros essenciais para o MVP: localidade, tipo de cuidado e disponibilidade.</p>
      </div>
      <form class="card card-body form-grid" aria-label="Filtros de pesquisa">
        <label>Localidade<input type="search" placeholder="Lisboa, Porto, Braga" /></label>
        <label>Tipo de apoio
          <select>
            <option>Companhia</option>
            <option>Higiene e mobilidade</option>
            <option>Cuidados pos-operatorios</option>
          </select>
        </label>
        <label>Disponibilidade
          <select>
            <option>Durante a semana</option>
            <option>Fins de semana</option>
            <option>Noites</option>
          </select>
        </label>
        <button class="btn btn-primary" type="button">Aplicar filtros</button>
      </form>
    </section>

    <section class="page section grid grid-3">
      @for (caregiver of caregivers; track caregiver.id) {
        <article class="card feature-card">
          <span class="badge">{{ caregiver.rating }} estrelas</span>
          <h3>{{ caregiver.name }}</h3>
          <p class="muted">{{ caregiver.summary }}</p>
          <p><strong>{{ caregiver.price }}</strong> · {{ caregiver.location }}</p>
          <div class="actions">
            <a class="btn btn-secondary" [routerLink]="['/cuidador', caregiver.id]">Ver perfil</a>
          </div>
        </article>
      }
    </section>
  `,
})
export class FindCaregiverComponent {
  protected readonly caregivers = [
    { id: 'ana-silva', name: 'Ana Silva', rating: '4.9', location: 'Lisboa', price: '18 eur/h', summary: 'Auxiliar com 8 anos de experiencia em cuidados a idosos e demencia leve.' },
    { id: 'joao-mendes', name: 'Joao Mendes', rating: '4.8', location: 'Oeiras', price: '20 eur/h', summary: 'Enfermeiro disponivel para noites, medicacao e apoio pos-operatorio.' },
    { id: 'rita-costa', name: 'Rita Costa', rating: '5.0', location: 'Porto', price: '17 eur/h', summary: 'Cuidadora familiar com foco em companhia, refeicoes e mobilidade.' },
  ];
}
