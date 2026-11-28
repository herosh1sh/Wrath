import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export const DividerBlock = forwardRef((
  { block, readOnly },
  ref
) => {
  return (
    <hr
      ref={ref}
      className={cn(
        'border-border-light my-6',
        'w-full'
      )}
      aria-hidden="true"
    />
  );
});

DividerBlock.displayName = 'DividerBlock';