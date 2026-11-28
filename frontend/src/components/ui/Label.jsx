import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const Label = forwardRef(({
  className,
  required,
  children,
  ...props
}, ref) => {
  return (
    <label
      ref={ref}
      className={cn('block text-sm font-medium text-foreground-primary mb-1.5', className)}
      {...props}
    >
      {children}
      {required && <span className="text-error ml-1" aria-hidden="true">*</span>}
    </label>
  );
});

Label.displayName = 'Label';

export { Label };