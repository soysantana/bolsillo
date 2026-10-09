import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CampaignAction, CampaignMessage } from '../../../core/services/campaign-message.service';

@Component({
  selector: 'app-campaign-message',
  standalone: false,
  templateUrl: './campaign-message.component.html',
  styleUrl: './campaign-message.component.scss',
})
export class CampaignMessageComponent {
  @Input({ required: true }) message!: CampaignMessage;
  @Input() presentation: 'banner' | 'modal' = 'banner';
  @Output() actionSelected = new EventEmitter<CampaignAction>();
  @Output() closed = new EventEmitter<void>();
  @Output() expanded = new EventEmitter<void>();
}
