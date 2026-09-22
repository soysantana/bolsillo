import { Component, OnInit } from '@angular/core';
import { FinanceStore } from '../../core/services/finance-store.service';
import { Budget, Payment, localDate } from '../../core/models/finance.models';
import { PaymentReminderService } from '../../core/services/payment-reminder.service';
@Component({
  selector: 'app-plan',
  standalone: false,
  templateUrl: './plan.component.html',
  styleUrl: './plan.component.scss',
})
export class PlanComponent implements OnInit {
  budgetName = '';
  budgetLimit: number | null = 0;
  addingGoal = false;
  goalName = '';
  goalTarget: number | null = null;
  contributionGoal: number | null = null;
  contributionAmount: number | null = null;
  removingGoal: number | null = null;
  addingPayment = false;
  paymentName = '';
  paymentAmount: number | null = null;
  paymentDate = localDate();
  removingPayment: Payment | null = null;
  readonly today = localDate();
  formError = '';
  budgetError = '';
  constructor(
    readonly store: FinanceStore,
    private readonly reminders: PaymentReminderService,
  ) {}
  ngOnInit(): void {
    void this.reminders.sync(this.store.payments());
  }
  percentage(spent: number, limit: number): number {
    return limit > 0 ? Math.round((spent / limit) * 100) : 0;
  }
  progress(spent: number, limit: number): number {
    return Math.min(100, this.percentage(spent, limit));
  }
  changeMonth(value: string): void {
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) this.store.selectedMonth.set(value);
  }
  editBudget(budget: Budget): void {
    this.budgetName = budget.name;
    this.budgetLimit = budget.limit;
    this.budgetError = '';
  }
  cancelBudget(): void {
    this.budgetName = '';
    this.budgetLimit = 0;
    this.budgetError = '';
  }
  saveBudget(): void {
    if (this.budgetLimit !== null && this.store.setBudget(this.budgetName, this.budgetLimit)) {
      this.cancelBudget();
      this.store.notice.set('Límite mensual actualizado.');
      void this.reminders.checkBudgetAlerts(this.store.budgets());
    } else
      this.budgetError = this.store.error() || 'Escribe un límite válido, mayor o igual a cero.';
  }
  saveGoal(): void {
    if (this.goalTarget !== null && this.store.addGoal(this.goalName, this.goalTarget)) {
      this.addingGoal = false;
      this.goalName = '';
      this.goalTarget = null;
      this.formError = '';
    } else
      this.formError =
        this.store.error() ||
        'Escribe un nombre y una meta mayor que cero, con hasta dos decimales.';
  }
  saveContribution(): void {
    if (
      this.contributionGoal !== null &&
      this.contributionAmount !== null &&
      this.store.contribute(this.contributionGoal, this.contributionAmount)
    ) {
      this.contributionGoal = null;
      this.contributionAmount = null;
      this.formError = '';
      this.store.notice.set('Aporte reservado para tu meta.');
    } else
      this.formError =
        this.store.error() ||
        'El aporte debe ser mayor que cero y no superar el saldo disponible ni lo que falta para la meta.';
  }
  release(id: number): void {
    if (this.store.releaseGoal(id)) {
      this.removingGoal = null;
      this.store.notice.set('Meta eliminada. Sus reservas vuelven al saldo disponible.');
    }
  }
  openPaymentModal(): void {
    this.addingPayment = true;
    this.formError = '';
  }
  cancelPaymentModal(): void {
    this.addingPayment = false;
    this.paymentName = '';
    this.paymentAmount = null;
    this.paymentDate = localDate();
    this.formError = '';
  }
  async savePayment(): Promise<void> {
    const existingIds = new Set(this.store.payments().map((payment) => payment.id));
    if (
      this.paymentAmount !== null &&
      this.store.addPayment(
        this.paymentName,
        this.paymentAmount,
        this.paymentDate,
        this.store.account().id,
      )
    ) {
      this.addingPayment = false;
      this.paymentName = '';
      this.paymentAmount = null;
      this.paymentDate = localDate();
      this.formError = '';
      const payment = this.store.payments().find((item) => !existingIds.has(item.id));
      if (!payment) {
        this.store.notice.set('Pago guardado.');
        return;
      }
      const result = await this.reminders.schedule(payment);
      if (result === 'scheduled') {
        this.store.notice.set('Pago guardado. Te avisaremos un día antes y el mismo día.');
      } else if (result === 'denied') {
        this.store.notice.set('Pago guardado sin recordatorio. Activa notificaciones en Ajustes.');
      } else if (result === 'none') {
        this.store.notice.set('Pago guardado. No hay recordatorios futuros para esa fecha.');
      } else {
        this.store.notice.set('Pago guardado.');
      }
    } else
      this.formError =
        this.store.error() || 'Revisa el nombre, el monto, la fecha y la cuenta del pago.';
  }
  async pay(id: number): Promise<void> {
    if (this.store.pay(id)) {
      await this.reminders.cancel(id);
      this.store.notice.set('Pago registrado como gasto en Servicios.');
    }
  }
  async removePayment(id: number): Promise<void> {
    if (this.store.removePayment(id)) {
      this.removingPayment = null;
      await this.reminders.cancel(id);
      this.store.notice.set('Pago pendiente eliminado.');
    }
  }
  requestRemovePayment(payment: Payment): void {
    this.removingPayment = payment;
  }
  cancelRemovePayment(): void {
    this.removingPayment = null;
  }
}
