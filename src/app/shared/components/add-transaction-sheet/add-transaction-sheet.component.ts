import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { ModalController } from '@ionic/angular';
import { FinanceStore } from '../../../core/services/finance-store.service';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  Transaction,
  TransactionKind,
  localDate,
} from '../../../core/models/finance.models';
@Component({
  selector: 'app-add-transaction-sheet',
  standalone: false,
  templateUrl: './add-transaction-sheet.component.html',
  styleUrl: './add-transaction-sheet.component.scss',
})
export class AddTransactionSheetComponent implements OnInit {
  @Input() transaction?: Transaction;
  private readonly formBuilder = inject(FormBuilder);
  private readonly modalController = inject(ModalController);
  readonly store = inject(FinanceStore);
  readonly kind = signal<TransactionKind>('expense');
  readonly today = localDate();
  readonly saving = signal(false);
  readonly error = signal('');
  get categories() {
    const items = this.kind() === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    const current = this.form.controls.category.value;
    return items.some((c) => c.name === current)
      ? items
      : [...items, { name: current, icon: 'receipt', color: 'mint' }];
  }
  readonly form = this.formBuilder.nonNullable.group({
    amount: [
      null as number | null,
      [Validators.required, Validators.min(0.01), Validators.max(1e12)],
    ],
    merchant: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    category: ['Comida', Validators.required],
    date: [localDate(), Validators.required],
    accountId: [this.store.account().id, Validators.required],
  });
  ngOnInit(): void {
    if (this.transaction) {
      this.kind.set(this.transaction.kind);
      this.form.patchValue(this.transaction);
    }
  }
  selectKind(kind: TransactionKind): void {
    this.kind.set(kind);
    this.form.controls.category.setValue(kind === 'expense' ? 'Comida' : 'Nómina');
  }
  selectCategory(category: string): void {
    this.form.controls.category.setValue(category);
  }
  close(): void {
    void this.modalController.dismiss();
  }
  async save(): Promise<void> {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const value = this.form.getRawValue();
    if (
      !this.store.addTransaction(
        { ...value, amount: Number(value.amount), kind: this.kind() },
        this.transaction?.id,
      )
    ) {
      this.error.set(this.store.error());
      this.saving.set(false);
      return;
    }
    this.store.notice.set(this.transaction ? 'Movimiento actualizado.' : 'Movimiento guardado.');
    void Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
    await this.modalController.dismiss({ created: true });
  }
}
