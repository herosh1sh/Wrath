import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const Badge = forwardRef(({
  children,
  variant = 'default',
  className,
  ...props
}, ref) => {
  const variants = {
    default: 'badge badge-primary',
    secondary: 'badge badge-secondary',
    success: 'badge badge-success',
    warning: 'badge badge-warning',
    error: 'badge badge-error',
    outline: 'badge badge-outline'
  };

  return (
    <span
      ref={ref}
      className={cn(variants[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';

export { Badge };