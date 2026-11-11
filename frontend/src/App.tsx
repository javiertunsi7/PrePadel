import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router';
import { Mascot } from './components/Mascot';
import { TabBar } from './components/TabBar';
import { useMatchReminder, useScrollToTop } from './lib/hooks';
import { useAppState, useStore } from './lib/store';
import { Exercises } from './screens/Exercises';
import { Home } from './screens/Home';
import { Onboarding } from './screens/Onboarding';
import { Pain } from './screens/Pain';
import { Profile } from './screens/Profile';
import { ProgramDetail } from './screens/ProgramDetail';
import { Programs } from './screens/Programs';
import { RoutineScreen } from './screens/RoutineScreen';

/** Hoja para revisar todas las ilustraciones; no entra en la versión de producción. */
const DevSheet = import.meta.env.DEV ? lazy(() => import('./illustrations/DevSheet')) : null;

export function App() {
  useScrollToTop(useLocation().pathname);
  return (
    <Routes>
      {DevSheet && (
        <Route
          path="/dev/ilustraciones"
          element={
            <Suspense fallback={null}>
              <DevSheet />
            </Suspense>
          }
        />
      )}
      <Route path="/bienvenida" element={<Onboarding />} />
      <Route element={<RequirePlayer />}>
        <Route element={<Shell />}>
          <Route index element={<Home />} />
          <Route path="programas" element={<Programs />} />
          <Route path="programas/:slug" element={<ProgramDetail />} />
          <Route path="dolor" element={<Pain />} />
          <Route path="perfil" element={<Profile />} />
          <Route path="perfil/ejercicios" element={<Exercises />} />
        </Route>
        {/* La rutina va a pantalla completa, sin barra de pestañas. */}
        <Route path="rutina/:slug" element={<RoutineScreen />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** Sin cuestionario hecho no hay app: se manda a la bienvenida. */
function RequirePlayer() {
  const { token, me, content } = useAppState();
  if (!token || !me) {
    return <Navigate to="/bienvenida" replace />;
  }
  return content ? <Outlet /> : <LoadingContent />;
}

function Shell() {
  useMatchReminder();
  return (
    <div className="shell">
      <main className="screen">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}

/** Solo se ve si el móvil ha perdido el catálogo guardado y hay que volver a bajarlo. */
function LoadingContent() {
  const store = useStore();
  const { offline } = useAppState();
  return (
    <main className="screen screen--center">
      <Mascot mood="calm" size={120} />
      <h1>Preparando tus rutinas…</h1>
      {offline && (
        <>
          <p className="lead">No hay conexión. Hace falta internet para descargar las rutinas.</p>
          <button className="btn btn--primary" onClick={() => void store.sync()}>
            Reintentar
          </button>
        </>
      )}
    </main>
  );
}
