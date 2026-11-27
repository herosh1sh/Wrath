import { forwardRef } from 'react';

const Badge = forwardRef(({ className = '', variant = 'default', children, ...props }, ref) => {
  const variants = {
    default: 'bg-muted text-foreground-muted',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };

  return (
    <span
      ref={ref}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';

export default Badge;