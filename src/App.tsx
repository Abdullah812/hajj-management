import { BrowserRouter, Link, Route, Routes, Navigate, useNavigate } from 'react-router-dom'
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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  return user ? <>{children}</> : <Navigate to="/login" />
}

export function ManagerRoute({ children }: { children: React.ReactNode }) {
  const { userRole } = useAuthorization();
  const navigate = useNavigate();

  useEffect(() => {
    if (userRole && userRole !== 'manager') {
      console.log('Not a manager, redirecting...');
      navigate('/');
    }
  }, [userRole, navigate]);

  return userRole === 'manager' ? <>{children}</> : null;
}

function App() {
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
                      <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
                      <Route path="/pilgrims" element={<PrivateRoute><Pilgrims /></PrivateRoute>} />
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
                      <Route path="*" element={
                        <div className="min-h-[60vh] flex flex-col justify-center items-center">
                          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                          <p className="text-gray-600 mb-8">عذراً، الصفحة غير موجودة</p>
                          <Link
                            to="/"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                          >
                            العودة للرئيسية
                          </Link>
                        </div>
                      } />
                    </Routes>       
                  </div>
                </main>
              </Suspense>
            </div>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
export default App

