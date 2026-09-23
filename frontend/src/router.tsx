import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { EmployeesPage } from './pages/EmployeesPage'
import { ProfilePage } from './pages/ProfilePage'
import { HistoryPage } from './pages/HistoryPage'
import { HrPage } from './pages/HrPage'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <EmployeesPage /> },
      { path: '/employee/:id', element: <ProfilePage /> },
      { path: '/employee/:id/history', element: <HistoryPage /> },
      { path: '/hr', element: <HrPage /> },
    ],
  },
])
