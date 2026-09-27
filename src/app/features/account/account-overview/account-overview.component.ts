import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccountDemo } from '../account-demo';
import { accountPaths } from '../account.routes';
import { IconComponent } from '../../../shared/components/icon/icon.component';
@Component({
  selector: 'app-account-overview',
  imports: [RouterLink, IconComponent],
  templateUrl: './account-overview.component.html',
  styleUrl: '../account.scss',
})
export class AccountOverviewComponent {
  readonly demo = inject(AccountDemo);
  readonly paths = accountPaths;
  screen = 'account';
  constructor() {
    inject(ActivatedRoute)
      .data.pipe(takeUntilDestroyed())
      .subscribe((data) => {
        this.screen = data['screen'];
        const scenario = this.demo.take(this.screen);
        if (scenario.state === 'verified')
          this.demo.identity.update((identity) => ({ ...identity, verified: true }));
      });
  }
}
