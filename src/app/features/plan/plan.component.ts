import { Component } from '@angular/core';
import { FinanceStore } from '../../core/services/finance-store.service';
import { Budget, localDate } from '../../core/models/finance.models';
@Component({
  selector: 'app-plan',
  standalone: false,
  templateUrl: './plan.component.html',
  styleUrl: './plan.component.scss',
})
export class PlanComponent {
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
  readonly today = localDate();
  formError = '';
  budgetError = '';
  constructor(readonly store: FinanceStore) {}
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
  savePayment(): void {
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
      this.formError = '';
    } else
      this.formError =
        this.store.error() || 'Revisa el nombre, el monto, la fecha y la cuenta del pago.';
  }
  pay(id: number): void {
    if (this.store.pay(id)) this.store.notice.set('Pago registrado como gasto en Servicios.');
  }
}
