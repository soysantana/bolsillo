import { Injectable, computed, signal } from '@angular/core';
import {
  EXPENSE_CATEGORIES,
  FinanceData,
  NewTransaction,
  Transaction,
  localDate,
} from '../models/finance.models';

const KEY = 'bolsillo-v2';
const cents = (value: number) => Math.round(value * 100) / 100;
const validAmount = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  Math.abs(value) <= 1e12 &&
  cents(value) === value;
const validDate = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  localDate(new Date(`${value}T12:00:00`)) === value;
const validName = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= 100;

@Injectable({ providedIn: 'root' })
export class FinanceStore {
  readonly notice = signal('');
  readonly error = signal('');
  private recoveryRequired = false;
  private readonly data = signal<FinanceData>(this.load());
  readonly selectedMonth = signal(localDate().slice(0, 7));
  readonly transactions = computed(() =>
    [...this.data().transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id),
  );
  readonly accounts = computed(() => this.data().accounts);
  readonly account = computed(() => this.data().accounts[0]);
  readonly goals = computed(() => this.data().goals);
  readonly payments = computed(() =>
    [...this.data().payments].sort((a, b) => a.date.localeCompare(b.date)),
  );
  readonly name = computed(() => this.data().name);
  readonly initials = computed(() =>
    this.name()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase(),
  );
  readonly hideBalances = computed(() => this.data().hideBalances);
  readonly monthTransactions = computed(() =>
    this.transactions().filter((item) => item.date.startsWith(this.selectedMonth())),
  );
  readonly monthExpenses = computed(() =>
    cents(
      this.monthTransactions()
        .filter((item) => item.kind === 'expense')
        .reduce((sum, item) => sum + item.amount, 0),
    ),
  );
  readonly monthIncome = computed(() =>
    cents(
      this.monthTransactions()
        .filter((item) => item.kind === 'income')
        .reduce((sum, item) => sum + item.amount, 0),
    ),
  );
  readonly budgets = computed(() =>
    this.data().budgets.map((budget) => ({
      ...budget,
      spent: cents(
        this.monthTransactions()
          .filter((t) => t.kind === 'expense' && t.category === budget.name)
          .reduce((sum, t) => sum + t.amount, 0),
      ),
    })),
  );
  readonly budgetLimit = computed(() => cents(this.budgets().reduce((sum, b) => sum + b.limit, 0)));
  readonly budgetSpent = computed(() =>
    cents(
      this.budgets()
        .filter((b) => b.limit > 0)
        .reduce((sum, b) => sum + b.spent, 0),
    ),
  );
  readonly totalBalance = computed(() =>
    cents(this.accounts().reduce((sum, account) => sum + this.accountBalance(account.id), 0)),
  );
  readonly reserved = computed(() =>
    cents(this.goals().reduce((sum, goal) => sum + this.goalSaved(goal.id), 0)),
  );
  readonly available = computed(() => cents(this.totalBalance() - this.reserved()));
  readonly weekDays = computed(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6 + index);
      const key = localDate(date);
      return {
        date: key,
        label: date.toLocaleDateString('es-DO', { weekday: 'short' }),
        amount: cents(
          this.transactions()
            .filter((t) => t.kind === 'expense' && t.date === key)
            .reduce((sum, t) => sum + t.amount, 0),
        ),
      };
    });
  });
  readonly weekTotal = computed(() =>
    cents(this.weekDays().reduce((sum, day) => sum + day.amount, 0)),
  );

  private fresh(): FinanceData {
    return {
      version: 2,
      name: 'Mi perfil',
      hideBalances: false,
      accounts: [{ id: 1, name: 'Mi cuenta', openingBalance: 0 }],
      transactions: [],
      budgets: EXPENSE_CATEGORIES.map((c) => ({ ...c, limit: 0 })),
      goals: [],
      payments: [],
    };
  }

  private commit(next: FinanceData, restoring = false): boolean {
    if (this.recoveryRequired && !restoring) {
      this.error.set(
        'Los datos guardados no se pudieron leer. Restaura un respaldo válido antes de registrar cambios.',
      );
      return false;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      this.data.set(next);
      this.recoveryRequired = false;
      this.error.set('');
      return true;
    } catch {
      this.error.set('No se pudo guardar. Libera espacio en el dispositivo y vuelve a intentarlo.');
      return false;
    }
  }
  private id(): number {
    return (
      Math.max(
        Date.now(),
        ...this.transactions().map((t) => t.id),
        ...this.accounts().map((a) => a.id),
        ...this.goals().map((g) => g.id),
        ...this.payments().map((p) => p.id),
      ) + 1
    );
  }
  accountBalance(id: number): number {
    return cents(
      (this.accounts().find((a) => a.id === id)?.openingBalance ?? 0) +
        this.transactions()
          .filter((t) => t.accountId === id)
          .reduce((sum, t) => sum + (t.kind === 'income' ? t.amount : -t.amount), 0),
    );
  }
  accountName(id: number): string {
    return this.accounts().find((a) => a.id === id)?.name ?? 'Mi cuenta';
  }
  goalSaved(id: number): number {
    return cents(
      this.goals()
        .find((g) => g.id === id)
        ?.contributions.reduce((sum, c) => sum + c.amount, 0) ?? 0,
    );
  }
  addTransaction(input: NewTransaction, editingId?: number): boolean {
    if (
      !validAmount(input.amount) ||
      input.amount <= 0 ||
      !validDate(input.date) ||
      input.date > localDate() ||
      !validName(input.merchant) ||
      !validName(input.category) ||
      !['income', 'expense'].includes(input.kind) ||
      !this.accounts().some((a) => a.id === input.accountId)
    ) {
      this.error.set('Revisa el monto, la fecha, la descripción y la cuenta.');
      return false;
    }
    const meta = EXPENSE_CATEGORIES.find((c) => c.name === input.category);
    const transaction: Transaction = {
      ...input,
      amount: cents(input.amount),
      merchant: input.merchant.trim(),
      id: editingId ?? this.id(),
      icon: input.kind === 'income' ? 'income' : (meta?.icon ?? 'receipt'),
      color: input.kind === 'income' ? 'lime' : (meta?.color ?? 'mint'),
    };
    return this.commit({
      ...this.data(),
      transactions: [...this.transactions().filter((t) => t.id !== transaction.id), transaction],
    });
  }
  deleteTransaction(id: number): boolean {
    return this.commit({
      ...this.data(),
      transactions: this.transactions().filter((t) => t.id !== id),
    });
  }
  restoreTransaction(transaction: Transaction): boolean {
    return this.commit({
      ...this.data(),
      transactions: [...this.transactions().filter((t) => t.id !== transaction.id), transaction],
    });
  }
  toggleBalances(): void {
    this.commit({ ...this.data(), hideBalances: !this.hideBalances() });
  }
  updateName(name: string): boolean {
    return validName(name) && this.commit({ ...this.data(), name: name.trim() });
  }
  saveAccount(name: string, openingBalance: number): boolean {
    if (!validName(name) || !validAmount(openingBalance)) return false;
    const account = { id: this.account().id, name: name.trim(), openingBalance };
    return this.commit({
      ...this.data(),
      accounts: [account],
      transactions: this.transactions().map((transaction) => ({
        ...transaction,
        accountId: account.id,
      })),
      payments: this.payments().map((payment) => ({ ...payment, accountId: account.id })),
    });
  }
  setBudget(name: string, limit: number): boolean {
    return (
      validAmount(limit) &&
      limit >= 0 &&
      this.commit({
        ...this.data(),
        budgets: this.data().budgets.map((b) => (b.name === name ? { ...b, limit } : b)),
      })
    );
  }
  addGoal(name: string, target: number): boolean {
    return (
      validName(name) &&
      validAmount(target) &&
      target > 0 &&
      this.commit({
        ...this.data(),
        goals: [...this.goals(), { id: this.id(), name: name.trim(), target, contributions: [] }],
      })
    );
  }
  contribute(id: number, amount: number): boolean {
    const goal = this.goals().find((g) => g.id === id);
    if (
      !goal ||
      !validAmount(amount) ||
      amount <= 0 ||
      amount > this.available() ||
      cents(amount + this.goalSaved(id)) > goal.target
    )
      return false;
    return this.commit({
      ...this.data(),
      goals: this.goals().map((g) =>
        g.id === id
          ? { ...g, contributions: [...g.contributions, { amount, date: localDate() }] }
          : g,
      ),
    });
  }
  releaseGoal(id: number): boolean {
    return this.commit({ ...this.data(), goals: this.goals().filter((g) => g.id !== id) });
  }
  addPayment(name: string, amount: number, date: string, accountId: number): boolean {
    return (
      validName(name) &&
      validAmount(amount) &&
      amount > 0 &&
      validDate(date) &&
      this.accounts().some((a) => a.id === accountId) &&
      this.commit({
        ...this.data(),
        payments: [...this.payments(), { id: this.id(), name, amount, date, accountId }],
      })
    );
  }
  removePayment(id: number): boolean {
    return this.commit({ ...this.data(), payments: this.payments().filter((p) => p.id !== id) });
  }
  pay(id: number): boolean {
    const payment = this.payments().find((p) => p.id === id);
    if (!payment) return false;
    const transaction: Transaction = {
      id: this.id(),
      merchant: payment.name,
      amount: payment.amount,
      date: localDate(),
      accountId: payment.accountId,
      kind: 'expense',
      category: 'Servicios',
      icon: 'receipt',
      color: 'sky',
    };
    return this.commit({
      ...this.data(),
      transactions: [...this.transactions(), transaction],
      payments: this.payments().filter((p) => p.id !== id),
    });
  }
  formatMoney(value: number): string {
    return this.hideBalances()
      ? '••••••'
      : new Intl.NumberFormat('es-DO', {
          style: 'currency',
          currency: 'DOP',
          maximumFractionDigits: 2,
        }).format(value);
  }
  formatDate(date: string): string {
    return new Date(`${date}T12:00:00`).toLocaleDateString('es-DO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  monthLabel(): string {
    return new Date(`${this.selectedMonth()}-01T12:00:00`).toLocaleDateString('es-DO', {
      month: 'long',
      year: 'numeric',
    });
  }
  backup(): string {
    return JSON.stringify(this.data(), null, 2);
  }
  importBackup(json: string): boolean {
    try {
      const value: unknown = JSON.parse(json);
      if (!this.validData(value)) throw new Error();
      return this.commit(this.singleAccountData(value), true);
    } catch {
      this.error.set('El archivo no es un respaldo válido de Bolsillo. Tus datos no cambiaron.');
      return false;
    }
  }
  private validData(value: unknown): value is FinanceData {
    if (!value || typeof value !== 'object') return false;
    const d = value as FinanceData;
    const unique = (items: { id: number }[]) =>
      items.every((i) => Number.isSafeInteger(i.id) && i.id > 0) &&
      new Set(items.map((i) => i.id)).size === items.length;
    if (
      d.version !== 2 ||
      !validName(d.name) ||
      typeof d.hideBalances !== 'boolean' ||
      !Array.isArray(d.accounts) ||
      !d.accounts.length ||
      !d.accounts.every((a) => a && validName(a.name) && validAmount(a.openingBalance)) ||
      !unique(d.accounts)
    )
      return false;
    const account = (id: number) => d.accounts.some((a) => a.id === id);
    return (
      Array.isArray(d.transactions) &&
      d.transactions.every(
        (t) =>
          t &&
          validName(t.merchant) &&
          validName(t.category) &&
          validAmount(t.amount) &&
          t.amount > 0 &&
          validDate(t.date) &&
          ['income', 'expense'].includes(t.kind) &&
          account(t.accountId) &&
          typeof t.icon === 'string' &&
          typeof t.color === 'string',
      ) &&
      unique(d.transactions) &&
      Array.isArray(d.budgets) &&
      d.budgets.every(
        (b) =>
          b &&
          validName(b.name) &&
          validAmount(b.limit) &&
          b.limit >= 0 &&
          typeof b.icon === 'string' &&
          typeof b.color === 'string',
      ) &&
      new Set(d.budgets.map((b) => b.name)).size === d.budgets.length &&
      Array.isArray(d.goals) &&
      d.goals.every(
        (g) =>
          g &&
          validName(g.name) &&
          validAmount(g.target) &&
          g.target > 0 &&
          Array.isArray(g.contributions) &&
          g.contributions.every(
            (c) => c && validAmount(c.amount) && c.amount > 0 && validDate(c.date),
          ),
      ) &&
      unique(d.goals) &&
      Array.isArray(d.payments) &&
      d.payments.every(
        (p) =>
          p &&
          validName(p.name) &&
          validAmount(p.amount) &&
          p.amount > 0 &&
          validDate(p.date) &&
          account(p.accountId),
      ) &&
      unique(d.payments)
    );
  }
  private load(): FinanceData {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) {
        const value: unknown = JSON.parse(stored);
        if (!this.validData(value)) throw new Error();
        const normalized = this.singleAccountData(value);
        if (value.accounts.length > 1) localStorage.setItem(KEY, JSON.stringify(normalized));
        return normalized;
      }
      const legacy = localStorage.getItem('bolsillo-transactions');
      if (!legacy) return this.fresh();
      const old = JSON.parse(legacy) as Transaction[];
      if (!Array.isArray(old)) throw new Error();
      const data = this.fresh();
      data.accounts[0].openingBalance = 68019;
      data.transactions = old.map((t) => {
        const date = t.id > 10 ? new Date(t.id) : new Date();
        if (t.id <= 10 && t.date.startsWith('Ayer')) date.setDate(date.getDate() - 1);
        const match = t.date.match(/^(\d+) sep/);
        if (match) {
          date.setMonth(8, Number(match[1]));
        }
        return { ...t, amount: cents(t.amount), accountId: 1, date: localDate(date) };
      });
      const previousBudgets = localStorage.getItem('bolsillo-budgets');
      if (previousBudgets) {
        const budgets = JSON.parse(previousBudgets) as { name: string; limit: number }[];
        data.budgets = data.budgets.map((b) => ({
          ...b,
          limit: budgets.find((old) => old.name === b.name)?.limit ?? 0,
        }));
      }
      if (!this.validData(data)) throw new Error();
      localStorage.setItem(KEY, JSON.stringify(data));
      this.notice.set(
        'Se conservaron tus movimientos anteriores. Revisa sus fechas y el saldo inicial: la versión anterior usaba fechas relativas y un saldo de demostración.',
      );
      return data;
    } catch {
      this.recoveryRequired = true;
      this.error.set(
        'No se pudieron leer los datos guardados. Conserva una copia del almacenamiento antes de registrar cambios.',
      );
      return this.fresh();
    }
  }

  private singleAccountData(data: FinanceData): FinanceData {
    if (data.accounts.length === 1) return data;
    const primary = data.accounts[0];
    const account = {
      ...primary,
      name: 'Mi cuenta',
      openingBalance: cents(data.accounts.reduce((sum, item) => sum + item.openingBalance, 0)),
    };
    return {
      ...data,
      accounts: [account],
      transactions: data.transactions.map((transaction) => ({
        ...transaction,
        accountId: account.id,
      })),
      payments: data.payments.map((payment) => ({ ...payment, accountId: account.id })),
    };
  }
}
