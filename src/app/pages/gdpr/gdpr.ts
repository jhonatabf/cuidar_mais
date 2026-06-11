import { Component } from '@angular/core';

@Component({
  selector: 'app-gdpr',
  template: `
    <section class="page">
      <p class="eyebrow">RGPD</p>
      <h1>Compromisso com o RGPD.</h1>
      <div class="legal-content">
        <p>A CuidarPlus foi estruturada para respeitar principios de minimizacao, transparencia e seguranca.</p>
        <h2>Base legal</h2>
        <p>Tratamos dados com base em contrato, consentimento, obrigacao legal ou interesse legitimo.</p>
        <h2>Retencao</h2>
        <p>Os dados sao guardados apenas pelo periodo necessario para prestar o servico e cumprir a lei.</p>
        <h2>Pedidos do titular</h2>
        <p>Pedidos RGPD podem ser enviados pelo canal de contacto e serao registados para resposta.</p>
      </div>
    </section>
  `,
})
export class GdprComponent {}
