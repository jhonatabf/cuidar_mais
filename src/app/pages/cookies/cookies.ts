import { Component } from '@angular/core';

@Component({
  selector: 'app-cookies',
  template: `
    <section class="page">
      <p class="eyebrow">Cookies</p>
      <h1>Politica de cookies.</h1>
      <div class="legal-content">
        <p>Usamos cookies essenciais para sessao e preferencias, e cookies analiticos apenas quando autorizados.</p>
        <h2>Essenciais</h2>
        <p>Necessarios para autenticacao, seguranca e funcionamento basico da plataforma.</p>
        <h2>Analiticos</h2>
        <p>Ajudam a entender uso agregado e a melhorar fluxos do produto.</p>
        <h2>Gestao</h2>
        <p>O utilizador pode alterar permissoes no banner ou nas definicoes do navegador.</p>
      </div>
    </section>
  `,
})
export class CookiesComponent {}
