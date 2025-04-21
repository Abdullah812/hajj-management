import { BrowserRouter, Route, Routes, Navigate, useNavigate } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Pilgrims } from './pages/Pilgrims'
import { Centers } from './pages/Centers'
import { Stages } from './pages/Stages'
import { Reports } from './pages/Reports'
import { Users } from './pages/Users'
import { Profile } from './pages/Profile'
import { Settings } from './pages/Settings'
import { RequireAuth } from './components/RequireAuth'
import { CenterDetails } from './pages/CenterDetails'
import { CenterDashboard } from './pages/CenterDashboard'
import { Suspense, useEffect } from 'react'
import { LoadingSpinner } from './components/LoadingSpinner'
import { ErrorBoundary } from './components/ErrorBoundary'
import { StagesList } from './pages/StagesList'
import { ThemeProvider } from './contexts/ThemeContext'
import { useAuthorization } from './hooks/useAuthorization'
import { ProtectedRoute } from './components/ProtectedRoute'
import { enableNewFeature } from './components/FeatureFlag'
import Footer from './components/Footer'
import { Buses } from './pages/Buses'
import Alerts from './pages/Alerts'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  return user ? <>{children}</> : <Navigate to="/login" />
}

export function ManagerRoute({ children }: { children: React.ReactNode }) {
  const { userRole } = useAuthorization();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (userRole && userRole !== 'manager' && userRole !== 'staff') {
      console.log('Not authorized, redirecting...');
      navigate('/');
    }
  }, [userRole, navigate]);

  return (userRole === 'manager' || userRole === 'staff') ? <>{children}</> : null;
}

function App() {
  useEffect(() => {
    const isFirstLoad = !localStorage.getItem('appInitialized');
    
    if (isFirstLoad) {
      enableNewFeature();
      localStorage.setItem('appInitialized', 'true');
    }
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <div className="min-h-screen bg-white dark:bg-gray-900">
              <Navbar />
              <Suspense fallback={<LoadingSpinner />}>
                <main className="pt-16">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Routes>
                      <Route path="/login" element={<Login />} />
                      <Route
                        path="/*"
                        element={
                          <ProtectedRoute>
                            <RequireAuth>
                              <Dashboard />
                            </RequireAuth>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/pilgrims"
                        element={
                          <PrivateRoute>
                            <Pilgrims />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/centers"
                        element={
                          <RequireAuth allowedRoles={['admin', 'manager']}>
                            <Centers />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/center/:id/*"
                        element={
                          <RequireAuth allowedRoles={['admin', 'manager']}>
                            <CenterDetails />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/stages"
                        element={
                          <RequireAuth allowedRoles={['admin', 'employee']}>
                            <Stages />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/reports"
                        element={
                          <PrivateRoute>
                            <Reports />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/users"
                        element={
                          <RequireAuth allowedRoles={['admin']}>
                            <Users />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <RequireAuth>
                            <Profile />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/settings"
                        element={
                          <RequireAuth>
                            <Settings />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/center-dashboard/:id"
                        element={
                          <ManagerRoute>
                            <CenterDashboard />
                          </ManagerRoute>
                        }
                      />
                      <Route
                        path="/center-details/:id"
                        element={
                          <ManagerRoute>
                            <CenterDetails />
                          </ManagerRoute>
                        }
                      />
                      <Route path="/stages-list" element={<StagesList />} />
                      <Route path="/buses" element={<Buses />} />
                      <Route path="/alerts" element={
                        <RequireAuth>
                          <Alerts />
                        </RequireAuth>
                      } />
                      <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>       
                  </div>
                </main>
                <Footer />
              </Suspense>
            </div>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
export default App

