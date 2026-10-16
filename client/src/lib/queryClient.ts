import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Dev helper — exposes queryClient on window for testing
if (import.meta.env.DEV) {
  (window as any).__queryClient = queryClient
}
