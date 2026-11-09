import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  to?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
};

export function Logo({ className, showText = true, to = '/', size = 'md' }: LogoProps) {
  return (
    <Link
      to={to}
      className={cn('group inline-flex items-center gap-2.5', className)}
      aria-label="TechTuxAcademy home"
    >
      <img
        src="/logo.svg"
        alt=""
        className={cn('rounded-xl transition duration-300 group-hover:shadow-glow', sizeMap[size])}
      />
      {showText && (
        <span className="font-display text-lg font-bold tracking-tight text-text">
          Tech<span className="gradient-text">Tux</span>Academy
        </span>
      )}
    </Link>
  );
}
