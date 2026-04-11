/**
 * Central application routing map.
 * Defines public auth routes, protected dashboard routes, client routes, and animated page transitions.
 */
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { AuthorsPage } from "../pages/dashboard/AuthorsPage";
import { PostsPage } from "../pages/dashboard/PostsPage";
import { UsersPage } from "../pages/dashboard/UsersPage";
import { ClientPostsPage } from "../pages/client/ClientPostsPage";
import { ClientProfilePage } from "../pages/client/ClientProfilePage";
import { getAuthUser, getToken } from "../lib/auth";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = getToken();
  const user = getAuthUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function RoleRoute({ children, role }: { children: ReactNode; role: "admin" | "client" }) {
  const user = getAuthUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.type !== role) {
    return <Navigate to={user.type === "admin" ? "/dashboard" : "/client"} replace />;
  }

  return <>{children}</>;
}

function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
    >
      {children}
    </motion.div>
  );
}

export function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/login"
          element={
            <PageTransition>
              <LoginPage />
            </PageTransition>
          }
        />
        <Route
          path="/register"
          element={
            <PageTransition>
              <RegisterPage />
            </PageTransition>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RoleRoute role="admin">
                <DashboardLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard/authors" replace />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="authors" element={<AuthorsPage />} />
          <Route path="posts" element={<PostsPage />} />
        </Route>

        <Route
          path="/client"
          element={
            <ProtectedRoute>
              <RoleRoute role="client">
                <Navigate to="/client/posts" replace />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/client/posts"
          element={
            <ProtectedRoute>
              <RoleRoute role="client">
                <PageTransition>
                  <ClientPostsPage />
                </PageTransition>
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/client/profile"
          element={
            <ProtectedRoute>
              <RoleRoute role="client">
                <PageTransition>
                  <ClientProfilePage />
                </PageTransition>
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
