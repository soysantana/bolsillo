import { Component, DestroyRef, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccountDemo, PreviewAction } from '../account-demo';
import { FinanceStore } from '../../../core/services/finance-store.service';
import { PaymentReminderService } from '../../../core/services/payment-reminder.service';
import { downloadFile } from '../../../shared/download';
import { localDate } from '../../../core/models/finance.models';
import { accountPaths } from '../account.routes';
import { passwordChecks } from '../../auth/password-policy';
import { ConfirmationComponent } from '../confirmation/confirmation.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
@Component({
  selector: 'app-security-form',
  imports: [FormsModule, RouterLink, ConfirmationComponent, IconComponent],
  providers: [PreviewAction],
  templateUrl: './security-form.component.html',
  styleUrl: '../account.scss',
  host: { '[class.account-sheet]': 'sheet()' },
})
export class SecurityFormComponent implements OnInit {
  readonly sheet = input(false);
  readonly closed = output<void>();
  readonly busyChanged = output<boolean>();
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly flow = inject(PreviewAction);
  readonly paths = accountPaths;
  readonly confirming = signal(false);
  readonly exporting = signal(false);
  readonly backupMessage = signal('');
  readonly deleting = signal(false);
  private readonly store = inject(FinanceStore);
  private readonly reminders = inject(PaymentReminderService);
  private readonly demo = inject(AccountDemo);
  preview = false;
  screen = 'password';
  current = '';
  password = '';
  confirmation = '';
  visible = { current: false, password: false, confirmation: false };
  submitted = false;
  validation = '';
  deletionPasswordError = '';
  constructor() {
    this.destroyRef.onDestroy(() => this.clear());
  }
  ngOnInit(): void {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.clear();
      this.submitted = false;
      this.confirming.set(false);
      this.validation = '';
      this.screen = this.sheet() ? 'delete' : data['screen'];
      const scenario = this.flow.configure(this.screen);
      this.preview = scenario.preview === true;
      this.submitted = scenario.state === 'invalid' || scenario.state === 'mismatch';
      if (scenario.state === 'mismatch')
        this.validation = 'Las contraseñas no coinciden. Revísalas e inténtalo de nuevo.';
    });
  }
  get passwordValid() {
    return this.checks.every((check) => check.valid);
  }
  get checks() {
    return passwordChecks(this.password);
  }
  submit(form: NgForm): void {
    if (this.flow.state() === 'loading' || this.exporting()) return;
    this.submitted = true;
    this.validation = '';
    if (form.invalid) return;
    if (this.screen === 'delete') {
      this.current = '';
      this.deletionPasswordError = '';
      this.confirming.set(true);
      return;
    }
    if (!this.checks.every((check) => check.valid)) {
      this.validation = 'Completa los requisitos de tu contraseña.';
      return;
    }
    if (this.password !== this.confirmation) {
      this.validation = 'Las contraseñas no coinciden. Revísalas e inténtalo de nuevo.';
      return;
    }
    this.save();
  }
  async exportBackup(): Promise<void> {
    if (this.exporting() || this.deleting()) return;
    this.exporting.set(true);
    this.backupMessage.set('');
    try {
      const result = await downloadFile(
        `bolsillo-respaldo-${localDate()}.json`,
        this.store.backup(),
        'application/json',
      );
      this.backupMessage.set(
        result === 'opened'
          ? 'Guarda el archivo abierto antes de continuar.'
          : 'Copia preparada. Guárdala en un lugar seguro antes de continuar.',
      );
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        this.backupMessage.set(
          'No pudimos crear la copia. Puedes reintentar o continuar sin ella.',
        );
      }
    } finally {
      this.exporting.set(false);
    }
  }
  async save(): Promise<void> {
    if (this.screen === 'delete' && !this.current) {
      this.deletionPasswordError = 'Escribe tu contraseña para confirmar la eliminación.';
      return;
    }
    if (this.screen === 'delete' && !this.preview) {
      if (!this.confirming() || this.deleting() || this.exporting()) return;
      this.deleting.set(true);
      this.busyChanged.emit(true);
      this.flow.state.set('loading');
      this.flow.error.set('');
      try {
        await this.reminders.deleteLocalData();
        this.store.deleteLocalData();
        this.demo.closeAll();
        this.demo.identity.set({ name: '', email: '', verified: false });
        this.clear();
        this.confirming.set(false);
        this.flow.state.set('success');
      } catch {
        this.flow.state.set('error');
        this.flow.error.set('No pudimos completar la eliminación. Inténtalo de nuevo.');
      } finally {
        this.deleting.set(false);
        this.busyChanged.emit(false);
      }
      return;
    }
    this.flow.run(() => {
      this.clear();
      this.confirming.set(false);
    });
  }
  cancel(): void {
    if (this.deleting()) return;
    this.flow.cancel();
    this.confirming.set(false);
    this.clear();
    this.submitted = false;
    this.deletionPasswordError = '';
  }
  private clear(): void {
    this.current = this.password = this.confirmation = '';
    this.visible = { current: false, password: false, confirmation: false };
  }
}
