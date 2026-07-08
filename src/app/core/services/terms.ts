import { Injectable } from '@angular/core';
import { collection, getDocs, query, where } from 'firebase/firestore';

import { firestoreDb } from '../firebase/firebase.config';
import { AppLocale } from './locale';

export type TermsType = 'privacy' | 'termsAndConditions';
export type TermsContent = string | Partial<Record<'pt-pt' | 'en-gb' | AppLocale, string>>;

export interface TermsDocument {
  id: string;
  type: TermsType;
  content: TermsContent;
  date: Date | null;
  dateUpdate: Date | null;
  active: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class TermsService {
  async getLatestActiveTerms(type: TermsType): Promise<TermsDocument | null> {
    const [activeSnapshot, ativoSnapshot] = await Promise.all([
      getDocs(query(collection(firestoreDb, 'terms'), where('type', '==', type), where('active', '==', true))),
      getDocs(query(collection(firestoreDb, 'terms'), where('type', '==', type), where('ativo', '==', true))),
    ]);
    const termsById = new Map(
      [...activeSnapshot.docs, ...ativoSnapshot.docs]
      .map((document) => this.toTermsDocument(document.id, document.data()))
      .filter((document): document is TermsDocument => !!document)
      .map((document) => [document.id, document]),
    );
    const terms = [...termsById.values()]
      .sort((first, second) => this.dateTime(second.date) - this.dateTime(first.date));

    return terms[0] ?? null;
  }

  contentForLocale(content: TermsContent, locale: AppLocale): string {
    if (typeof content === 'string') {
      return this.decodeContent(content);
    }

    const localeKey = locale.toLowerCase() as 'pt-pt' | 'en-gb';
    const fallbackKey = locale === 'en-GB' ? 'pt-pt' : 'en-gb';
    const encodedContent =
      content[localeKey] ??
      content[locale] ??
      content[fallbackKey] ??
      content[locale === 'en-GB' ? 'pt-PT' : 'en-GB'] ??
      '';

    return this.decodeContent(encodedContent);
  }

  applyDatePlaceholder(markdown: string, dateUpdate: Date | null, locale: AppLocale): string {
    if (!dateUpdate) {
      return markdown.replace(/\[Date\]/g, '');
    }

    return markdown.replace(/\[Date\]/g, this.formatDate(dateUpdate, locale));
  }

  private decodeContent(content: string): string {
    try {
      const binary = window.atob(content);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      return new TextDecoder('utf-8').decode(bytes);
    } catch {
      return content;
    }
  }

  markdownToHtml(markdown: string): string {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const html: string[] = [];
    let listItems: string[] = [];

    const closeList = (): void => {
      if (!listItems.length) return;
      html.push(`<ul>${listItems.join('')}</ul>`);
      listItems = [];
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        closeList();
        continue;
      }

      const heading = /^(#{1,3})\s+(.+)$/.exec(line);
      if (heading) {
        closeList();
        const level = heading[1].length;
        html.push(`<h${level}>${this.inlineMarkdown(heading[2])}</h${level}>`);
        continue;
      }

      const listItem = /^[-*]\s+(.+)$/.exec(line);
      if (listItem) {
        listItems.push(`<li>${this.inlineMarkdown(listItem[1])}</li>`);
        continue;
      }

      closeList();
      html.push(`<p>${this.inlineMarkdown(line)}</p>`);
    }

    closeList();
    return html.join('');
  }

  private inlineMarkdown(value: string): string {
    return this.escapeHtml(value)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private toTermsDocument(id: string, data: Record<string, unknown>): TermsDocument | null {
    if (
      !this.isTermsType(data['type']) ||
      (data['active'] !== true && data['ativo'] !== true) ||
      !this.isTermsContent(data['content'])
    ) {
      return null;
    }

    return {
      id,
      type: data['type'],
      content: data['content'],
      active: true,
      date: this.toDate(data['date'] ?? data['data'] ?? data['effectiveDate'] ?? data['publishedAt'] ?? data['updatedAt']),
      dateUpdate: this.toDate(data['dateUpdate']),
    };
  }

  private isTermsType(value: unknown): value is TermsType {
    return value === 'privacy' || value === 'termsAndConditions';
  }

  private isTermsContent(value: unknown): value is TermsContent {
    if (typeof value === 'string') {
      return true;
    }

    return (
      !!value &&
      typeof value === 'object' &&
      ['pt-pt', 'en-gb', 'pt-PT', 'en-GB'].some((key) => typeof (value as Record<string, unknown>)[key] === 'string')
    );
  }

  private toDate(value: unknown): Date | null {
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
      return value.toDate() as Date;
    }
    return null;
  }

  private dateTime(date: Date | null): number {
    return date?.getTime() ?? 0;
  }

  private formatDate(date: Date, locale: AppLocale): string {
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }
}
