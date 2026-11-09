import { cn, initials } from '@/lib/utils';
import { assetUrl } from '@/lib/api';

const sizes = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
};

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-brand-400/30 bg-brand-gradient font-semibold text-white',
        sizes[size],
        className
      )}
      aria-hidden="true"
    >
      {src ? (
        <img src={assetUrl(src)} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        initials(name || '?')
      )}
    </span>
  );
}
