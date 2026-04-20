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

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
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
            path: 'admin/bjj-techniques',
            element: (
              <AdminRoute>
                <BJJTechniqueListPage />
              </AdminRoute>
            ),
          },
          {
            path: 'admin/bjj-techniques/new',
            element: (
              <AdminRoute>
                <BJJTechniqueFormPage />
              </AdminRoute>
            ),
          },
          {
            path: 'admin/bjj-techniques/:id/edit',
            element: (
              <AdminRoute>
                <BJJTechniqueFormPage />
              </AdminRoute>
            ),
          },
        ],
      },
    ],
  },
])
