import { FinanceStore } from '../core/services/finance-store.service';
import { Component, effect, inject } from '@angular/core';
import { MobileViewportService } from '../core/services/mobile-viewport.service';
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
    private readonly modalController: ModalController,
  ) {
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
}
