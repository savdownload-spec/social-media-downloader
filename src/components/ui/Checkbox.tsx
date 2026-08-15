'use client';

import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({ checked, indeterminate, onChange, label, description, disabled, className }: CheckboxProps) {
  return (
    <label className={cn('inline-flex items-start gap-2.5 cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed', className)}>
      <span
        role="checkbox"
        aria-checked={indeterminate ? 'mixed' : checked}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onChange(!checked); }
        }}
        className={cn(
          'mt-0.5 shrink-0 w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all',
          checked || indeterminate
            ? 'bg-primary border-primary text-white'
            : 'bg-white border-border-light hover:border-primary/50',
        )}
      >
        {indeterminate ? <Minus className="w-2.5 h-2.5" strokeWidth={3} /> : checked ? <Check className="w-2.5 h-2.5" strokeWidth={3} /> : null}
      </span>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-[13px] font-medium text-text leading-tight">{label}</span>}
          {description && <span className="block text-[11px] text-text-muted mt-0.5">{description}</span>}
        </span>
      )}
    </label>
  );
}
