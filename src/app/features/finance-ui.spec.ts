import { ProfileModule } from './profile/profile.module';
import { PlanModule } from './plan/plan.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { TransactionsModule } from './transactions/transactions.module';
import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { ModalController, ToastController } from '@ionic/angular';
import { SharedModule } from '../shared/shared.module';
import { ProfileComponent } from './profile/profile.component';
import { PlanComponent } from './plan/plan.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { TransactionsComponent } from './transactions/transactions.component';
import { AddTransactionSheetComponent } from '../shared/components/add-transaction-sheet/add-transaction-sheet.component';
import { FinanceStore } from '../core/services/finance-store.service';

describe('Finance screens', () => {
  let modalCreate: ReturnType<typeof vi.fn>;
  let toastCreate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    localStorage.clear();
    modalCreate = vi.fn().mockResolvedValue({
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({}),
    });
    toastCreate = vi.fn().mockResolvedValue({
      present: vi.fn().mockResolvedValue(undefined),
      dismiss: vi.fn().mockResolvedValue(true),
    });
    await TestBed.configureTestingModule({
      imports: [
        SharedModule,
        RouterModule.forRoot([]),
        ProfileModule,
        PlanModule,
        DashboardModule,
        TransactionsModule,
      ],
      providers: [
        {
          provide: ModalController,
          useValue: { create: modalCreate, dismiss: vi.fn().mockResolvedValue(true) },
        },
        { provide: ToastController, useValue: { create: toastCreate } },
      ],
    }).compileComponents();
  });
  afterEach(() => localStorage.clear());
  it('presents Face ID as upcoming while notifications are available for payment reminders', async () => {
    const fixture = TestBed.createComponent(ProfileComponent);
    await fixture.whenStable();
    const futureRows = fixture.nativeElement.querySelectorAll('.future-row');
    expect(futureRows).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Recordatorios de pagos pendientes');
    expect(futureRows[0].textContent).toContain('Face ID');
    expect(futureRows[0].textContent).toContain('Próximamente');
    expect(futureRows[0].querySelector('button, input, [role="switch"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Cuentas conectadas');
    expect(fixture.nativeElement.textContent).not.toContain('Agregar cuenta');
  });
  it('updates the dashboard after the user saves their profile name', async () => {
    const fixture = TestBed.createComponent(ProfileComponent);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.profile-card button').click();
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[name="name"]');
    input.value = 'Arturo Santana';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    const dashboard = TestBed.createComponent(DashboardComponent);
    await dashboard.whenStable();
    expect(dashboard.nativeElement.querySelector('h1').textContent).toBe('Arturo Santana');
    expect(dashboard.nativeElement.querySelector('.avatar').textContent).toContain('AS');
  });
  it('shows budget overages above 100 percent', async () => {
    const store = TestBed.inject(FinanceStore);
    store.selectedMonth.set('2025-01');
    store.setBudget('Comida', 10);
    store.addTransaction({
      kind: 'expense',
      category: 'Comida',
      amount: 15,
      date: '2025-01-15',
      merchant: 'Compra',
      accountId: 1,
    });
    const fixture = TestBed.createComponent(PlanComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('150%');
    expect(fixture.nativeElement.querySelector('.over-budget').textContent).toContain('Excedido');
  });
  it('filters movements by month and type without showing search or category controls', async () => {
    const store = TestBed.inject(FinanceStore);
    store.selectedMonth.set('2025-01');
    store.addTransaction({
      kind: 'income',
      category: 'Nómina',
      amount: 150,
      date: '2025-01-15',
      merchant: 'Pago nómina',
      accountId: 1,
    });
    store.addTransaction({
      kind: 'expense',
      category: 'Comida',
      amount: 15,
      date: '2025-01-15',
      merchant: 'Compra',
      accountId: 1,
    });
    const fixture = TestBed.createComponent(TransactionsComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.search-field')).toBeNull();
    expect(fixture.nativeElement.querySelector('.category-filter')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Gastos del mes');
    expect(fixture.componentInstance.visibleTransactions()).toHaveLength(2);
    fixture.componentInstance.filter.set('expense');
    await fixture.whenStable();
    expect(fixture.componentInstance.visibleTransactions()).toHaveLength(1);
    expect(fixture.componentInstance.visibleTransactions()[0].kind).toBe('expense');
    fixture.componentInstance.changeMonth('2025-02');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No hay movimientos');
  });
  it('keeps delete behind confirmation and offers undo after removal', async () => {
    const store = TestBed.inject(FinanceStore);
    store.selectedMonth.set('2025-01');
    store.addTransaction({
      kind: 'expense',
      category: 'Comida',
      amount: 15,
      date: '2025-01-15',
      merchant: 'Compra',
      accountId: 1,
    });
    const fixture = TestBed.createComponent(TransactionsComponent);
    await fixture.whenStable();
    const transaction = store.transactions()[0];
    await fixture.componentInstance.requestDelete(transaction);
    expect(store.transactions()).toHaveLength(1);
    expect(fixture.componentInstance.pendingDelete()).toEqual(transaction);
    await fixture.componentInstance.remove();
    expect(store.transactions()).toHaveLength(0);
    const toastOptions = toastCreate.mock.calls[0][0];
    toastOptions.buttons[0].handler();
    expect(store.transactions()).toHaveLength(1);
  });
  it('opens an existing movement with its date and account ready to edit', async () => {
    const store = TestBed.inject(FinanceStore);
    store.addTransaction({
      kind: 'income',
      category: 'Nómina',
      amount: 150,
      date: '2025-01-15',
      merchant: 'Pago nómina',
      accountId: 1,
    });
    const fixture = TestBed.createComponent(AddTransactionSheetComponent);
    fixture.componentRef.setInput('transaction', store.transactions()[0]);
    await fixture.whenStable();
    expect(fixture.componentInstance.form.controls.date.value).toBe('2025-01-15');
    expect(fixture.componentInstance.kind()).toBe('income');
    expect(fixture.nativeElement.textContent).toContain('Guardar cambios');
  });
});
