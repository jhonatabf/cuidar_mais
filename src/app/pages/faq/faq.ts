import { Component } from '@angular/core';

@Component({
  selector: 'app-faq',
  template: `
    <section class="page hero hero-compact">
      <div>
        <p class="eyebrow">FAQ</p>
        <h1>Perguntas frequentes.</h1>
        <p class="lead">Respostas rapidas para familias e cuidadores no MVP.</p>
      </div>
    </section>
    <section class="page section grid grid-2">
      @for (faq of faqs; track faq.q) {
        <article class="card card-body">
          <h3>{{ faq.q }}</h3>
          <p class="muted">{{ faq.a }}</p>
        </article>
      }
    </section>
  `,
})
export class FaqComponent {
  protected readonly faqs = [
    { q: 'Os cuidadores sao verificados?', a: 'O MVP preve validacao de identidade, referencias e documentos profissionais.' },
    { q: 'Posso trocar de cuidador?', a: 'Sim. A familia pode pedir substituicao e manter o historico do plano.' },
    { q: 'Como funciona o pagamento?', a: 'Nesta fase, a interface mostra estados simulados para preparar a integracao real.' },
    { q: 'Cuidadores podem definir horarios?', a: 'Sim. A disponibilidade e parte central do perfil profissional.' },
  ];
}
