import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { RequireAuth, RequireOwnProfile } from './auth/guards'
import { AuthPage } from './pages/AuthPage'
import { EmployeesPage } from './pages/EmployeesPage'
import { ProfilePage } from './pages/ProfilePage'
import { HistoryPage } from './pages/HistoryPage'
import { HrPage } from './pages/HrPage'

export const router = createBrowserRouter([
  { path: '/login', element: <AuthPage mode="login" /> },
  { path: '/register', element: <AuthPage mode="register" /> },
  {
    element: <RequireAuth><AppLayout /></RequireAuth>,
    children: [
      // Список сотрудников и HR-аналитика — только для HR; сотрудник попадёт в свой профиль
      { path: '/', element: <RequireAuth role="hr"><EmployeesPage /></RequireAuth> },
      { path: '/hr', element: <RequireAuth role="hr"><HrPage /></RequireAuth> },
      { path: '/employee/:id', element: <RequireOwnProfile><ProfilePage /></RequireOwnProfile> },
      { path: '/employee/:id/history', element: <RequireOwnProfile><HistoryPage /></RequireOwnProfile> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
