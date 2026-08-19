import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { RouterProvider, useRouter } from './router.js';
import { Navbar } from './components/Navbar.js';
import { AuthPage } from './pages/AuthPage.js';
import { ProjectListPage } from './pages/ProjectListPage.js';
import { NewProjectPage } from './pages/NewProjectPage.js';
import { ProjectDetailPage } from './pages/ProjectDetailPage.js';
import { Loader2 } from 'lucide-react';

const RouterView: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const { pathname, navigate } = useRouter();

  const cleanPath = pathname.replace(/^\/+/, '').replace(/\/+$/, '');

  // Active Route Guarding: sync browser URL with auth state
  React.useEffect(() => {
    if (!loading) {
      if (!isAuthenticated && cleanPath !== 'login') {
        navigate('/login');
      } else if (isAuthenticated && cleanPath === 'login') {
        navigate('/projects');
      }
    }
  }, [isAuthenticated, loading, cleanPath, navigate]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-grad-orange" />
      </div>
    );
  }

  // Unauthenticated users render Login page
  if (!isAuthenticated || cleanPath === 'login') {
    return <AuthPage />;
  }

  if (cleanPath === 'projects/new') {
    return <NewProjectPage />;
  }

  if (cleanPath.startsWith('projects/')) {
    const projectId = cleanPath.split('/')[1];
    if (projectId) {
      return <ProjectDetailPage projectId={projectId} />;
    }
  }

  // Default to Projects List (/projects or /)
  return <ProjectListPage />;
};

export const App: React.FC = () => {
  return (
    <RouterProvider>
      <AuthProvider>
        <div className="min-h-screen bg-grad-paper-2 flex flex-col font-sans">
          <Navbar />
          <main className="flex-1">
            <RouterView />
          </main>
        </div>
      </AuthProvider>
    </RouterProvider>
  );
};

export default App;
