import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-category-icon',
  standalone: false,
  templateUrl: './category-icon.component.html',
  styleUrl: './category-icon.component.scss',
})
export class CategoryIconComponent {
  @Input() icon = 'receipt';
  @Input() color = 'mint';
  @Input() size: 'small' | 'regular' | 'large' = 'regular';
}
