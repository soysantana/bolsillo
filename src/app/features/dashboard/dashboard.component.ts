import { Component } from '@angular/core';
import { FinanceStore } from '../../core/services/finance-store.service';
@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  constructor(readonly store: FinanceStore) {}
  get greeting(): string {
    const hour = new Date().getHours();
    return hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  }
  barHeight(amount: number): number {
    return amount
      ? Math.max(4, (amount / Math.max(...this.store.weekDays().map((d) => d.amount), 1)) * 62)
      : 0;
  }
}
