import { forwardRef } from 'react';

const Card = forwardRef(({ className = '', children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`bg-surface border border-border rounded-md shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

const CardHeader = forwardRef(({ className = '', ...props }, ref) => {
  return (
    <div ref={ref} className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props} />
  );
});

CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef(({ className = '', ...props }, ref) => {
  return (
    <h3 ref={ref} className={`text-lg font-semibold leading-none tracking-tight ${className}`} {...props} />
  );
});

CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef(({ className = '', ...props }, ref) => {
  return (
    <p ref={ref} className={`text-sm text-foreground-muted ${className}`} {...props} />
  );
});

CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef(({ className = '', ...props }, ref) => {
  return (
    <div ref={ref} className={`p-6 pt-0 ${className}`} {...props} />
  );
});

CardContent.displayName = 'CardContent';

const CardFooter = forwardRef(({ className = '', ...props }, ref) => {
  return (
    <div ref={ref} className={`flex items-center p-6 pt-0 ${className}`} {...props} />
  );
});

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };