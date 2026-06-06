import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./store/AuthContext";
import { I18nProvider, useTranslation } from "./i18n/useTranslation";
import { getSettings } from "./utils/storage";
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";
import AppLoader from "./components/AppLoader/AppLoader";

import MainLayout from "./layout/MainLayout";
import Login from "./pages/Login/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import NewBaggage from "./pages/NewBaggage/NewBaggage";
import ActiveBaggage from "./pages/ActiveBaggage/ActiveBaggage";
import SalesHistory from "./pages/SalesHistory/SalesHistory";
import Expenses from "./pages/Expenses/Expenses";
import Shifts from "./pages/Shifts/Shifts";
import Notifications from "./pages/Notifications/Notifications";
import Settings from "./pages/Settings/Settings";

const Analytics = lazy(() => import("./pages/Analytics/Analytics"));

function ProtectedRoute({ children }) {
  const { authLoading, isAuth } = useAuth();
  if (authLoading) return <RouteFallback />;
  return isAuth ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { authLoading, isAuth } = useAuth();
  if (authLoading) return <RouteFallback />;
  return isAuth ? <Navigate to="/" replace /> : children;
}

function HomeRoute() {
  const { isSuperAdmin } = useAuth();
  return isSuperAdmin ? <Dashboard /> : <Navigate to="/new-baggage" replace />;
}

function AppRoutes() {
  useEffect(() => {
    const settings = getSettings();

    document.body.classList.toggle("dark", settings.theme === "dark");
  }, []);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomeRoute />} />
        <Route
          path="analytics"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Analytics />
            </Suspense>
          }
        />
        <Route path="new-baggage" element={<NewBaggage />} />
        <Route path="active-baggage" element={<ActiveBaggage />} />
        <Route path="sales-history" element={<SalesHistory />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="shifts" element={<Shifts />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function RouteFallback() {
  const { t } = useTranslation();

  return <AppLoader label={`${t("Loading")}...`} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
