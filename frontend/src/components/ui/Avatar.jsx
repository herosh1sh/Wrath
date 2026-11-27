import { forwardRef } from 'react';

const Avatar = forwardRef(({ className = '', src, alt, fallback, size = 'default', ...props }, ref) => {
  const sizes = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    default: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
    xl: 'h-16 w-16 text-xl',
  };

  const [imageError, setImageError] = useState(false);

  if (src && !imageError) {
    return (
      <img
        ref={ref}
        src={src}
        alt={alt || fallback || 'Avatar'}
        className={`rounded-full object-cover ${sizes[size]} ${className}`}
        onError={() => setImageError(true)}
        {...props}
      />
    );
  }

  return (
    <div
      ref={ref}
      className={`flex items-center justify-center rounded-full bg-muted font-medium ${sizes[size]} ${className}`}
      {...props}
    >
      {fallback || alt?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
});

Avatar.displayName = 'Avatar';

import { useState } from 'react';

export default Avatar;