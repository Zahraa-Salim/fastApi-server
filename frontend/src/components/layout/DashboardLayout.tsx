/**
 * Main dashboard shell layout.
 * Coordinates sidebar/mobile navigation, theme mode, and logout behavior for protected pages.
 */
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "./Sidebar";
import { clearToken, getAuthUser } from "../../lib/auth";

type ThemeMode = "light" | "dark";

const titleByPath: Record<string, string> = {
  "/dashboard/users": "Admins",
  "/dashboard/authors": "Authors",
  "/dashboard/posts": "Posts",
};

function getInitialTheme(): ThemeMode {
  const stored = localStorage.getItem("theme") || localStorage.getItem("dashboard-theme");
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const location = useLocation();
  const navigate = useNavigate();
  const user = useMemo(() => getAuthUser(), []);

  const title = useMemo(() => titleByPath[location.pathname] || "Dashboard", [location.pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const onLogout = () => {
    clearToken();
    navigate("/login", { replace: true });
  };

  return (
    <div className="dashboard-root">
      <div className="dashboard-shell">
          <Sidebar
            mobileOpen={mobileOpen}
            onCloseMobile={() => setMobileOpen(false)}
            onLogout={onLogout}
            theme={theme}
            onToggleTheme={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
            user={user}
          />

        <main className="content-area">
          <div className="mobile-toolbar">
            <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="mobile-toolbar__title">{title}</h2>
          </div>

          <Outlet />
        </main>
      </div>
    </div>
  );
}
