import { buildMetadata } from '@/lib/seo';
import { LoginClient } from './LoginClient';

export const metadata = buildMetadata({
  title: 'Sign In',
  description: 'Sign in to your SavDown account to access your downloads, credits, and workspace.',
  path: '/login',
  noIndex: true,
});

export default function LoginPage() {
  return <LoginClient />;
}
