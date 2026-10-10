import { buildMetadata } from '@/lib/seo';
import { ResetPasswordClient } from './ResetPasswordClient';

export const metadata = buildMetadata({
  title: 'Reset Password',
  description: 'Reset your SavDown account password.',
  path: '/reset-password',
  noIndex: true,
});

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
