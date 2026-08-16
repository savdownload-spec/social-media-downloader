'use client';

import { FormEvent, useState } from 'react';
import { Star } from 'lucide-react';
import { useSession, signIn } from 'next-auth/react';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';

type ReviewFormProps = { onSuccess?: () => void };
type FormErrors = Partial<Record<'role' | 'company' | 'platform' | 'rating' | 'review', string>>;

const roleOptions = ['Content Creator', 'Social Media Manager', 'Graphic Designer', 'Video Editor', 'Digital Marketer', 'SEO Specialist', 'Blogger', 'Influencer', 'Educator', 'Student', 'Developer', 'Designer', 'Entrepreneur', 'Business Owner', 'Freelancer', 'Journalist', 'Photographer', 'YouTuber', 'Podcaster', 'Other'];
const platformOptions = [['google', 'Google'], ['youtube', 'YouTube'], ['tiktok', 'TikTok'], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['x', 'X'], ['reddit', 'Reddit'], ['friend', 'Friend or Colleague'], ['blog', 'Blog or Website'], ['other', 'Other']] as const;

export function ReviewForm({ onSuccess }: ReviewFormProps) {
  const { data: session } = useSession();
  const { success, error: errorToast } = useToast();
  const [role, setRole] = useState('');
  const [otherRole, setOtherRole] = useState('');
  const [company, setCompany] = useState('');
  const [platform, setPlatform] = useState('');
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!role || (role === 'Other' && !otherRole.trim())) next.role = role === 'Other' ? 'Please enter your role.' : 'Please select your role.';
    if (!company.trim()) next.company = 'Please enter your company or organization.';
    if (!platform) next.platform = 'Please tell us where you found SavDown.';
    if (!rating) next.rating = 'Please select a rating from 1 to 5 stars.';
    if (!review.trim()) next.review = 'Please tell us about your experience.';
    else if (review.trim().length < 10) next.review = 'Your review must be at least 10 characters.';
    return next;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || submitted) return;
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      const res = await fetch('/api/reviews', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role: role === 'Other' ? otherRole.trim() : role, company: company.trim(), platform, rating, review: review.trim() }) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) { errorToast('Submission failed', data?.error || 'Please try again.'); return; }
      setSubmitted(true);
      success('Review submitted!', 'Thank you for sharing your experience.');
      onSuccess?.();
    } catch { errorToast('Network error', 'Could not reach the server.'); }
    finally { setLoading(false); }
  };

  if (!session) return <div className="rounded-2xl bg-surface border border-border p-8 text-center"><h3 className="text-lg font-bold text-text mb-2">Share Your SavDown Experience</h3><p className="text-sm text-text-muted mb-4">Sign in to leave a review.</p><Button onClick={() => signIn(undefined, { callbackUrl: window.location.pathname + window.location.search })}>Sign In to Review</Button></div>;

  const fieldClass = (error?: string) => `w-full h-11 rounded-xl border bg-white dark:bg-card px-4 text-sm text-text focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-colors ${error ? 'border-red-400' : 'border-border'}`;
  return <div className="rounded-2xl bg-white dark:bg-card border border-border shadow-soft p-6 md:p-8">
    <h3 className="text-lg font-bold text-text mb-1">Share Your SavDown Experience</h3><p className="text-sm text-text-muted mb-6">Used SavDown? Tell us what you think.</p>
    {submitted ? <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-4 text-sm text-primary" role="status">Your review was submitted successfully and is awaiting approval. Thank you for sharing your experience.</div> : <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label htmlFor="review-role" className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">Role</label><select id="review-role" value={role} onChange={e => { setRole(e.target.value); setErrors(x => ({ ...x, role: undefined })); }} aria-invalid={!!errors.role} className={fieldClass(errors.role)}><option value="">Select your role</option>{roleOptions.map(x => <option key={x}>{x}</option>)}</select>{role === 'Other' && <input value={otherRole} onChange={e => setOtherRole(e.target.value)} placeholder="Enter your role" aria-label="Other role" className={`${fieldClass(errors.role)} mt-2`} />}{errors.role && <p className="mt-1.5 text-xs text-red-600" role="alert">{errors.role}</p>}</div><div><label htmlFor="review-company" className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">Company / Organization</label><input id="review-company" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Acme Inc." aria-invalid={!!errors.company} className={fieldClass(errors.company)} />{errors.company && <p className="mt-1.5 text-xs text-red-600" role="alert">{errors.company}</p>}</div></div>
      <div><label htmlFor="review-platform" className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">Where did you find us?</label><select id="review-platform" value={platform} onChange={e => setPlatform(e.target.value)} aria-invalid={!!errors.platform} className={fieldClass(errors.platform)}><option value="">Select an option</option>{platformOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{errors.platform && <p className="mt-1.5 text-xs text-red-600" role="alert">{errors.platform}</p>}</div>
      <div><span className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">Rating</span><div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">{Array.from({ length: 5 }).map((_, i) => { const value = i + 1; return <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} star${value === 1 ? '' : 's'}`} onMouseEnter={() => setHoveredStar(value)} onMouseLeave={() => setHoveredStar(0)} onClick={() => { setRating(value); setErrors(x => ({ ...x, rating: undefined })); }} className="rounded-md p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/30"><Star className={`w-7 h-7 ${value <= (hoveredStar || rating) ? 'fill-primary text-primary' : 'fill-none text-text-subtle'}`} /></button>; })}<span className="text-sm text-text-muted ml-2">{rating ? `${rating}/5` : 'Select a rating'}</span></div>{errors.rating && <p className="mt-1.5 text-xs text-red-600" role="alert">{errors.rating}</p>}</div>
      <div><label htmlFor="review-text" className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">Your Review</label><textarea id="review-text" value={review} onChange={e => setReview(e.target.value.slice(0, 500))} placeholder="Tell us about your experience with SavDown..." rows={4} maxLength={500} aria-invalid={!!errors.review} className={`${fieldClass(errors.review)} h-auto py-3 resize-none`} /><div className="flex justify-between gap-4 mt-1"><p className="text-xs text-text-subtle">{review.length}/500</p>{errors.review && <p className="text-xs text-red-600" role="alert">{errors.review}</p>}</div></div>
      <Button type="submit" disabled={loading} loading={loading} className="w-full sm:w-auto">{loading ? 'Submitting...' : 'Submit Review'}</Button>
    </form>}
  </div>;
}
