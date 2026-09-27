import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FinanceStore } from '../../core/services/finance-store.service';
import { localDate } from '../../core/models/finance.models';
import { PaymentReminderService } from '../../core/services/payment-reminder.service';
import { downloadFile } from '../../shared/download';
@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  editingName = false;
  name = '';
  editingAccount = false;
  openingBalance: number | null = 0;
  helpOpen = false;
  feedbackOpen = false;
  privacyOpen = false;
  deleteAccountOpen = false;
  deletingAccount = false;
  formError = '';
  pendingBackup = '';
  backupName = '';
  importing = false;
  constructor(
    readonly store: FinanceStore,
    readonly reminders: PaymentReminderService,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}
  ngOnInit(): void {
    void this.reminders.refreshPermissionStatus();
  }
  editName(): void {
    this.name = this.store.name();
    this.editingName = true;
    this.formError = '';
  }

  async togglePaymentReminders(): Promise<void> {
    if (this.reminders.enabled()) {
      await this.reminders.disable(this.store.payments());
      this.store.notice.set('Notificaciones desactivadas.');
      return;
    }
    const result = await this.reminders.enable(
      this.store.payments(),
      this.store.transactions(),
      this.store.budgets(),
    );
    if (result === 'denied') {
      this.store.notice.set('Notificaciones permítelas en Ajustes del iPhone para recibir avisos.');
    } else if (result === 'scheduled') {
      this.store.notice.set('Notificaciones activadas.');
    } else {
      this.store.notice.set('Notificaciones activadas.');
    }
  }

  async openNotificationSettings(): Promise<void> {
    const opened = await this.reminders.openSystemSettings();
    this.store.notice.set(
      opened
        ? 'Activa las notificaciones de Bolsillo en Ajustes del iPhone.'
        : 'Activa las notificaciones de Bolsillo desde Ajustes del iPhone.',
    );
  }
  saveName(): void {
    if (this.store.updateName(this.name)) {
      this.editingName = false;
      this.store.notice.set('Nombre actualizado.');
    } else this.formError = this.store.error() || 'Escribe un nombre de hasta 100 caracteres.';
  }
  editAccount(): void {
    this.openingBalance = this.store.account().openingBalance;
    this.editingAccount = true;
    this.formError = '';
  }
  saveAccount(): void {
    if (this.openingBalance !== null && this.store.saveAccount('Mi cuenta', this.openingBalance)) {
      this.editingAccount = false;
      this.store.notice.set('Cuenta guardada.');
    } else
      this.formError = this.store.error() || 'Escribe un saldo válido con hasta dos decimales.';
  }
  async exportBackup(): Promise<void> {
    this.formError = '';
    try {
      const result = await downloadFile(
        `bolsillo-respaldo-${localDate()}.json`,
        this.store.backup(),
        'application/json',
      );
      this.store.notice.set(
        result === 'opened'
          ? 'Puedes compartirla o guardarla para no perderla.'
          : result === 'saved' || result === 'shared'
            ? 'Guardado en Bolsillo. ¡Puedes compartirlo cuando gustes!'
            : 'Tu copia está lista. Guárdala en un lugar seguro.',
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      this.store.notice.set('No pudimos crear la copia. Inténtalo otra vez.');
    }
  }

  async inviteFriend(): Promise<void> {
    const share = {
      title: 'Bolsillo',
      text: 'Estoy usando Bolsillo para organizar mi dinero de forma simple.',
      url: window.location.origin,
    };
    try {
      if (navigator.share) {
        await navigator.share(share);
        return;
      }
      await navigator.clipboard.writeText(`${share.text} ${share.url}`);
      this.store.notice.set('Invitación copiada. Ya puedes compartirla.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      this.store.notice.set('No pudimos abrir las opciones para compartir.');
    }
  }

  openFeedback(channel: 'email' | 'instagram' | 'whatsapp'): void {
    const message = this.feedbackMessage();
    const encodedMessage = encodeURIComponent(message);
    this.feedbackOpen = false;
    if (channel === 'email') {
      window.location.href = `mailto:santana.inffo@gmail.com?subject=${encodeURIComponent('Feedback de Bolsillo')}&body=${encodedMessage}`;
      return;
    }
    const url =
      channel === 'whatsapp'
        ? `https://wa.me/18094511877?text=${encodedMessage}`
        : 'https://ig.me/m/soysantana2';
    window.open(url, '_blank', 'noopener');
  }

  private feedbackMessage(): string {
    return [
      'Hola, quiero compartir este comentario sobre Bolsillo:',
      '',
      '',
      '---',
      `Plataforma: ${this.platformLabel()}`,
    ].join('\n');
  }

  private platformLabel(): string {
    const userAgent = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS web';
    if (/Android/i.test(userAgent)) return 'Android web';
    return 'Web';
  }

  async selectBackup(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.pendingBackup = '';
    this.formError = '';
    if (!file) return;
    if (file.size > 5_000_000) {
      this.formError = 'El respaldo debe pesar menos de 5 MB.';
      input.value = '';
      return;
    }
    this.importing = true;
    try {
      this.pendingBackup = await file.text();
      this.backupName = file.name;
    } catch {
      this.formError = 'No se pudo leer el archivo.';
    } finally {
      input.value = '';
      this.importing = false;
      this.changeDetector.markForCheck();
    }
  }
  restore(): void {
    if (this.store.importBackup(this.pendingBackup)) {
      this.pendingBackup = '';
      this.store.notice.set('Respaldo restaurado.');
    } else this.formError = this.store.error();
  }
}
