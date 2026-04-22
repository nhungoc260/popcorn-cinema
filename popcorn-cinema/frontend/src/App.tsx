import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/layout/Layout'

// Customer pages
import HomePage from './pages/HomePage'
import MoviesPage from './pages/MoviesPage'
import MovieDetailPage from './pages/MovieDetailPage'
import ShowtimesPage from './pages/ShowtimesPage'
import TheatersPage from './pages/TheatersPage'
import ProfilePage from './pages/ProfilePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'

/* =========================
   🔐 PRIVATE ROUTE (FIXED)
========================= */
function PrivateRoute({
  children,
  roles,
}: {
  children: React.ReactNode
  roles?: string[]
}) {
  const { user, token } = useAuthStore()

  if (!token) {
    // 🔥 Lưu FULL URL (quan trọng nhất)
    const currentUrl = window.location.pathname + window.location.search
    localStorage.setItem('redirectAfterLogin', currentUrl)

    // 🔥 backup groupRoom (optional nhưng nên có)
    const params = new URLSearchParams(window.location.search)
    const groupRoom = params.get('groupRoom')
    if (groupRoom) {
      localStorage.setItem('pendingGroupRoom', groupRoom)
    }

    return <Navigate to="/login" state={{ from: currentUrl }} replace />
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
