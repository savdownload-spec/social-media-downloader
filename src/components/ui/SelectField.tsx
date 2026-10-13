'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, type LucideIcon } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: LucideIcon;
}

interface SelectFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  className?: string;
}

export function SelectField({
  id: externalId,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  error,
  className,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const autoId = useId();
  const fieldId = externalId ?? autoId;
  const listboxId = `${fieldId}-listbox`;

  const selectedOption = options.find((o) => o.value === value) ?? null;

  const updateCoords = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = rect.width;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - menuWidth - 8);

    // Decide whether menu opens below or above
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuHeight = Math.min(280, options.length * 44 + 12);
    const openAbove = spaceBelow < menuHeight + 8 && rect.top > menuHeight + 8;

    setCoords(
      openAbove
        ? { bottom: window.innerHeight - rect.top + 6, left, width: menuWidth }
        : { top: rect.bottom + 6, left, width: menuWidth }
    );
  }, [options.length]);

  useEffect(() => {
    if (!open) return;
    updateCoords();

    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleScroll(e: Event) {
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }

    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', updateCoords);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [open, updateCoords]);

  // Scroll active option into view inside the menu
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  // When opening, pre-select the active index to the currently selected option
  const handleOpen = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const idx = value ? options.findIndex((o) => o.value === value) : -1;
    setActiveIndex(idx);
    setOpen(true);
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOpen();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        const idx = value ? options.findIndex((o) => o.value === value) : -1;
        setActiveIndex(idx >= 0 ? idx : 0);
        setOpen(true);
      } else {
        setActiveIndex((prev) => Math.min(prev + 1, options.length - 1));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        const idx = value ? options.findIndex((o) => o.value === value) : -1;
        setActiveIndex(idx >= 0 ? idx : options.length - 1);
        setOpen(true);
      } else {
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
      if (!open) setOpen(true);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(options.length - 1);
      if (!open) setOpen(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  const handleMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < options.length) {
        handleSelect(options[activeIndex].value);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  const triggerClass = [
    'w-full h-11 rounded-xl border bg-white dark:bg-card px-4 text-sm text-left',
    'flex items-center gap-2',
    'focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-colors',
    'cursor-pointer select-none',
    error ? 'border-red-400' : 'border-border',
    className ?? '',
  ]
    .join(' ')
    .trim();

  const activeDescendantId =
    open && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  const menu =
    open && coords && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-label="Options"
            tabIndex={-1}
            onKeyDown={handleMenuKeyDown}
            style={{
              position: 'fixed',
              top: coords.top,
              bottom: coords.bottom,
              left: coords.left,
              width: coords.width,
              minWidth: 180,
            }}
            className="z-[200] bg-white dark:bg-card border border-border rounded-xl shadow-soft-lg py-1.5 max-h-[280px] overflow-y-auto"
          >
            {options.map((option, idx) => {
              const Icon = option.icon;
              const isSelected = option.value === value;
              const isActive = idx === activeIndex;
              return (
                <button
                  key={option.value}
                  id={`${listboxId}-option-${idx}`}
                  ref={(el) => {
                    optionRefs.current[idx] = el;
                  }}
                  role="option"
                  aria-selected={isSelected}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => handleSelect(option.value)}
                  className={[
                    'w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left transition-colors min-h-[44px]',
                    isSelected
                      ? 'text-primary bg-primary-light'
                      : isActive
                        ? 'bg-surface dark:bg-card-hover text-text'
                        : 'text-text-muted hover:bg-surface dark:hover:bg-card-hover hover:text-text',
                  ]
                    .join(' ')
                    .trim()}
                >
                  {Icon && (
                    <Icon
                      className="w-4 h-4 shrink-0 opacity-60"
                      aria-hidden="true"
                    />
                  )}
                  <span className="flex-1 truncate">{option.label}</span>
                  {isSelected && (
                    <Check
                      className="w-3.5 h-3.5 shrink-0 opacity-80"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        id={fieldId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={activeDescendantId}
        aria-invalid={!!error}
        onClick={handleOpen}
        onKeyDown={handleTriggerKeyDown}
        className={triggerClass}
      >
        {selectedOption?.icon && (
          <selectedOption.icon
            className="w-4 h-4 shrink-0 opacity-60 text-text-muted"
            aria-hidden="true"
          />
        )}
        <span
          className={`flex-1 truncate ${selectedOption ? 'text-text' : 'text-text-muted'}`}
        >
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {menu}
    </>
  );
}
