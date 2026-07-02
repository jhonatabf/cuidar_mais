import { Component } from '@angular/core';

@Component({
  selector: 'app-contact',
  template: `
    <section class="page hero hero-compact">
      <div>
        <p class="eyebrow">Contacto</p>
        <h1>Fale connosco sobre cuidados, parcerias ou suporte.</h1>
        <p class="lead">Responderemos com orientacao clara para a sua situacao.</p>
      </div>
      <form class="card card-body form-grid">
        <label>Nome<input placeholder="O seu nome" /></label>
        <label>Email<input type="email" placeholder="email@exemplo.pt" /></label>
        <label>Mensagem<textarea placeholder="Como podemos ajudar?"></textarea></label>
        <button class="btn btn-login" type="button">Enviar mensagem</button>
      </form>
    </section>
  `,
})
export class ContactComponent {}
