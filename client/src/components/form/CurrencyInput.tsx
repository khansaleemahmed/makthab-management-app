import * as React from 'react';
import { Input, type InputProps } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const CurrencyInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <div className="relative">
      <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        ₹
      </span>
      <Input ref={ref} type="number" className={cn('ps-7', className)} {...props} />
    </div>
  ),
);
CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };
