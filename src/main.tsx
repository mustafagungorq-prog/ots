import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import { AuthProvider } from '@/hooks/useAuth'
import { StudentDataProvider } from '@/hooks/useStudentData'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <StudentDataProvider>
          <App />
        </StudentDataProvider>
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
