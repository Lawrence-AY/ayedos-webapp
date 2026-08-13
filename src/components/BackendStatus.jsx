import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { apiRequest } from '../lib/apiClient.js'

async function checkHealth() {
  const res = await apiRequest('/api/health', {
    method: 'GET',
    timeoutMs: 8000,
    retry: true,
    cacheTtlMs: 30 * 1000,
  })

  if (!res.ok || res.json?.success === false || typeof res.json !== 'object') {
    throw res.error || new Error('Health check failed')
  }
  return res.json
}

export default function BackendStatus() {
  const location = useLocation()
  const isActiveRegistrationFlow = ['/register', '/onboarding'].includes(location.pathname)
  const { isError, isFetching, failureCount } = useQuery({
    queryKey: ['api-health'],
    queryFn: checkHealth,
    enabled: !isActiveRegistrationFlow,
    refetchInterval: isActiveRegistrationFlow ? false : 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 30 * 1000,
  })

  if (!isError && !(isFetching && failureCount > 0)) return null

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 shadow-lg">
      {isFetching ? 'Server is waking up. Please wait...' : 'Backend unavailable. Reconnecting...'}
    </div>
  )
}
