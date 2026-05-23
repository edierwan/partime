import { cn } from '@/lib/utils';
import { initialsForName } from '@/lib/staff';

export function Avatar({
  name,
  src,
  className,
  textClassName,
}: {
  name: string;
  src?: string | null;
  className?: string;
  textClassName?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('h-10 w-10 rounded-full object-cover bg-ink-100', className)}
      />
    );
  }

  return (
    <span className={cn('h-10 w-10 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-semibold', className, textClassName)}>
      {initialsForName(name)}
    </span>
  );
}