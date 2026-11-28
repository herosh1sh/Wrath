import { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { getInitials } from '../../lib/utils';

const Avatar = forwardRef(({
  src,
  alt,
  name,
  size = 'md',
  className,
  ...props
}, ref) => {
  const sizes = {
    sm: 'avatar-sm',
    md: 'avatar-md',
    lg: 'avatar-lg',
    xl: 'avatar-xl'
  };

  const initials = name ? getInitials(name) : '?';

  return (
    <div
      ref={ref}
      className={cn('avatar', sizes[size], className)}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="font-medium">{initials}</span>
      )}
    </div>
  );
});

Avatar.displayName = 'Avatar';

export { Avatar };