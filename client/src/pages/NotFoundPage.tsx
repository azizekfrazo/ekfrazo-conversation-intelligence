import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="text-6xl font-bold text-brand-200">404</div>
      <h1 className="text-xl font-semibold text-gray-800">Page not found</h1>
      <p className="text-gray-500 text-sm">The page you're looking for doesn't exist.</p>
      <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
    </div>
  )
}
