"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, LayoutGrid, LogOut, Menu, Settings, ShieldCheck, SquarePen, Users, Wallet, X, Boxes, BookOpen, Timer, Zap, CalendarClock, NotebookPen, Code2, BriefcaseBusiness } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { logoutAction } from "@/core/auth/actions";
import type { PublicUser } from "@/core/auth/roles";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutGrid },
  { href: "/admin/modules", label: "Modules", icon: Boxes },
  { href: "/admin/content", label: "Site content", icon: SquarePen },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/wallets", label: "Wallets", icon: Wallet },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/tests", label: "Tests", icon: Timer },
  { href: "/admin/doubts", label: "Doubts", icon: Zap },
  { href: "/admin/notes", label: "Notes", icon: NotebookPen },
  { href: "/admin/mentorship", label: "Mentorship", icon: CalendarClock },
  { href: "/admin/code", label: "Coding", icon: Code2 },
  { href: "/admin/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({ user, children }: { user: PublicUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const nav = (
    <div className="flex h-full flex-col p-4">
      <Logo href="/admin" />
      <span className="mt-4 flex w-fit items-center gap-1.5 rounded-full border border-rose/40 bg-rose/10 px-3 py-1 text-xs font-semibold text-rose">
        <ShieldCheck className="size-3.5" /> Admin panel
      </span>
      <nav className="mt-6 flex-1 space-y-1">
        {NAV.map((n) => {
          const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "text-fg" : "text-muted hover:bg-fg/[0.04] hover:text-fg",
              )}
            >
              {active && <motion.span layoutId="admin-active" className="absolute inset-0 rounded-xl bg-fg/[0.08] ring-1 ring-line" />}
              <n.icon className="relative size-[18px]" />
              <span className="relative">{n.label}</span>
            </Link>
          );
        })}
        <Link href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-fg/[0.04] hover:text-fg">
          <ExternalLink className="size-[18px]" /> View site
        </Link>
        <Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-fg/[0.04] hover:text-fg">
          <LayoutGrid className="size-[18px]" /> Student dashboard
        </Link>
      </nav>
      <form action={logoutAction} className="border-t border-line pt-4">
        <p className="truncate px-3 text-xs text-muted">{user.email}</p>
        <button className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-rose/10 hover:text-rose">
          <LogOut className="size-[18px]" /> Log out
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-svh">
      <aside className="glass fixed inset-y-3 left-3 z-40 hidden w-[272px] rounded-[24px] lg:block">{nav}</aside>

      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside
              initial={{ x: "-110%" }}
              animate={{ x: 0 }}
              exit={{ x: "-110%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed inset-y-3 left-3 z-50 w-72 rounded-[24px] bg-card-solid ring-1 ring-line lg:hidden"
            >
              <button onClick={() => setOpen(false)} className="absolute top-5 right-4 text-muted" aria-label="Close menu">
                <X className="size-5" />
              </button>
              {nav}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-[296px]">
        <header className="sticky top-0 z-30 px-3 pt-3 sm:px-5">
          <div className="glass flex items-center gap-3 rounded-2xl px-3 py-2.5">
            <button className="grid size-9 place-items-center rounded-xl hover:bg-fg/5 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="size-5" />
            </button>
            <p className="flex-1 text-sm text-muted">
              Signed in as <b className="text-fg">{user.name}</b>
            </p>
            <ThemeToggle />
          </div>
        </header>
        <main id="main" className="mx-auto max-w-5xl px-3 py-8 sm:px-5">{children}</main>
      </div>
    </div>
  );
}

export function AdminHeading({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-8">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {sub && <p className="mt-2 text-muted">{sub}</p>}
    </div>
  );
}
