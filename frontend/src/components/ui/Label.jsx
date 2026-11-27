import { forwardRef } from 'react';

const Label = forwardRef(({ className = '', children, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={`block text-sm font-medium text-foreground ${className}`}
      {...props}
    >
      {children}
    </label>
  );
});

Label.displayName = 'Label';

export default Label;