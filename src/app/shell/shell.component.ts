import { FinanceStore } from '../core/services/finance-store.service';
import { Component, effect, inject } from '@angular/core';
import {
  CampaignAction,
  CampaignMessage,
  CampaignMessageService,
} from '../core/services/campaign-message.service';
import { MobileViewportService } from '../core/services/mobile-viewport.service';
import { PaymentReminderService } from '../core/services/payment-reminder.service';
import { BrowserPushService } from '../core/services/browser-push.service';
import { App as CapacitorApp } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { ModalController } from '@ionic/angular';
import { AddTransactionSheetComponent } from '../shared/components/add-transaction-sheet/add-transaction-sheet.component';

@Component({
  selector: 'app-shell',
  standalone: false,
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly viewport = inject(MobileViewportService);
  constructor(
    readonly store: FinanceStore,
    readonly campaigns: CampaignMessageService,
    private readonly reminders: PaymentReminderService,
    private readonly browserPush: BrowserPushService,
    private readonly modalController: ModalController,
  ) {
    void this.reminders.refreshPermissionStatus();
    void this.reminders.sync(
      this.store.payments(),
      this.store.transactions(),
      this.store.budgets(),
    );
    void this.browserPush.initializeOnOpen(this.store.payments());
    void CapacitorApp.addListener('resume', () => {
      void this.reminders.refreshPermissionStatus();
    }).catch(() => undefined);
    effect((onCleanup) => {
      const message = this.store.notice();
      if (!message) return;
      const timer = setTimeout(() => {
        if (this.store.notice() === message) this.store.notice.set('');
      }, 4500);
      onCleanup(() => clearTimeout(timer));
    });
  }

  async openAddTransaction(): Promise<void> {
    void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined);
    const modal = await this.modalController.create({
      component: AddTransactionSheetComponent,
      cssClass: 'transaction-modal',
    });
    await modal.present();
  }

  handleCampaignAction(message: CampaignMessage, action: CampaignAction): void {
    this.campaigns.respond(message, action);
    if (action.response === 'open_transactions') {
      this.store.notice.set('Perfecto. Puedes revisar tus movimientos cuando quieras.');
      return;
    }
    if (action.response === 'interested') {
      this.store.notice.set('Gracias. Guardé tu interés en esta idea.');
      return;
    }
    this.store.notice.set('Listo. No volveremos a mostrarte este mensaje.');
  }
}
