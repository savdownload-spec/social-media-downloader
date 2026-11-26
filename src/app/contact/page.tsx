import { Mail } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { BusinessContact } from '@/components/layout/BusinessContact';
import { ContactForm } from '@/components/ContactForm';
import { getComplianceSettings } from '@/lib/compliance-server';

export const revalidate = 300;

export default async function ContactPage() {
  const { business } = await getComplianceSettings();

  return (
    <Container className="max-w-4xl py-16 md:py-24">
      <Breadcrumb
        className="mb-8"
        includeSchema
        items={[{ label: 'Home', href: '/' }, { label: 'Contact Us' }]}
      />
      <div className="max-w-2xl">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light">
          <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <p className="mb-3 text-sm font-medium text-primary">Contact</p>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Say Hello.</h1>
        <p className="mt-4 leading-relaxed text-text-muted">
          Contact GetSavDown about tools, accounts, digital purchases, refunds, feedback, or partnerships. Use the business details below or send us a message.
        </p>
      </div>

      <div className="mt-10">
        <BusinessContact business={business} />
      </div>

      <section className="mt-14 max-w-2xl" aria-labelledby="contact-form-heading">
        <h2 id="contact-form-heading" className="text-2xl font-bold tracking-tight text-text md:text-3xl">
          Send us a message
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Include the relevant tool or payment reference when asking for technical or billing help. Never send passwords or full payment-card details.
        </p>
        <ContactForm />
      </section>
    </Container>
  );
}
