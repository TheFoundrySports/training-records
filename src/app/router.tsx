import { createBrowserRouter, Navigate } from 'react-router'
import { AppShell } from './AppShell'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { AdminRoute } from '@/features/auth/AdminRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { WorkoutListPage } from '@/features/workouts/pages/WorkoutListPage'
import { WorkoutDetailPage } from '@/features/workouts/pages/WorkoutDetailPage'
import { WorkoutFormPage } from '@/features/workouts/pages/WorkoutFormPage'
import { WorkoutTypePicker } from '@/features/workouts/components/WorkoutTypePicker'
import { AIChatPage } from '@/features/ai/AIChatPage'
import { ExerciseListPage, ExerciseFormPage } from '@/features/exercises/pages'
import { CalendarPage } from '@/features/calendar'
import { BJJTechniqueListPage } from '@/features/admin/bjj-techniques/pages/BJJTechniqueListPage'
import { BJJTechniqueFormPage } from '@/features/admin/bjj-techniques/pages/BJJTechniqueFormPage'
import { BJJWorkoutFormPage } from '@/features/bjj/pages/BJJWorkoutFormPage'
import { AISettingsPage } from '@/features/admin/ai-settings/pages/AISettingsPage'
import { BeltProgressionPage } from '@/features/bjj/progression'
import { TechniqueThresholdsPage } from '@/features/admin/technique-thresholds/pages/TechniqueThresholdsPage'
import { AdminShell } from '@/features/admin/admin-shell/AdminShell'
import { UserManagementPage } from '@/features/admin/users/pages/UserManagementPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { AcceptInvitePage } from '@/features/auth/pages/AcceptInvitePage'
import { CreateUserPage } from '@/features/admin/create-user/pages/CreateUserPage'
import { RegistrationSettingsPage } from '@/features/admin/registration-settings/pages/RegistrationSettingsPage'
import { BJJDashboardRoute } from './DashboardRoute'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/accept-invite',
    element: <AcceptInvitePage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        index: true,
        element: <Navigate to="/workouts" replace />,
      },
      {
        element: <AppShell />,
        children: [
          {
            path: 'workouts',
            element: <WorkoutListPage />,
          },
          {
            path: 'workouts/new',
            element: <WorkoutTypePicker />,
          },
          {
            path: 'workouts/new/crossfit',
            element: <WorkoutFormPage />,
          },
          {
            path: 'bjj/new',
            element: <BJJWorkoutFormPage />,
          },
          {
            path: 'bjj/:id/edit',
            element: <BJJWorkoutFormPage />,
          },
          {
            path: 'workouts/:id',
            element: <WorkoutDetailPage />,
          },
          {
            path: 'workouts/:id/edit',
            element: <WorkoutFormPage />,
          },
          {
            path: 'ai',
            element: <AIChatPage />,
          },
          {
            path: 'exercises',
            element: <ExerciseListPage />,
          },
          {
            path: 'exercises/new',
            element: <ExerciseFormPage />,
          },
          {
            path: 'exercises/:id/edit',
            element: <ExerciseFormPage />,
          },
          {
            path: 'calendar',
            element: <CalendarPage />,
          },
          {
            path: 'admin',
            element: (
              <AdminRoute>
                <AdminShell />
              </AdminRoute>
            ),
            children: [
              {
                path: 'bjj-techniques',
                element: <BJJTechniqueListPage />,
              },
              {
                path: 'bjj-techniques/new',
                element: <BJJTechniqueFormPage />,
              },
              {
                path: 'bjj-techniques/:id/edit',
                element: <BJJTechniqueFormPage />,
              },
              {
                path: 'ai-settings',
                element: <AISettingsPage />,
              },
              {
                path: 'technique-thresholds',
                element: <TechniqueThresholdsPage />,
              },
              {
                path: 'users',
                element: <UserManagementPage />,
              },
              {
                path: 'create-user',
                element: <CreateUserPage />,
              },
              {
                path: 'registration-settings',
                element: <RegistrationSettingsPage />,
              },
            ],
          },
          {
            path: 'bjj/blue-belt-progression',
            element: <BeltProgressionPage />,
          },
          {
            // Code-split dashboard route (NFR-05). The lazy + Suspense
            // boundary lives in DashboardRoute.tsx so this module only
            // exports the router (Fast Refresh requirement).
            path: 'bjj/dashboard',
            element: <BJJDashboardRoute />,
          },
        ],
      },
    ],
  },
])
