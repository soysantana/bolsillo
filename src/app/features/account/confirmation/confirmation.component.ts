import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  input,
  output,
} from '@angular/core';
@Component({
  selector: 'app-confirmation',
  templateUrl: './confirmation.component.html',
  styleUrl: './confirmation.component.scss',
})
export class ConfirmationComponent implements AfterViewInit, OnDestroy {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly action = input('Cerrar sesión');
  readonly destructive = input(false);
  readonly busy = input(false);
  readonly error = input('');
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
  @ViewChild('dialog', { static: true }) private dialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('cancelButton', { static: true }) private cancelButton!: ElementRef<HTMLButtonElement>;
  private origin = document.activeElement as HTMLElement | null;
  ngAfterViewInit(): void {
    this.dialog.nativeElement.showModal();
    this.cancelButton.nativeElement.focus();
  }
  cancel(event?: Event): void {
    event?.preventDefault();
    this.cancelled.emit();
  }
  containFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const buttons = this.dialog.nativeElement.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled)',
    );
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  ngOnDestroy(): void {
    this.dialog.nativeElement.close();
    if (this.origin?.isConnected) this.origin.focus();
  }
}
