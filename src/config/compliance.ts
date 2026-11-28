export type BusinessDetails = {
  name: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
};

export const DEFAULT_BUSINESS: BusinessDetails = {
  name: 'GetSavDown',
  address: '1st floor Commercial Plaza, PCSIR Phase 2, Lahore, punjab, Pakistan',
  phone: '+92 304 8804973',
  whatsapp: '+92 304 8804973',
  email: 'info@getsavdown.com',
  website: 'https://getsavdown.com/',
};

export const BUSINESS_SETTING_KEYS = {
  name: 'business_name',
  address: 'business_address',
  phone: 'business_phone',
  whatsapp: 'business_whatsapp',
} as const;

export const POLICY_SETTING_KEYS = {
  privacy: 'privacy_policy_content',
  terms: 'terms_conditions_content',
  refund: 'refund_policy_content',
  service: 'service_policy_content',
} as const;

export type PolicyKind = keyof typeof POLICY_SETTING_KEYS;

export const DEFAULT_POLICY_CONTENT: Record<PolicyKind, string> = {
  privacy: `## About this policy
GetSavDown operates the SavDown website and online tools at https://getsavdown.com/. This Privacy Policy explains what information we collect, how we use it, when service providers process it for us, and the choices available to you. It applies to visitors, account holders, customers, and people who contact our support team.

## Information we collect
The information we handle depends on how you use the service.
- Account information: your name, email address, profile image, and sign-in provider. If you create a password-based account, we store a password hash rather than your plain-text password.
- Tool and content information: URLs you submit, tool selections, processing status, and files or prompts you choose to upload or enter. Some image, QR, and utility tools process information in your browser; other tools use server-side processing.
- Payment and subscription records: the plan or credit pack purchased, amount, currency, payment status, transaction or provider reference, subscription status, and relevant dates.
- Support communications: your contact details, messages, attachments, and the history needed to respond to your request.
- Technical and usage information: log data, IP-related information, browser or device information, pages visited, tool usage, timestamps, and security or rate-limiting events.

## How we use information
We use information to provide and maintain the tools, authenticate accounts, deliver purchased plans and credits, prevent abuse, respond to support requests, keep transaction records, improve performance, and understand how the service is used. We may also use information where necessary to comply with legal obligations or protect the rights, safety, and security of GetSavDown, our users, and others.

## Cookies, storage, and analytics
We use essential cookies or similar storage for features such as sign-in, security, theme preferences, language preferences, and rate limiting. We also use analytics and measurement services, which may include Vercel Analytics, Vercel Speed Insights, Google Tag Manager, and Ahrefs Analytics. These services may process page-usage, device, browser, and network information according to their own privacy terms. You can control cookies through your browser, although blocking essential storage may prevent sign-in or other features from working. Our Cookie Policy provides additional information.

## Payment information handling
Payments are processed by the third-party payment provider presented at checkout. Payment credentials are supplied through the provider's payment flow. GetSavDown receives the transaction and subscription information needed to confirm payment, activate digital purchases, prevent fraud, handle support requests, and maintain accounting records. We do not intentionally store full card numbers or card security codes on GetSavDown servers. Never send a full card number, card security code, or account password through our contact form, email, telephone, or WhatsApp.

## Third-party services
We use service providers for functions that support the website. Depending on the feature used, these may include Vercel for hosting, storage, and analytics; Neon for database hosting; Google or GitHub for optional account sign-in; Google services for translation or tag management; Ahrefs for analytics; Stripe or Safepay for supported payment flows; email delivery providers; and Cloudflare Workers AI for supported AI features. These providers process only the information needed for their role on our behalf or under their own terms. Third-party websites and source platforms linked through our tools are governed by their own policies.

## Data protection and retention
We use reasonable technical and organizational safeguards appropriate to the information and service, including access controls and password hashing for password-based accounts. No website, transmission method, or storage system can be guaranteed completely secure. We retain information only for as long as reasonably needed for the purposes described above, including service delivery, security, dispute handling, accounting, and legal obligations. Retention periods vary by record type. Temporary processing data is cleaned up or overwritten according to the relevant tool's workflow, while account, support, and transaction records may need to be retained longer.

## Your privacy rights
Subject to applicable law, you may ask to access, correct, export, or delete personal information associated with you. You may also object to or restrict certain processing and withdraw consent where processing relies on consent. Use the business contact details below to make a request. We may need to verify your identity and account ownership before completing it. You can also manage available account and communication preferences through your account or by contacting us.

## International processing
Our service providers may process information in countries other than Pakistan or the country where you live. Their handling of information is subject to their own terms, safeguards, and legal obligations.

## Changes to this policy
We may update this Privacy Policy when our tools, providers, or legal obligations change. The latest version will be published on this page with its revision date. Material changes may also be communicated through the website where appropriate.

## Contact information
Questions, concerns, and privacy requests can be sent using the GetSavDown business contact details displayed below.`,

  terms: `## Agreement to these terms
These Terms & Conditions govern access to https://getsavdown.com/, the SavDown brand, and the tools and digital services operated by GetSavDown. By accessing or using the website, creating an account, or purchasing a digital service, you agree to these terms and the related policies linked on this page. If you do not agree, do not use the service.

## Website and tool usage
GetSavDown provides browser-based and server-assisted tools for supported social media, image, audio, video, PDF, SEO, AI, and file-conversion functions. Features, limits, supported formats, and availability can vary by tool and by the plan shown on the website. A listed tool marked as coming soon, under maintenance, or unavailable is not included as a working service until its status changes. You must follow the instructions and limits presented within each tool.

## Accounts and user responsibilities
You are responsible for providing accurate account information, keeping your sign-in credentials confidential, and activity carried out through your account. Notify us if you suspect unauthorized access. You are also responsible for the URLs, files, prompts, and other content you submit, for maintaining your own backups, and for checking that your use complies with applicable law and the rules of the relevant source platform.

## Acceptable use and copyright compliance
Use the service only for content you own, content in the public domain, content made available under a suitable license, or content you are otherwise legally permitted to access, download, convert, or use.
- Do not infringe copyright, trademark, privacy, publicity, or other rights.
- Do not circumvent digital rights management, access controls, private content restrictions, or other technical protection measures.
- Do not use the service for unlawful, deceptive, harmful, or unauthorized activity.
- Do not scrape, overload, disrupt, reverse engineer, or attempt unauthorized access to the service or its infrastructure.
- Do not misuse credits, payments, referral features, or rate limits.
We may investigate suspected misuse and respond to valid intellectual-property notices under our DMCA Policy.

## Subscriptions and payment terms
Available plans, credit packs, billing intervals, prices, and included allowances are shown on the pricing or checkout page before purchase. Paid subscriptions renew for the selected billing interval until cancelled. You authorize the applicable payment provider to charge the displayed amount through your selected payment method. Payment processing is subject to the provider's own terms. GetSavDown maintains transaction and entitlement records needed to deliver purchases, but does not intentionally store full card numbers or card security codes on its servers. You are responsible for using an authorized payment method and for any charges caused by inaccurate or unauthorized payment instructions, subject to applicable law.

## Digital credits and purchased features
Credits and premium features are digital entitlements associated with the relevant account. The allowance, refill behavior, and features included depend on the purchase description. Purchased one-time credit packs do not expire under the current product rules; plan-based allowances may reset as described on the pricing page. A failed tool operation should not consume credits under the current credit-handling rules. Contact support if your balance or entitlement does not match a confirmed purchase.

## Subscription cancellation
You can request cancellation through the available billing controls or by contacting support before the next renewal. Unless a different arrangement is confirmed or applicable law requires otherwise, cancellation stops future renewals and paid access remains available until the end of the already-paid billing period. Cancellation is not itself approval of a refund. Refund requests are handled under the Return & Refund Policy and applicable law.

## Intellectual property
The GetSavDown and SavDown website, branding, software, original text, graphics, and service design are protected by applicable intellectual-property laws. Third-party platform names and marks belong to their respective owners. GetSavDown does not claim ownership of content that users choose to process. These terms do not grant you ownership of, or a license to redistribute, third-party content that you have no right to use.

## Service availability and changes
We may improve, modify, suspend, or discontinue features and may perform maintenance. Tools can also depend on third-party platforms and providers whose behavior may change. We do not guarantee uninterrupted availability, a particular uptime percentage, compatibility with every source URL or file, or that every output will meet your intended purpose. Current tool status and published limits should be checked before relying on a service.

## Account suspension and termination
You may stop using the service and may request account deletion through support. We may restrict, suspend, or terminate access where reasonably necessary to address a material breach, fraud, abuse, security risk, legal requirement, or harm to the service or others. Where practical, we will explain the restriction and provide a way to contact us. Provisions concerning payments, intellectual property, disclaimers, liability, and dispute-related records may survive termination.

## Disclaimers and limitations of liability
The service is provided on an "as available" basis to the extent permitted by applicable law. GetSavDown does not warrant that every tool or output will be error-free or suitable for a particular purpose. To the extent permitted by law, GetSavDown is not liable for indirect, incidental, special, or consequential loss, loss of data, loss of profits, or claims resulting from content you were not authorized to use. Nothing in these terms excludes rights, remedies, or liability that cannot lawfully be excluded or limited.

## Changes to these terms
We may revise these terms when the service or applicable requirements change. The current version and revision date will appear on this page. Continued use after an updated version takes effect constitutes acceptance, unless applicable law requires a different notice or consent process.

## Contact information
Questions about these terms, payments, cancellation, or account restrictions can be sent using the GetSavDown business contact details displayed below.`,

  refund: `## Digital purchases and returns
GetSavDown supplies digital tools, subscriptions, credits, and related online features rather than physical products. There are no physical goods to return and no return shipping process. This policy applies to purchases made through the website and should be read with the Terms & Conditions and Shipping & Service Delivery Policy.

## Refund eligibility
Refund eligibility for a digital purchase is assessed according to the item purchased, whether it was delivered, the extent of any use, the technical circumstances, payment-provider records, and applicable law. We do not treat every digital purchase as automatically refundable or automatically non-refundable. Each request is reviewed fairly using the available transaction and service records. Nothing in this policy removes a right or remedy that cannot be excluded under applicable law.

## Duplicate payments
If you believe the same purchase was charged more than once, contact us with the payment references and the account email used. After the duplicate charge is verified with the payment provider, the duplicate amount will be refunded or otherwise corrected through the original payment method. Please do not send full payment-card details with your request.

## Failed or pending transactions
A declined or failed checkout does not activate a purchase. A bank or provider may nevertheless display a temporary pending authorization. If an amount has actually been captured for a transaction that failed to provide the associated purchase, send us the provider reference so we can investigate. Once the capture is verified, the amount will be refunded or reversed through the payment provider. Pending-authorization release times are controlled by the provider or bank.

## Technical issues affecting purchased services
If a technical problem prevents delivery of a purchased plan, credits, or premium feature, contact us promptly with the purchase reference, account email, and a description of the issue. We may verify the transaction, restore access, correct the credit balance, or fix the affected service. Where an affected purchase cannot be delivered or an appropriate correction cannot be provided, a refund may be issued for the affected purchase after review.

## Subscription cancellation
You can cancel a subscription through the available billing controls or by contacting support before renewal. Cancellation stops future renewal charges and, unless otherwise confirmed or required by law, access continues until the end of the current paid billing period. Cancelling a subscription does not automatically approve a refund for the current or an earlier period; any such request is reviewed under this policy and applicable law.

## How to request a refund
Use the contact form, email, telephone, or WhatsApp details below and provide:
- The email address associated with the purchase or account.
- The payment-provider transaction or receipt reference.
- The purchase date and the name of the plan, credit pack, or feature.
- The reason for the request and any relevant error message or supporting evidence.
Do not provide a password, full card number, or card security code. We may ask for reasonable additional information needed to verify the transaction or diagnose the reported issue.

## Review and refund processing timelines
Review starts after we receive enough information to identify the purchase. Duplicate-charge and failed-transaction checks usually rely on payment-provider records, while technical or usage-related requests may require additional investigation. We will tell you if more information is needed and notify you of the outcome. Approved refunds are initiated to the original payment method after approval. The time taken by a payment provider or bank to post a refund or release a pending amount varies and is outside GetSavDown's control. Contact us if you need the available refund reference or a status update.

## Customer support
Our team can help locate a transaction, check service activation, explain cancellation, and submit a refund request for review. Use the GetSavDown business contact details displayed below.`,

  service: `## Digital services only
GetSavDown provides online tools, digital subscriptions, credits, and related premium features. We do not sell or ship physical products. No shipping address, courier, tracking number, physical delivery charge, or physical return is involved. This Shipping & Service Delivery Policy explains how access to digital purchases is delivered.

## Access to online tools
Public tool pages are available through the website, subject to the displayed tool status, usage limits, and any sign-in requirements. Some features process files in your browser, while others use server-side processing. Coming soon, maintenance, and unavailable labels describe the current service state and are not promises that an unavailable tool has already been delivered.

## Subscription activation
After a successful payment is confirmed by the applicable payment provider, the associated subscription entitlement is applied to the purchasing account through the billing system. Activation is automated and does not involve manual shipping. You can review the current plan and available billing information by signing in to the same account used at checkout. A pending, declined, or unconfirmed transaction does not activate a subscription.

## Purchased credits and premium features
Confirmed one-time credit purchases are added to the purchased-credit balance for the relevant account. Under the current product rules, purchased credits do not expire; plan allowances may refill or reset according to the purchase description. Premium features and limits are those shown for the selected plan or package at the time of purchase. No physical voucher or product is sent.

## Payment confirmation and delivery timing
Digital delivery begins after the payment provider confirms a successful transaction and the billing system processes that confirmation. In normal operation this requires no shipping or manual fulfilment step. Confirmation and activation can be delayed by provider processing, network interruptions, webhook delivery, or account-matching issues, so a fixed activation time is not guaranteed. The plan and credit information shown in your account is the best way to check whether activation has completed.

## Failed or delayed activation
If a confirmed purchase is not visible in your account, first refresh the account or billing page and confirm that you signed in with the same account used for the purchase. If it is still missing, contact support with the payment reference, purchase date, item purchased, and account email. Avoid making a second payment solely to resolve a delay until the first transaction status has been checked. Duplicate or incorrectly captured payments are handled under the Return & Refund Policy.

## Service availability
Online tools may occasionally be unavailable because of maintenance, technical issues, usage controls, or changes to third-party platforms and providers. We do not guarantee uninterrupted availability or a fixed uptime percentage. If an issue affects a purchased service, contact us so we can investigate activation, credit balances, or an appropriate remedy under the applicable policies.

## Customer support
Support is available through the contact form, email, telephone, and WhatsApp details below. Never send a password, full card number, or card security code when asking for activation help.`,
};

export const DEFAULT_COMPLIANCE_SETTINGS: Record<string, string> = {
  [BUSINESS_SETTING_KEYS.name]: DEFAULT_BUSINESS.name,
  [BUSINESS_SETTING_KEYS.address]: DEFAULT_BUSINESS.address,
  [BUSINESS_SETTING_KEYS.phone]: DEFAULT_BUSINESS.phone,
  [BUSINESS_SETTING_KEYS.whatsapp]: DEFAULT_BUSINESS.whatsapp,
  [POLICY_SETTING_KEYS.privacy]: DEFAULT_POLICY_CONTENT.privacy,
  [POLICY_SETTING_KEYS.terms]: DEFAULT_POLICY_CONTENT.terms,
  [POLICY_SETTING_KEYS.refund]: DEFAULT_POLICY_CONTENT.refund,
  [POLICY_SETTING_KEYS.service]: DEFAULT_POLICY_CONTENT.service,
};
