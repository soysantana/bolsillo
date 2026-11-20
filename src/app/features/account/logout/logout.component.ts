import { Component, input } from '@angular/core';
import { IconComponent } from '../../../shared/components/icon/icon.component';
@Component({
  selector: 'app-logout',
  imports: [IconComponent],
  templateUrl: './logout.component.html',
  styleUrl: './logout.component.scss',
})
export class LogoutComponent {
  readonly variant = input<'row' | 'icon'>('row');
}
