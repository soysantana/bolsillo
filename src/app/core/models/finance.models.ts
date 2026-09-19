export type TransactionKind = 'expense' | 'income';
export interface Transaction {
  id: number;
  merchant: string;
  category: string;
  amount: number;
  kind: TransactionKind;
  date: string;
  accountId: number;
  icon: string;
  color: string;
}
export interface Budget {
  name: string;
  icon: string;
  color: string;
  spent: number;
  limit: number;
}
export interface NewTransaction {
  amount: number;
  merchant: string;
  category: string;
  kind: TransactionKind;
  date: string;
  accountId: number;
}
export interface Account {
  id: number;
  name: string;
  openingBalance: number;
}
export interface Goal {
  id: number;
  name: string;
  target: number;
  contributions: { amount: number; date: string }[];
}
export interface Payment {
  id: number;
  name: string;
  amount: number;
  date: string;
  accountId: number;
}
export interface FinanceData {
  version: 2;
  name: string;
  hideBalances: boolean;
  accounts: Account[];
  transactions: Transaction[];
  budgets: Omit<Budget, 'spent'>[];
  goals: Goal[];
  payments: Payment[];
}
export const EXPENSE_CATEGORIES = [
  { name: 'Comida', icon: 'basket', color: 'mint' },
  { name: 'Transporte', icon: 'car', color: 'lilac' },
  { name: 'Hogar', icon: 'home', color: 'sky' },
  { name: 'Diversión', icon: 'ticket', color: 'peach' },
  { name: 'Salud', icon: 'heart', color: 'rose' },
  { name: 'Servicios', icon: 'receipt', color: 'sky' },
  { name: 'Otros', icon: 'receipt', color: 'lime' },
];
export const INCOME_CATEGORIES = ['Nómina', 'Ventas', 'Regalos', 'Otros ingresos'].map((name) => ({
  name,
  icon: 'income',
  color: 'lime',
}));
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
