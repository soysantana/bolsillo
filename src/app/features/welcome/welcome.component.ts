import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { GuestAccessService } from '../../core/services/guest-access.service';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss',
})
export class WelcomeComponent {
  private readonly guestAccess = inject(GuestAccessService);
  private readonly router = inject(Router);
  acceptedPolicies = false;
  submitted = false;

  constructor() {
    if (this.guestAccess.hasAcceptedPolicies()) {
      void this.router.navigateByUrl('/inicio', { replaceUrl: true });
    }
  }

  continueWithoutAccount(): void {
    this.submitted = true;
    if (!this.acceptedPolicies) return;

    this.guestAccess.acceptPolicies();
    void this.router.navigateByUrl('/inicio', { replaceUrl: true });
  }
}
