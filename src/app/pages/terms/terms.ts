import { Component } from '@angular/core';

@Component({
  selector: 'app-terms',
  template: `
    <section class="page">
      <p class="eyebrow">Termos</p>
      <h1>Termos de utilizacao.</h1>
      <div class="legal-content">
        <p>Estes termos definem as regras gerais de utilizacao da CuidarPlus durante o MVP.</p>
        <h2>Conta e elegibilidade</h2>
        <p>O utilizador deve fornecer dados verdadeiros e manter as credenciais em seguranca.</p>
        <h2>Servicos de cuidado</h2>
        <p>A plataforma facilita contacto e gestao, mas os detalhes finais devem ser confirmados entre as partes.</p>
        <h2>Uso aceitavel</h2>
        <p>Nao e permitido usar a plataforma para conteudo falso, abusivo ou ilegal.</p>
      </div>
    </section>
  `,
})
export class TermsComponent {}
