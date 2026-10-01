import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm grid grid-cols-[0_1fr] has-[>svg]:grid-cols-[1rem_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        info: 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100',
        warning:
          'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100',
        destructive:
          'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100',
        success:
          'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
}
export function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('col-start-2 font-medium', className)} {...props} />
}
export function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('col-start-2 text-sm [&_p]:leading-relaxed', className)} {...props} />
}
