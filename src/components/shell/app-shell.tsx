"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, ChevronsLeft, LayoutDashboard, Lock, LogOut, Menu, Search, ShieldCheck, UserRound, Wallet, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BirdMark, Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { logoutAction } from "@/core/auth/actions";
import type { PublicUser } from "@/core/auth/roles";
import { useModules } from "@/core/site/site-context";
import { SUMMARY_EVENT } from "@/lib/summary";
import { cn, formatPaise } from "@/lib/utils";

const CORE_LINKS = [
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "Profile", icon: UserRound },
];
const ADMIN_LINK = { href: "/admin", label: "Admin", icon: ShieldCheck };

export function AppShell({
  user,
  balance: initialBalance,
  unread: initialUnread,
  children,
}: {
  user: PublicUser;
  /** Paise */
  balance: number;
  unread: number;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [{ balance, unread }, setSummary] = useState({ balance: initialBalance, unread: initialUnread });
  const pathname = usePathname();

  // The layout isn't re-rendered on client navigation, so the header numbers are
  // re-read here: on every navigation and whenever something calls refreshSummary().
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/me/summary", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((s) => alive && s && setSummary({ balance: s.balance, unread: s.unread }))
        .catch(() => {});
    load();
    window.addEventListener(SUMMARY_EVENT, load);
    return () => {
      alive = false;
      window.removeEventListener(SUMMARY_EVENT, load);
    };
  }, [pathname]);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("gg-sidebar") === "1");
    } catch {}
  }, []);
  useEffect(() => setMobileOpen(false), [pathname]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem("gg-sidebar", c ? "0" : "1");
      } catch {}
      return !c;
    });
  };

  return (
    <div className="relative min-h-svh">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-[-30%] right-[-10%] size-[50vmax] animate-aurora rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-30%] left-[-10%] size-[40vmax] animate-aurora rounded-full bg-rose/10 blur-[120px]" style={{ animationDelay: "-9s" }} />
      </div>

      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 84 : 264 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-y-3 left-3 z-40 hidden flex-col rounded-[24px] glass lg:flex"
      >
        <SidebarContent collapsed={collapsed} pathname={pathname} user={user} />
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute top-8 -right-3 grid size-6 place-items-center rounded-full border border-line bg-card-solid text-muted shadow hover:text-fg"
        >
          <ChevronsLeft className={cn("size-3.5 transition-transform", collapsed && "rotate-180")} />
        </button>
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-110%" }}
              animate={{ x: 0 }}
              exit={{ x: "-110%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed inset-y-3 left-3 z-50 flex w-72 flex-col rounded-[24px] bg-card-solid ring-1 ring-line lg:hidden"
            >
              <button onClick={() => setMobileOpen(false)} className="absolute top-5 right-4 text-muted" aria-label="Close menu">
                <X className="size-5" />
              </button>
              <SidebarContent collapsed={false} pathname={pathname} user={user} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <motion.div
        initial={false}
        animate={{ paddingLeft: collapsed ? 108 : 288 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="max-lg:!pl-0"
      >
        <header className="sticky top-0 z-30 px-3 pt-3 sm:px-5">
          <div className="glass flex items-center gap-3 rounded-2xl px-3 py-2.5">
            <button className="grid size-9 place-items-center rounded-xl hover:bg-fg/5 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu className="size-5" />
            </button>
            <label className="flex flex-1 items-center gap-2 rounded-xl bg-fg/[0.04] px-3 py-2 text-sm text-muted">
              <Search className="size-4 shrink-0" />
              <input aria-label="Search" placeholder="Search courses, tests, notes, mentors…" className="w-full bg-transparent outline-none placeholder:text-muted" />
              <kbd className="hidden rounded-md border border-line px-1.5 text-[10px] sm:block">Ctrl K</kbd>
            </label>
            <Link href="/wallet" className="hidden items-center gap-2 rounded-xl bg-gradient-to-r from-teal/20 to-primary/20 px-3 py-2 text-sm font-semibold sm:flex">
              <Wallet className="size-4 text-teal" />
              {formatPaise(balance)}
            </Link>
            <Link href="/notifications" className="relative grid size-10 place-items-center rounded-full glass" aria-label="Notifications">
              <Bell className="size-4" />
              {unread > 0 && (
                <motion.span
                  key={unread}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose px-1 text-[10px] font-bold text-white ring-2 ring-bg"
                >
                  {unread > 9 ? "9+" : unread}
                </motion.span>
              )}
            </Link>
            <ThemeToggle />
            <Link
              href="/profile"
              title={user.name}
              className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-saffron to-rose font-bold text-white uppercase"
              aria-label="Profile"
            >
              {user.name.charAt(0)}
            </Link>
          </div>
        </header>
        {/*
          Enter animation only. No AnimatePresence here: with mode="wait" and no exit
          animation, the previous page's exit is finalised on the next re-render, which
          remounted the new page on the user's first keystroke and wiped form state.
        */}
        <motion.main
            key={pathname}
            // No `filter` here: a lingering filter (even blur(0px)) turns <main> into the
            // containing block for position:fixed children, so modals and sticky bars
            // inside pages were clipped to the content area instead of the viewport.
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            id="main"
            className="px-3 py-8 sm:px-5"
          >
            {children}
          </motion.main>
      </motion.div>
    </div>
  );
}

function SidebarContent({ collapsed, pathname, user }: { collapsed: boolean; pathname: string; user: PublicUser }) {
  const modules = useModules();
  const accountLinks = user.role === "admin" ? [...CORE_LINKS, ADMIN_LINK] : CORE_LINKS;
  return (
    <div className="flex h-full flex-col overflow-hidden p-4">
      <div className="h-11">
        {collapsed ? (
          <Link href="/" className="grid size-11 place-items-center rounded-2xl bg-fg/5" aria-label="Home">
            <BirdMark className="w-7" />
          </Link>
        ) : (
          <Logo />
        )}
      </div>

      <nav className="mt-8 flex-1 space-y-6 overflow-y-auto overflow-x-hidden">
        <NavGroup title="Overview" collapsed={collapsed}>
          <NavItem href="/dashboard" label="Home" icon={LayoutDashboard} active={pathname === "/dashboard"} collapsed={collapsed} />
        </NavGroup>
        <NavGroup title="Modules" collapsed={collapsed}>
          {modules.map((m) => (
            <NavItem
              key={m.key}
              href={m.href}
              label={m.name}
              icon={m.icon}
              active={pathname.startsWith(m.href)}
              collapsed={collapsed}
              locked={!m.enabled}
              color={m.colors[0]}
            />
          ))}
        </NavGroup>
        <NavGroup title="Account" collapsed={collapsed}>
          {accountLinks.map((l) => (
            <NavItem key={l.href} href={l.href} label={l.label} icon={l.icon} active={pathname.startsWith(l.href)} collapsed={collapsed} />
          ))}
        </NavGroup>
      </nav>

      <form action={logoutAction} className="mt-4 border-t border-line pt-4">
        <button
          title={collapsed ? "Log out" : undefined}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-rose/10 hover:text-rose"
        >
          <LogOut className="size-[18px] shrink-0" />
          {!collapsed && (
            <span className="flex-1 truncate text-left">
              Log out <span className="block truncate text-[11px] font-normal opacity-70">{user.email}</span>
            </span>
          )}
        </button>
      </form>
    </div>
  );
}

function NavGroup({ title, collapsed, children }: { title: string; collapsed: boolean; children: React.ReactNode }) {
  return (
    <div>
      <p className={cn("mb-2 px-3 text-[10px] font-bold tracking-[0.25em] text-muted uppercase transition-opacity", collapsed && "opacity-0")}>{title}</p>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  locked,
  color,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  active: boolean;
  collapsed: boolean;
  locked?: boolean;
  color?: string;
}) {
  return (
    <li>
      <Link
        href={href}
        title={collapsed ? label : undefined}
        className={cn(
          "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          active ? "text-fg" : "text-muted hover:bg-fg/[0.04] hover:text-fg",
        )}
      >
        {active && (
          <motion.span layoutId="side-active" className="absolute inset-0 rounded-xl bg-fg/[0.08] ring-1 ring-line" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
        )}
        <Icon className="relative size-[18px] shrink-0" style={active && color ? { color } : undefined} />
        {!collapsed && <span className="relative flex-1 truncate">{label}</span>}
        {!collapsed && locked && <Lock className="relative size-3.5 opacity-60" />}
      </Link>
    </li>
  );
}
