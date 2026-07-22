import * as React from 'react'
import { cn } from './utils'

// Button vendorizado (shadcn/ui), recortado ao que o R0 usa (o botão de copiar).
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'muted'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
          variant === 'default' && 'bg-primary text-primary-foreground hover:opacity-90',
          variant === 'muted' && 'bg-muted text-muted-foreground hover:opacity-90',
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'
