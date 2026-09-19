import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-month-navigation',
  standalone: true,
  imports: [IconComponent],
  template: `
    <nav class="month-navigation" aria-label="Elegir mes">
      <button type="button" aria-label="Mes anterior" (click)="move(-1)"><app-icon class="previous" name="chevron" /></button>
      <span aria-live="polite">{{ label }}</span>
      <button type="button" aria-label="Mes siguiente" (click)="move(1)"><app-icon name="chevron" /></button>
    </nav>
  `,
  styles: [`
    :host { display: block; min-width: 0; margin-bottom: 18px; }
    .month-navigation { display: grid; grid-template-columns: 44px minmax(0, 1fr) 44px; align-items: center; padding: 4px; border: 1px solid var(--wallet-line); border-radius: 17px; background: #fff; }
    button { display: grid; place-items: center; width: 44px; height: 44px; padding: 0; border: 0; border-radius: 12px; background: transparent; color: var(--wallet-ink); }
    button:active { background: var(--wallet-soft); }
    span { min-width: 0; text-align: center; font-size: 14px; font-weight: 700; text-transform: capitalize; }
    .previous { transform: rotate(180deg); }
  `],
})
export class MonthNavigationComponent {
  @Input({ required: true }) value = '';
  @Output() valueChange = new EventEmitter<string>();
  get label(): string {
    return new Date(`${this.value}-01T12:00:00`).toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
  }
  move(direction: number): void {
    const date = new Date(`${this.value}-01T12:00:00`);
    date.setMonth(date.getMonth() + direction);
    if (date.getFullYear() < 1900 || date.getFullYear() > 9999) return;
    this.valueChange.emit(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }
}
