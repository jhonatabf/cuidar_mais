import { Injectable, signal } from '@angular/core';

export type AppLocale = 'pt-PT' | 'en-GB';

const LOCALE_STORAGE_KEY = 'cuidar-plus-locale';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  readonly locale = signal<AppLocale>(this.readStoredLocale());

  constructor() {
    this.applyDocumentLanguage(this.locale());
  }

  setLocale(locale: AppLocale): void {
    this.locale.set(locale);
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    this.applyDocumentLanguage(locale);
  }

  private readStoredLocale(): AppLocale {
    return localStorage.getItem(LOCALE_STORAGE_KEY) === 'en-GB' ? 'en-GB' : 'pt-PT';
  }

  private applyDocumentLanguage(locale: AppLocale): void {
    document.documentElement.lang = locale;
  }
}
