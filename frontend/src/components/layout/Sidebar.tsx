/**
 * Sidebar navigation component.
 * Renders desktop/mobile nav links with active states and quick actions.
 */
import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "../ui/Button";
import type { ReactNode } from "react";
import type { AuthUser } from "../../types/api";

type ThemeMode = "light" | "dark";

type NavItem = {
  to: string;
  label: string;
  icon: ReactNode;
};

const links: NavItem[] = [
  {
    to: "/dashboard/authors",
    label: "Authors",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
      </svg>
    ),
  },
  {
    to: "/dashboard/posts",
    label: "Posts",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    to: "/dashboard/users",
    label: "Admins",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <path d="M20 8v6M23 11h-6" />
      </svg>
    ),
  },
];

type SidebarProps = {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  user: AuthUser | null;
};

function SidebarContent({
  onLogout,
  onToggleTheme,
  theme,
  user,
  onNavigate,
}: {
  onLogout: () => void;
  onToggleTheme: () => void;
  theme: ThemeMode;
  user: AuthUser | null;
  onNavigate?: () => void;
}) {
  const roleLabel = user?.type === "admin" ? "Admin" : "Client";

  return (
    <div className="sidebar-card">
      <div className="sidebar-brand">
        <p className="sidebar-brand__eyebrow">Content Platform</p>
        <h1 className="sidebar-brand__title">Verdant Blog</h1>
      </div>

      <nav className="sidebar-nav">
        {links
          .filter((link) => (link.to === "/dashboard/users" ? user?.type === "admin" : true))
          .map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              ["sidebar-nav__link", isActive ? "sidebar-nav__link--active" : ""].join(" ")
            }
          >
            <span className="sidebar-nav__icon">{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-profile-row">
          <div className="sidebar-profile">
            <span className="sidebar-profile__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20a8 8 0 0 1 16 0" />
              </svg>
            </span>
            <div className="sidebar-profile__info">
              <p className="sidebar-profile__name">{user ? `${user.first_name} ${user.last_name}` : "Admin"}</p>
              <p className="sidebar-profile__email">{user?.email || "admin@local"}</p>
              <span className="sidebar-profile__role">{roleLabel}</span>
            </div>
          </div>

          <button
            className={["theme-toggle", theme === "dark" ? "theme-toggle--dark" : ""].join(" ")}
            onClick={onToggleTheme}
            type="button"
            aria-label="Toggle theme"
          >
            <span className="theme-toggle__icon theme-toggle__icon--sun" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            </span>
            <span className="theme-toggle__icon theme-toggle__icon--moon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
            </span>
            <span className="theme-toggle__knob" />
          </button>
        </div>

        <Button variant="danger" fullWidth onClick={onLogout}>
          Logout
        </Button>
      </div>
    </div>
  );
}

export function Sidebar({
  mobileOpen,
  onCloseMobile,
  onLogout,
  theme,
  onToggleTheme,
  user,
}: SidebarProps) {
  return (
    <>
      <aside className="sidebar-desktop">
        <SidebarContent onLogout={onLogout} onToggleTheme={onToggleTheme} theme={theme} user={user} />
      </aside>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="sidebar-mobile-layer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button className="sidebar-mobile-backdrop" onClick={onCloseMobile} />
            <motion.aside
              className="sidebar-mobile-drawer"
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SidebarContent
                onLogout={onLogout}
                onToggleTheme={onToggleTheme}
                theme={theme}
                user={user}
                onNavigate={onCloseMobile}
              />
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
