import { computed, Injectable, signal } from '@angular/core';

export type CampaignPlacement = 'banner' | 'modal';
export type CampaignTone = 'feature' | 'tip' | 'gift';

export interface CampaignAction {
  label: string;
  response: string;
}

export interface CampaignMessage {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  imageAlt: string;
  placement: CampaignPlacement;
  tone: CampaignTone;
  primary: CampaignAction;
  secondary?: CampaignAction;
}

const RESPONSES_KEY = 'bolsillo-campaign-responses';

@Injectable({ providedIn: 'root' })
export class CampaignMessageService {
  private readonly responses = signal<Record<string, string>>(this.savedResponses());
  private readonly openedMessageId = signal<string | null>(null);

  readonly messages = signal<CampaignMessage[]>([
    {
      id: 'split-expenses-feedback',
      eyebrow: 'Pregunta rápida',
      title: '¿Te gustaría dividir gastos con otra persona?',
      body: 'Estoy pensando una función para compartir un gasto, marcar quién pagó y ver cuánto falta por saldar.',
      imageAlt: 'Vista previa animada de dos personas dividiendo un gasto',
      placement: 'modal',
      tone: 'feature',
      primary: { label: 'Sí, la usaría', response: 'interested' },
      secondary: { label: 'Ahora no', response: 'not_now' },
    },
    {
      id: 'weekly-cleanup-tip',
      eyebrow: 'Idea para tu semana',
      title: 'Tres minutos hoy pueden salvarte el cierre del mes',
      body: 'Revisa tus últimos movimientos y deja tu saldo listo antes de que se acumulen los gastos pequeños.',
      imageAlt: 'Tarjeta visual con movimientos ordenados',
      placement: 'banner',
      tone: 'tip',
      primary: { label: 'Revisar movimientos', response: 'open_transactions' },
      secondary: { label: 'Luego', response: 'dismissed' },
    },
  ]);

  readonly visibleMessages = computed(() =>
    this.messages().filter((message) => !this.responses()[message.id]),
  );
  readonly banner = computed(
    () => this.visibleMessages().find((message) => message.placement === 'banner') ?? null,
  );
  readonly modal = computed(() => {
    const openedId = this.openedMessageId();
    if (openedId) {
      return this.visibleMessages().find((message) => message.id === openedId) ?? null;
    }
    return this.visibleMessages().find((message) => message.placement === 'modal') ?? null;
  });

  open(message: CampaignMessage): void {
    this.openedMessageId.set(message.id);
  }

  respond(message: CampaignMessage, action: CampaignAction): void {
    const next = { ...this.responses(), [message.id]: action.response };
    this.responses.set(next);
    localStorage.setItem(RESPONSES_KEY, JSON.stringify(next));
    if (this.openedMessageId() === message.id) this.openedMessageId.set(null);
  }

  close(message: CampaignMessage): void {
    this.respond(message, message.secondary ?? { label: 'Cerrar', response: 'dismissed' });
  }

  resetDemo(): void {
    this.responses.set({});
    localStorage.removeItem(RESPONSES_KEY);
    this.openedMessageId.set(null);
  }

  private savedResponses(): Record<string, string> {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(RESPONSES_KEY) ?? '{}');
      return value && typeof value === 'object' ? (value as Record<string, string>) : {};
    } catch {
      return {};
    }
  }
}
