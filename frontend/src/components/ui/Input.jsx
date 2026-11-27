import { forwardRef } from 'react';

const Input = forwardRef(({ className = '', type = 'text', error, ...props }, ref) => {
  return (
    <div className="w-full">
      <input
        ref={ref}
        type={type}
        className={`w-full rounded-sm border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted transition-all duration-fast focus:border-accent focus:ring-1 focus:ring-accent ${
          error ? 'border-destructive focus:border-destructive focus:ring-destructive' : 'border-border'
        } ${className}`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${props.id}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${props.id}-error`} className="mt-1 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;