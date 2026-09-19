import { TestBed } from '@angular/core/testing';
import { FinanceStore } from './finance-store.service';
import { FinanceData, NewTransaction } from '../models/finance.models';

describe('FinanceStore', () => {
  let store: FinanceStore;
  const movement = (changes: Partial<NewTransaction> = {}): NewTransaction => ({
    amount: 25.5,
    merchant: 'Compra',
    category: 'Comida',
    kind: 'expense',
    date: '2025-01-15',
    accountId: 1,
    ...changes,
  });
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    store = TestBed.inject(FinanceStore);
    store.selectedMonth.set('2025-01');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('starts without invented balances, expenses or savings', () => {
    expect(store.totalBalance()).toBe(0);
    expect(store.transactions()).toEqual([]);
    expect(store.goals()).toEqual([]);
  });
  it('filters monthly expenses and recalculates budgets after editing and deleting', () => {
    store.setBudget('Comida', 100);
    store.addTransaction(movement());
    const transaction = store.transactions()[0];
    store.addTransaction(movement({ date: '2024-12-20', amount: 40 }));
    expect(store.monthExpenses()).toBe(25.5);
    expect(store.budgetSpent()).toBe(25.5);
    store.addTransaction(movement({ amount: 35, category: 'Salud' }), transaction.id);
    expect(store.budgetSpent()).toBe(0);
    expect(store.monthExpenses()).toBe(35);
    store.deleteTransaction(transaction.id);
    expect(store.monthExpenses()).toBe(0);
    expect(store.totalBalance()).toBe(-40);
  });
  it('keeps one manual account and preserves cents', () => {
    store.saveAccount('Mi cuenta', 100);
    store.addTransaction(movement({ amount: 0.1 }));
    store.addTransaction(movement({ amount: 0.2 }));
    expect(store.accountBalance(1)).toBe(99.7);
    expect(store.accounts()).toHaveLength(1);
    expect(store.totalBalance()).toBe(99.7);
  });
  it('restores a deleted transaction without doubling it', () => {
    store.addTransaction(movement());
    const transaction = store.transactions()[0];
    store.deleteTransaction(transaction.id);
    store.restoreTransaction(transaction);
    store.restoreTransaction(transaction);
    expect(store.transactions().length).toBe(1);
    expect(store.monthExpenses()).toBe(25.5);
  });
  it('reserves goal contributions without changing the account balance', () => {
    store.saveAccount('Mi cuenta', 100);
    store.addGoal('Viaje', 80);
    const id = store.goals()[0].id;
    expect(store.contribute(id, 60)).toBe(true);
    expect(store.available()).toBe(40);
    expect(store.totalBalance()).toBe(100);
    expect(store.contribute(id, 50)).toBe(false);
    expect(store.goalSaved(id)).toBe(60);
    store.releaseGoal(id);
    expect(store.available()).toBe(100);
  });
  it('records payment and removes pending reminder atomically', () => {
    store.addPayment('Internet', 50, '2025-01-20', 1);
    const id = store.payments()[0].id;
    expect(store.totalBalance()).toBe(0);
    expect(store.pay(id)).toBe(true);
    expect(store.payments()).toHaveLength(0);
    expect(store.transactions()).toHaveLength(1);
    expect(store.totalBalance()).toBe(-50);
    expect(store.pay(id)).toBe(false);
  });
  it('rejects invalid or future movements without storing them', () => {
    for (const changes of [
      { amount: NaN },
      { amount: Infinity },
      { amount: -10 },
      { amount: 0.001 },
      { accountId: 999 },
      { date: '2025-02-30' },
      { date: '2999-01-01' },
      { merchant: '  ' },
    ]) {
      expect(store.addTransaction(movement(changes))).toBe(false);
    }
    expect(store.transactions()).toHaveLength(0);
  });
  it('persists hidden balances and actual dates across reloads', () => {
    store.addTransaction(movement());
    store.toggleBalances();
    store.updateName('Ana Pérez');
    TestBed.resetTestingModule();
    const restored = TestBed.inject(FinanceStore);
    expect(restored.name()).toBe('Ana Pérez');
    expect(restored.hideBalances()).toBe(true);
    expect(restored.formatMoney(100)).toBe('••••••');
    expect(restored.transactions()[0].date).toBe('2025-01-15');
  });
  it('validates imported backups and preserves existing records on failure', () => {
    store.addTransaction(movement());
    const original = store.backup();
    expect(store.importBackup('{')).toBe(false);
    const corrupted = JSON.parse(original) as FinanceData;
    corrupted.transactions[0].accountId = 999;
    expect(store.importBackup(JSON.stringify(corrupted))).toBe(false);
    expect(store.backup()).toBe(original);
    store.deleteTransaction(store.transactions()[0].id);
    expect(store.importBackup(original)).toBe(true);
    expect(store.transactions()).toHaveLength(1);
  });
  it('consolidates older multi-account backups into Mi cuenta', () => {
    const backup = JSON.parse(store.backup()) as FinanceData;
    backup.accounts = [
      { id: 1, name: 'Efectivo', openingBalance: 100 },
      { id: 2, name: 'Banco', openingBalance: 250 },
    ];
    backup.transactions.push({
      ...movement({ accountId: 2, kind: 'income', amount: 50 }),
      id: 99,
      icon: 'income',
      color: 'lime',
    });
    expect(store.importBackup(JSON.stringify(backup))).toBe(true);
    expect(store.accounts()).toEqual([{ id: 1, name: 'Mi cuenta', openingBalance: 350 }]);
    expect(store.transactions()[0].accountId).toBe(1);
    expect(store.totalBalance()).toBe(400);
  });
  it('does not mutate in-memory balances if storage fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota');
    });
    expect(store.addTransaction(movement())).toBe(false);
    expect(store.transactions()).toEqual([]);
    expect(store.error()).toContain('No se pudo guardar');
  });
  it('migrates legacy records without deleting source data', () => {
    const legacy = JSON.stringify([
      {
        id: 1750000000000,
        merchant: 'Compra anterior',
        category: 'Comida',
        amount: 50,
        kind: 'expense',
        date: 'Ahora mismo',
        icon: 'basket',
        color: 'mint',
      },
    ]);
    localStorage.setItem('bolsillo-transactions', legacy);
    TestBed.resetTestingModule();
    const migrated = TestBed.inject(FinanceStore);
    expect(migrated.transactions()).toHaveLength(1);
    expect(migrated.transactions()[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(migrated.notice()).toContain('Revisa sus fechas');
    expect(localStorage.getItem('bolsillo-transactions')).toBe(legacy);
  });
  it('does not overwrite unreadable saved data with an empty state', () => {
    localStorage.setItem('bolsillo-v2', '{broken');
    TestBed.resetTestingModule();
    const recovered = TestBed.inject(FinanceStore);
    expect(recovered.addTransaction(movement())).toBe(false);
    expect(localStorage.getItem('bolsillo-v2')).toBe('{broken');
    expect(recovered.importBackup(store.backup())).toBe(true);
    expect(recovered.addTransaction(movement())).toBe(true);
  });
});
