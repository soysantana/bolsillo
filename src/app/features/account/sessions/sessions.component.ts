import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { accountPaths } from '../account.routes';
@Component({
  selector: 'app-sessions',
  imports: [RouterLink],
  templateUrl: './sessions.component.html',
  styleUrl: '../account.scss',
})
export class SessionsComponent {
  readonly paths = accountPaths;
}
