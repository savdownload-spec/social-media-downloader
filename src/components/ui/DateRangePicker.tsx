'use client';

import { cn } from '@/lib/utils';
import { DATE_RANGE_PRESETS, type DateRangePreset } from '@/lib/export/fields';

interface DateRangePickerProps {
  preset: DateRangePreset;
  onPresetChange: (preset: DateRangePreset) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
}

export function DateRangePicker({
  preset, onPresetChange, customFrom, customTo, onCustomFromChange, onCustomToChange,
}: DateRangePickerProps) {
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {DATE_RANGE_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPresetChange(p.id)}
            className={cn(
              'h-9 px-3 rounded-lg text-[12px] font-medium border transition-all text-left',
              preset === p.id
                ? 'bg-text text-white border-text dark:bg-primary dark:border-primary shadow-sm'
                : 'bg-white dark:bg-card border-border-light text-text-muted hover:text-text hover:border-border',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="mt-3 grid grid-cols-2 gap-3 p-3 rounded-lg bg-surface/60 border border-border-light">
          <div>
            <label className="block text-[11px] font-medium text-text-muted mb-1">Start date</label>
            <input
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => onCustomFromChange(e.target.value)}
              className="w-full h-9 rounded-lg border border-border-light bg-white dark:bg-card px-3 text-[13px] text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-text-muted mb-1">End date</label>
            <input
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => onCustomToChange(e.target.value)}
              className="w-full h-9 rounded-lg border border-border-light bg-white dark:bg-card px-3 text-[13px] text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
