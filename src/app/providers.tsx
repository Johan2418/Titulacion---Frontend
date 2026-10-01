import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@/api/client'
import { AuthProvider } from '@/auth/AuthProvider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

export function crearQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        refetchOnWindowFocus: false,
        retry: (n, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && n < 2,
      },
    },
  })
}

export function Providers({
  children,
  client,
}: {
  children: React.ReactNode
  client: QueryClient
}) {
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <TooltipProvider delayDuration={300}>
          {children}
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
