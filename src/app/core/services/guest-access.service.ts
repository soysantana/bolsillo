import { Injectable } from '@angular/core';

const GUEST_POLICY_ACCEPTED_KEY = 'bolsillo-guest-policy-accepted';
const ACCOUNT_ACCESS_KEY = 'bolsillo-account-access';

@Injectable({ providedIn: 'root' })
export class GuestAccessService {
  canOpenApp(): boolean {
    return this.hasAcceptedPolicies() || localStorage.getItem(ACCOUNT_ACCESS_KEY) === 'true';
  }

  hasAcceptedPolicies(): boolean {
    return localStorage.getItem(GUEST_POLICY_ACCEPTED_KEY) === 'true';
  }

  acceptPolicies(): void {
    localStorage.setItem(GUEST_POLICY_ACCEPTED_KEY, 'true');
  }

  allowAccountAccess(): void {
    localStorage.setItem(ACCOUNT_ACCESS_KEY, 'true');
  }

  clearAccountAccess(): void {
    localStorage.removeItem(ACCOUNT_ACCESS_KEY);
  }
}
