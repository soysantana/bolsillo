import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type FeedbackType = 'idea' | 'bug' | 'question';

export interface FeedbackInput {
  type: FeedbackType;
  rating: string;
  message: string;
  contact?: string;
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly http = inject(HttpClient);
  private readonly feedbackUrl = environment.apiUrl + '/feedback';

  submit(input: FeedbackInput): Promise<void> {
    return firstValueFrom(this.http.post<void>(this.feedbackUrl, input));
  }
}
