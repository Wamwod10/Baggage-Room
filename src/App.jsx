import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./store/AuthContext";
import { I18nProvider, useTranslation } from "./i18n/useTranslation";
import { getSettings } from "./utils/storage";
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";
import AppLoader from "./components/AppLoader/AppLoader";
import StateBlock from "./components/StateBlock/StateBlock";

import MainLayout from "./layout/MainLayout";
import Login from "./pages/Login/Login";
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));
const NewBaggage = lazy(() => import("./pages/NewBaggage/NewBaggage"));
const ActiveBaggage = lazy(() => import("./pages/ActiveBaggage/ActiveBaggage"));
const SalesHistory = lazy(() => import("./pages/SalesHistory/SalesHistory"));
const Expenses = lazy(() => import("./pages/Expenses/Expenses"));
const Shifts = lazy(() => import("./pages/Shifts/Shifts"));
const Notifications = lazy(() => import("./pages/Notifications/Notifications"));
const Settings = lazy(() => import("./pages/Settings/Settings"));

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

function SuperAdminRoute({ children }) {
  const { isSuperAdmin } = useAuth();
  const { t } = useTranslation();

  if (!isSuperAdmin) {
    return (
      <StateBlock
        type="lock"
        title={t("Access Denied")}
        description={t("Bu sahifa faqat rahbariyat uchun ochiq.")}
      />
    );
  }

  return children;
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
        <Route index element={<LazyPage><HomeRoute /></LazyPage>} />
        <Route
          path="analytics"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Analytics />
            </Suspense>
          }
        />
        <Route path="new-baggage" element={<LazyPage><NewBaggage /></LazyPage>} />
        <Route path="active-baggage" element={<LazyPage><ActiveBaggage /></LazyPage>} />
        <Route path="sales-history" element={<LazyPage><SalesHistory /></LazyPage>} />
        <Route path="expenses" element={<LazyPage><Expenses /></LazyPage>} />
        <Route path="shifts" element={<LazyPage><Shifts /></LazyPage>} />
        <Route path="notifications" element={<LazyPage><Notifications /></LazyPage>} />
        <Route
          path="settings"
          element={
            <LazyPage>
              <SuperAdminRoute>
                <Settings />
              </SuperAdminRoute>
            </LazyPage>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function RouteFallback() {
  const { t } = useTranslation();

  return <AppLoader label={`${t("Loading")}...`} />;
}

function LazyPage({ children }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
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
