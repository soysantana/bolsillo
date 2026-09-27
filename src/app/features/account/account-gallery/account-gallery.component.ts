import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AccountDemo, PreviewScenario } from '../account-demo';
import { scenarioGroups } from './scenarios';
@Component({
  selector: 'app-account-gallery',
  imports: [RouterLink],
  templateUrl: './account-gallery.component.html',
  styleUrls: ['../account.scss', './account-gallery.component.scss'],
})
export class AccountGalleryComponent {
  readonly groups = scenarioGroups;
  readonly demo = inject(AccountDemo);
  private readonly router = inject(Router);
  open(path: string, scenario: PreviewScenario): void {
    this.demo.select(scenario);
    void this.router.navigateByUrl(path);
  }
}
