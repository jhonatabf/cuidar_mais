import { Component } from '@angular/core';

@Component({
  selector: 'app-privacy',
  template: `
    <section class="page">
      <p class="eyebrow">Privacidade</p>
      <h1>Politica de privacidade.</h1>
      <div class="legal-content">
        <p>Tratamos dados pessoais para criar contas, gerir pedidos e melhorar a seguranca do servico.</p>
        <h2>Dados recolhidos</h2>
        <p>Nome, contacto, localidade, preferencias de cuidado e informacao profissional quando aplicavel.</p>
        <h2>Finalidades</h2>
        <p>Matching, comunicacao, suporte, prevencao de fraude e cumprimento de obrigacoes legais.</p>
        <h2>Direitos</h2>
        <p>O utilizador pode pedir acesso, correcao, eliminacao ou limitacao do tratamento.</p>
      </div>
    </section>
  `,
})
export class PrivacyComponent {}
