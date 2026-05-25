import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, Menu, Moon, Search, Settings, Shield, Sun, UserRound } from "lucide-react";
import { AuthContext } from "../../context/AuthContext.jsx";

function getInitials(name = "User") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

export default function TopNavbar({
  sidebarOpen,
  onToggleSidebar,
  unreadCount = 0,
  onNotificationClick,
  searchValue = "",
  onSearchChange,
}) {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("ayedos_theme") || "light");
  const [photoFailed, setPhotoFailed] = useState(false);
  const name = user?.name || "AYEDOS Member";
  const profilePhoto = user?.passportPhotoUrl || user?.profilePhotoUrl || user?.avatarUrl;

  useEffect(() => {
    setPhotoFailed(false);
  }, [profilePhoto]);

  useEffect(() => {
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("ayedos_theme", theme);
  }, [theme]);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 shadow-[0_12px_35px_rgba(15,23,42,0.04)] backdrop-blur-xl transition-colors duration-200 dark:border-slate-800 dark:bg-slate-950/90 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1500px] items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          <Menu size={21} />
        </button>


        <div className="relative ml-0 min-w-0 flex-1 md:ml-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
          <input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder="Search transactions, loans, statements..."
            className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 dark:border-slate-800 dark:bg-slate-900/50 dark:text-white dark:placeholder:text-slate-500 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:focus:border-emerald-500 dark:focus:bg-slate-900 dark:focus:ring-emerald-950/30"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNotificationClick || (() => navigate("/dashboard/user/notifications"))}
            className="relative grid h-11 w-11 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
            aria-label="Open notifications"
          >
            <Bell size={19} />
            {unreadCount > 0 ? (
              <span className="absolute right-2 top-2 grid min-h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white">
                {unreadCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            className="hidden h-11 w-11 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 sm:grid"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-slate-50 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-800 dark:hover:bg-slate-800"
              aria-label="Open profile menu"
            >
              <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-lg bg-slate-950 text-xs font-bold text-white dark:bg-slate-700 dark:text-white">
                {profilePhoto && !photoFailed ? (
                  <img
                    src={profilePhoto}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() => setPhotoFailed(true)}
                  />
                ) : (
                  getInitials(name)
                )}
              </span>
              <span className="hidden min-w-0 lg:block">
                <span className="block max-w-36 truncate text-sm font-semibold text-slate-950 dark:text-white">
                  {name}
                </span>
                <span className="block max-w-36 truncate text-xs text-slate-500 dark:text-slate-400">
                  {user?.email || "member@ayedos.co.ke"}
                </span>
              </span>
              <ChevronDown size={16} className="hidden text-slate-400 dark:text-slate-500 sm:block" />
            </button>

            {menuOpen ? (
              <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950">
                <div className="border-b border-slate-100 p-4 dark:border-slate-800">
                  <p className="font-semibold text-slate-950 dark:text-white">{name}</p>
                  <p className="truncate text-sm text-slate-500 dark:text-slate-400">{user?.email || "member@ayedos.co.ke"}</p>
                </div>
                <Link to="/dashboard/user/settings" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50 dark:hover:text-white">
                  <UserRound size={17} />
                  Profile settings
                </Link>
                <Link to="/dashboard/user/security" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50 dark:hover:text-white">
                  <Shield size={17} />
                  Security center
                </Link>
                <Link to="/dashboard/user/support" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50 dark:hover:text-white">
                  <Settings size={17} />
                  Support
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
