import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import { RequireAdmin, RequireAuth } from './components/guards';
import { Spinner } from './components/ui';
import { isConfigured } from './lib/supabase';
import { useAuth } from './stores/auth';
import { useCatalog } from './stores/catalog';
import { applySettings, useSettings } from './stores/settings';
import About from './pages/About';
import { ChangePassword, ForgotPassword, ResetPassword, SetupAdmin, SignIn, SignUp } from './pages/AuthPages';
import Calculator from './pages/Calculator';
import Dashboard from './pages/Dashboard';
import Feedback from './pages/Feedback';
import Glossary from './pages/Glossary';
import Home from './pages/Home';
import Library from './pages/Library';
import NotFound from './pages/NotFound';
import Notes from './pages/Notes';
import Planner from './pages/Planner';
import Pomodoro from './pages/Pomodoro';
import Privacy from './pages/Privacy';
import Profile from './pages/Profile';
import Progress from './pages/Progress';
import { QuizList, QuizPlay } from './pages/Quizzes';
import Tools from './pages/Tools';
import VoicePage from './pages/VoicePage';

// Heavy or admin-only screens load on demand (kinder to slow connections).
const ResourceView = lazy(() => import('./pages/ResourceView'));
const AdminPage = lazy(() => import('./pages/admin/AdminPage'));

function ConfigMissing() {
  return (
    <div className="mx-auto mt-16 max-w-xl rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-950">
      <h1 className="text-xl font-bold">Supabase is not connected yet</h1>
      <p className="mt-2">Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your environment (see <code>.env.example</code> and the README), then restart the app.</p>
    </div>
  );
}

function RecoveryWatcher() {
  const recovery = useAuth((s) => s.recovery);
  const nav = useNavigate();
  useEffect(() => { if (recovery) nav('/reset-password', { replace: true }); }, [recovery, nav]);
  return null;
}

export default function App() {
  const init = useAuth((s) => s.init);
  const userId = useAuth((s) => s.user?.id);
  const language = useSettings((s) => s.language);
  const textSize = useSettings((s) => s.textSize);
  const lowData = useSettings((s) => s.lowData);
  const loadCatalog = useCatalog((s) => s.load);

  useEffect(() => { if (isConfigured) return init(); }, [init]);
  useEffect(() => { if (isConfigured) void loadCatalog(); }, [loadCatalog, userId]);
  useEffect(() => { applySettings({ language, textSize, lowData }); }, [language, textSize, lowData]);

  if (!isConfigured) return <ConfigMissing />;
  const auth = (el: JSX.Element) => <RequireAuth>{el}</RequireAuth>;
  return (
    <BrowserRouter>
      <RecoveryWatcher />
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="signin" element={<SignIn />} />
            <Route path="signup" element={<SignUp />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route path="change-password" element={auth(<ChangePassword />)} />
            <Route path="setup" element={<SetupAdmin />} />
            <Route path="library" element={<Library />} />
            <Route path="library/:id" element={<ResourceView />} />
            <Route path="notes" element={<Notes />} />
            <Route path="quizzes" element={<QuizList />} />
            <Route path="quizzes/:id" element={<QuizPlay />} />
            <Route path="glossary" element={<Glossary />} />
            <Route path="tools" element={<Tools />} />
            <Route path="tools/calculator" element={<Calculator />} />
            <Route path="tools/timer" element={<Pomodoro />} />
            <Route path="tools/voice" element={<VoicePage />} />
            <Route path="planner" element={auth(<Planner />)} />
            <Route path="dashboard" element={auth(<Dashboard />)} />
            <Route path="progress" element={auth(<Progress />)} />
            <Route path="profile" element={auth(<Profile />)} />
            <Route path="feedback" element={<Feedback />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="about" element={<About />} />
            <Route path="admin" element={auth(<RequireAdmin><AdminPage /></RequireAdmin>)} />
            <Route path="home" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
