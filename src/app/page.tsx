import Navigation from '@/components/Navigation'
import AuthGuard from '@/components/AuthGuard'

export default function Home() {
  return (
    <AuthGuard>
      <Navigation />
    </AuthGuard>
  )
}
