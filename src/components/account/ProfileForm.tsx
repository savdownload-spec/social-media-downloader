'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

export type AccountUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role?: string | null;
  jobTitle?: string | null;
  company?: string | null;
  bio?: string | null;
  createdAt?: string | Date;
};

type ProfileFormProps = {
  user: AccountUser;
};

export function ProfileForm({ user }: ProfileFormProps) {
  const { update } = useSession();
  const { success, error: errorToast } = useToast();

  const [name, setName] = useState(user.name ?? '');
  const [email, setEmail] = useState(user.email ?? '');
  const [image, setImage] = useState(user.image ?? '');
  const [jobTitle, setJobTitle] = useState(user.jobTitle ?? '');
  const [company, setCompany] = useState(user.company ?? '');
  const [bio, setBio] = useState(user.bio ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const payload: Record<string, unknown> = { name, email };
    if (image.trim()) payload.image = image.trim();
    if (jobTitle.trim()) payload.jobTitle = jobTitle.trim();
    if (company.trim()) payload.company = company.trim();
    if (bio.trim()) payload.bio = bio.trim();
    if (newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        errorToast('Update failed', data?.error || 'Please try again.');
        return;
      }

      success('Profile updated!');
      setCurrentPassword('');
      setNewPassword('');
      update(); // refresh the session name/image
    } catch {
      errorToast('Network error', 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  const initials = (user.name ?? 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="rounded-2xl bg-white border border-border shadow-soft p-6">
      <h2 className="text-lg font-bold text-text mb-1">Profile</h2>
      <p className="text-sm text-text-muted mb-6">Your public profile information.</p>

      <div className="flex items-center gap-4 mb-6">
        {image ? (
          <img src={image} alt="Profile" className="w-16 h-16 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center text-white text-lg font-bold shrink-0">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text truncate">{user.name ?? 'Your name'}</p>
          <p className="text-xs text-text-muted truncate">{user.email}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
              Name
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
              Email
            </label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
            Profile Picture URL
          </label>
          <Input
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
          />
          <p className="text-xs text-text-subtle mt-1.5">Paste a public image URL. Leave blank to use your initials.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
              Role
            </label>
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Content Creator" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
              Company
            </label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Acme Inc" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="A short bio (optional)"
            className="w-full rounded-2xl border border-border bg-white px-5 py-3.5 text-text placeholder:text-text-subtle focus:outline-none focus:border-primary focus:shadow-glow transition-all duration-200 resize-none"
          />
        </div>

        <div className="pt-2 border-t border-border-light">
          <p className="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-3">Change Password</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
                Current Password
              </label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 8 chars)"
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>

        <Button onClick={handleSubmit} loading={loading} className="w-full sm:w-auto">
          Save Changes
        </Button>
      </div>
    </div>
  );
}
