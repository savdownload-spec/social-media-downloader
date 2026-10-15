import 'server-only';

export type SubscriptionResult = {
  subscriberId: string;
  status: 'active' | 'pending' | 'unsubscribed' | 'bounced' | 'complained';
};
export interface NewsletterProvider {
  readonly name: string;
  readonly listId: string;
  subscribe(email: string): Promise<SubscriptionResult>;
}
// Safe diagnostic codes only: never retain provider bodies or credentials.
export class NewsletterError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'NewsletterError';
  }
}
