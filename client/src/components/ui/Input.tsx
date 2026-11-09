import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
}

const fieldShell = 'space-y-1.5';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id || autoId;
    return (
      <div className={cn(fieldShell, className)}>
        {label && (
          <label htmlFor={inputId} className="label-base">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          className={cn('input-base', error && 'border-rose-400/60 focus:border-rose-400 focus:ring-rose-500/20')}
          {...props}
        />
        {error ? (
          <p className="text-xs font-medium text-rose-300">{error}</p>
        ) : hint ? (
          <p className="text-xs text-muted/80">{hint}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps>(
  ({ label, error, hint, className, id, rows = 5, ...props }, ref) => {
    const autoId = useId();
    const inputId = id || autoId;
    return (
      <div className={cn(fieldShell, className)}>
        {label && (
          <label htmlFor={inputId} className="label-base">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          aria-invalid={Boolean(error)}
          className={cn('input-base resize-y leading-6', error && 'border-rose-400/60')}
          {...props}
        />
        {error ? (
          <p className="text-xs font-medium text-rose-300">{error}</p>
        ) : hint ? (
          <p className="text-xs text-muted/80">{hint}</p>
        ) : null}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & FieldProps>(
  ({ label, error, hint, className, id, children, ...props }, ref) => {
    const autoId = useId();
    const inputId = id || autoId;
    return (
      <div className={cn(fieldShell, className)}>
        {label && (
          <label htmlFor={inputId} className="label-base">
            {label}
          </label>
        )}
        <select ref={ref} id={inputId} className={cn('input-base cursor-pointer', error && 'border-rose-400/60')} {...props}>
          {children}
        </select>
        {error ? (
          <p className="text-xs font-medium text-rose-300">{error}</p>
        ) : hint ? (
          <p className="text-xs text-muted/80">{hint}</p>
        ) : null}
      </div>
    );
  }
);
Select.displayName = 'Select';

export function Checkbox({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-center gap-2.5 text-sm text-muted', className)}>
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4 rounded border-line/20 bg-surface text-brand-500 focus:ring-brand-500/30"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm text-text">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full border transition',
          checked ? 'border-brand-400/50 bg-brand-500' : 'border-line/15 bg-elevated'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          )}
          style={{ height: 18, width: 18 }}
        />
      </button>
      {label && <span>{label}</span>}
    </label>
  );
}
