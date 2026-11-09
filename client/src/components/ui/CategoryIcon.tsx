import {
  BadgeCheck,
  Binary,
  Bot,
  Boxes,
  BrainCircuit,
  Braces,
  CircuitBoard,
  CircleDot,
  CloudCog,
  Code2,
  Coffee,
  Cpu,
  Globe2,
  Layers,
  LayoutTemplate,
  Radio,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Terminal,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const icons: Record<string, LucideIcon> = {
  Terminal,
  ServerCog,
  Boxes,
  BadgeCheck,
  CircleDot,
  Code2,
  Braces,
  Coffee,
  Binary,
  Globe2,
  LayoutTemplate,
  Layers,
  Sparkles,
  BrainCircuit,
  Cpu,
  Radio,
  CircuitBoard,
  Bot,
  CloudCog,
  ShieldCheck,
};

export function CategoryIcon({
  name,
  className,
  color,
}: {
  name?: string | null;
  className?: string;
  color?: string;
}) {
  const Icon = (name && icons[name]) || Cpu;
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-xl border border-line/10 bg-elevated',
        className
      )}
      style={color ? { color, borderColor: `${color}33`, backgroundColor: `${color}14` } : undefined}
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}
