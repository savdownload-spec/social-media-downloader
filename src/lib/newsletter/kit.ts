import 'server-only';
import { z } from 'zod';
import { NewsletterError, type NewsletterProvider, type SubscriptionResult } from './provider';

const Subscriber = z.object({
  subscriber: z.object({
    id: z.number().int().positive(), email_address: z.string().email(),
    state: z.enum(['active', 'inactive', 'cancelled', 'bounced', 'complained']),
  }),
});
export class KitProvider implements NewsletterProvider {
  readonly name = 'kit';
  readonly listId: string;
  private readonly apiKey: string;
  constructor() {
    const key = process.env.KIT_API_KEY?.trim();
    const form = process.env.KIT_FORM_ID?.trim();
    if (!key || !form || !/^[1-9]\d*$/.test(form)) throw new NewsletterError('configuration');
    this.apiKey = key;
    this.listId = form;
  }
  private async request(path: string, email: string, signal: AbortSignal) {
    let response: Response;
    try {
      response = await fetch(`https://api.kit.com/v4/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': this.apiKey },
        body: JSON.stringify({ email_address: email }),
        signal, cache: 'no-store', redirect: 'error',
      });
    } catch {
      throw new NewsletterError(signal.aborted ? 'provider_timeout' : 'provider_network');
    }
    if (![200, 201, 202].includes(response.status)) throw new NewsletterError(`provider_http_${response.status}`);
    const parsed = Subscriber.safeParse(await response.json().catch(() => null));
    if (!parsed.success || parsed.data.subscriber.email_address.toLowerCase() !== email) {
      throw new NewsletterError('provider_response');
    }
    return parsed.data.subscriber;
  }
  async subscribe(email: string): Promise<SubscriptionResult> {
    const signal = AbortSignal.timeout(12000);
    // Email-keyed upsert; Kit does not reactivate existing cancelled subscribers.
    // Its documented form endpoint requires the subscriber to exist first.
    const subscriber = await this.request('subscribers', email, signal);
    const result = ['cancelled', 'bounced', 'complained'].includes(subscriber.state)
      ? subscriber : await this.request(`forms/${this.listId}/subscribers`, email, signal);
    const statuses = {
      active: 'active', inactive: 'pending', cancelled: 'unsubscribed',
      bounced: 'bounced', complained: 'complained',
    } as const;
    return { subscriberId: String(result.id), status: statuses[result.state] };
  }
}
