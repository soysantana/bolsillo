import { ChangeDetectorRef, Component } from '@angular/core';
import { FinanceStore } from '../../core/services/finance-store.service';
import { localDate } from '../../core/models/finance.models';
import { downloadFile } from '../../shared/download';
@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  editingName = false;
  name = '';
  editingAccount = false;
  openingBalance: number | null = 0;
  helpOpen = false;
  formError = '';
  pendingBackup = '';
  backupName = '';
  importing = false;
  constructor(
    readonly store: FinanceStore,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}
  editName(): void {
    this.name = this.store.name();
    this.editingName = true;
    this.formError = '';
  }
  saveName(): void {
    if (this.store.updateName(this.name)) {
      this.editingName = false;
      this.store.notice.set('Nombre actualizado.');
    } else this.formError = this.store.error() || 'Escribe un nombre de hasta 100 caracteres.';
  }
  editAccount(): void {
    this.openingBalance = this.store.account().openingBalance;
    this.editingAccount = true;
    this.formError = '';
  }
  saveAccount(): void {
    if (this.openingBalance !== null && this.store.saveAccount('Mi cuenta', this.openingBalance)) {
      this.editingAccount = false;
      this.store.notice.set('Cuenta guardada.');
    } else
      this.formError = this.store.error() || 'Escribe un saldo válido con hasta dos decimales.';
  }
  exportBackup(): void {
    downloadFile(`bolsillo-respaldo-${localDate()}.json`, this.store.backup(), 'application/json');
    this.store.notice.set('Tu copia está lista. Guárdala en un lugar privado.');
  }

  async inviteFriend(): Promise<void> {
    const share = {
      title: 'Bolsillo',
      text: 'Estoy usando Bolsillo para organizar mi dinero de forma simple.',
      url: window.location.origin,
    };
    try {
      if (navigator.share) {
        await navigator.share(share);
        return;
      }
      await navigator.clipboard.writeText(`${share.text} ${share.url}`);
      this.store.notice.set('Invitación copiada. Ya puedes compartirla.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      this.store.notice.set('No pudimos abrir las opciones para compartir.');
    }
  }
  async selectBackup(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.pendingBackup = '';
    this.formError = '';
    if (!file) return;
    if (file.size > 5_000_000) {
      this.formError = 'El respaldo debe pesar menos de 5 MB.';
      input.value = '';
      return;
    }
    this.importing = true;
    try {
      this.pendingBackup = await file.text();
      this.backupName = file.name;
    } catch {
      this.formError = 'No se pudo leer el archivo.';
    } finally {
      input.value = '';
      this.importing = false;
      this.changeDetector.markForCheck();
    }
  }
  restore(): void {
    if (this.store.importBackup(this.pendingBackup)) {
      this.pendingBackup = '';
      this.store.notice.set('Respaldo restaurado.');
    } else this.formError = this.store.error();
  }
}
