import { Component, computed, signal } from '@angular/core';
import { IonItemSliding, ModalController, ToastController } from '@ionic/angular';
import { Transaction, TransactionKind } from '../../core/models/finance.models';
import { FinanceStore } from '../../core/services/finance-store.service';
import { AddTransactionSheetComponent } from '../../shared/components/add-transaction-sheet/add-transaction-sheet.component';
@Component({
  selector: 'app-transactions',
  standalone: false,
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss',
})
export class TransactionsComponent {
  readonly filter = signal<'all' | TransactionKind>('all');
  readonly pendingDelete = signal<Transaction | null>(null);
  readonly deleteError = signal('');
  private actionOpen = false;
  private undoToast?: HTMLIonToastElement;
  readonly visibleTransactions = computed(() =>
    this.store.monthTransactions().filter((transaction) => {
      const filter = this.filter();
      return filter === 'all' || transaction.kind === filter;
    }),
  );
  constructor(
    readonly store: FinanceStore,
    private readonly modalController: ModalController,
    private readonly toastController: ToastController,
  ) {}
  changeMonth(value: string): void {
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
      this.store.selectedMonth.set(value);
    }
  }
  async edit(transaction: Transaction, sliding?: IonItemSliding): Promise<void> {
    if (this.actionOpen) return;
    this.actionOpen = true;
    try {
      await sliding?.close();
      const modal = await this.modalController.create({
        component: AddTransactionSheetComponent,
        componentProps: { transaction },
        cssClass: 'transaction-modal',
      });
      await modal.present();
      await modal.onDidDismiss();
    } finally {
      this.actionOpen = false;
    }
  }
  async requestDelete(transaction: Transaction, sliding?: IonItemSliding): Promise<void> {
    if (this.actionOpen) return;
    this.actionOpen = true;
    await sliding?.close();
    this.deleteError.set('');
    this.pendingDelete.set(transaction);
  }
  cancelDelete(): void {
    this.pendingDelete.set(null);
    this.actionOpen = false;
    this.deleteError.set('');
  }
  async remove(): Promise<void> {
    const transaction = this.pendingDelete();
    if (!transaction) return;
    if (!this.store.deleteTransaction(transaction.id)) {
      this.deleteError.set(this.store.error());
      return;
    }
    this.cancelDelete();
    await this.undoToast?.dismiss();
    this.undoToast = await this.toastController.create({
      message: 'Movimiento eliminado',
      duration: 4500,
      position: 'bottom',
      positionAnchor: 'main-navigation',
      cssClass: 'undo-toast',
      buttons: [
        {
          text: 'Deshacer',
          handler: () => {
            this.store.restoreTransaction(transaction);
          },
        },
      ],
    });
    await this.undoToast.present();
  }
}
