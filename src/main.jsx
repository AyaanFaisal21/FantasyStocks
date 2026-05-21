import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import './index.css'
import { AuthContextProvider } from './context/AuthContext'
import { hasSupabaseConfig, missingSupabaseConfig } from './supabaseClient'
import DeploymentConfigError from './Components/DeploymentConfigError'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {hasSupabaseConfig ? (
      <AuthContextProvider>
        <RouterProvider router={router} />
      </AuthContextProvider>
    ) : (
      <DeploymentConfigError missingKeys={missingSupabaseConfig} />
    )}
  </StrictMode>,
)
