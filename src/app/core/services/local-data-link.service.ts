import { Injectable, computed, inject, signal } from '@angular/core';
import { FinanceStore } from './finance-store.service';

const PENDING_LINK_KEY = 'bolsillo.pendingLocalDataLink';

export interface PendingLocalDataLink {
  email: string;
  requestedAt: string;
}

@Injectable({ providedIn: 'root' })
export class LocalDataLinkService {
  private readonly store = inject(FinanceStore);
  private readonly pending = signal<PendingLocalDataLink | null>(this.readPendingLink());

  readonly pendingLink = this.pending.asReadonly();
  readonly hasPendingLink = computed(() => this.pending() !== null);

  hasLocalDataToLink(): boolean {
    return this.store.hasMeaningfulLocalData();
  }

  requestLink(email: string): void {
    const pending: PendingLocalDataLink = {
      email,
      requestedAt: new Date().toISOString(),
    };
    this.pending.set(pending);
    this.writePendingLink(pending);
  }

  clearPendingLink(): void {
    this.pending.set(null);
    try {
      localStorage.removeItem(PENDING_LINK_KEY);
    } catch {
      // Storage can be unavailable in private browsing contexts.
    }
  }

  private readPendingLink(): PendingLocalDataLink | null {
    try {
      const stored = localStorage.getItem(PENDING_LINK_KEY);
      if (!stored) return null;
      const parsed: unknown = JSON.parse(stored);
      if (!parsed || typeof parsed !== 'object') return null;
      const value = parsed as PendingLocalDataLink;
      if (typeof value.email !== 'string' || typeof value.requestedAt !== 'string') return null;
      return value;
    } catch {
      return null;
    }
  }

  private writePendingLink(pending: PendingLocalDataLink): void {
    try {
      localStorage.setItem(PENDING_LINK_KEY, JSON.stringify(pending));
    } catch {
      // The in-memory signal still keeps the choice for the current app session.
    }
  }
}
