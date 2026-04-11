import { createBrowserRouter, Navigate } from 'react-router'
import { AppShell } from './AppShell'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { WorkoutListPage } from '@/features/workouts/pages/WorkoutListPage'
import { WorkoutDetailPage } from '@/features/workouts/pages/WorkoutDetailPage'
import { WorkoutFormPage } from '@/features/workouts/pages/WorkoutFormPage'
import { AIChatPage } from '@/features/ai/AIChatPage'
import { ExerciseListPage, ExerciseFormPage } from '@/features/exercises/pages'
import { CalendarPage } from '@/features/calendar'

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
            element: <WorkoutFormPage />,
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
        ],
      },
    ],
  },
])
