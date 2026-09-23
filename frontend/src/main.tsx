import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { USE_MOCK } from './api/client'
import { AuthProvider } from './auth/AuthContext'
import { router } from './router'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

async function enableMocking() {
  if (!USE_MOCK) return
  try {
    const { worker } = await import('./api/mock/browser')
    await worker.start({
      serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
      onUnhandledRequest: 'bypass',
      quiet: true,
    })
  } catch (e) {
    // Service Worker недоступен — запросы пойдут через запасной путь в api/client.ts
    console.warn('[mock] Service Worker не запущен, используется in-page режим', e)
  }
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
})
