import { Boxes, Megaphone, SquarePen, Users } from "lucide-react";
import Link from "next/link";
import { AdminHeading } from "@/components/admin/admin-shell";
import { ROLES } from "@/core/auth/roles";
import { listUsers } from "@/core/auth/users";
import { resolveModules } from "@/core/module-registry";
import { getSite } from "@/core/site/store";

export const metadata = { title: "Overview" };

export default async function AdminOverviewPage() {
  const [site, users] = await Promise.all([getSite(), listUsers()]);
  const modules = resolveModules(site.modules);
  const enabled = modules.filter((m) => m.enabled).length;
  const blocked = users.filter((u) => u.blocked).length;

  const stats = [
    { label: "Users", value: users.length, sub: blocked ? `${blocked} blocked` : "none blocked", href: "/admin/users", icon: Users },
    { label: "Modules live", value: `${enabled}/${modules.length}`, sub: "rest show Coming soon", href: "/admin/modules", icon: Boxes },
    { label: "Announcement", value: site.brand.announcement.enabled ? "On" : "Off", sub: "top bar on the landing page", href: "/admin/settings", icon: Megaphone },
  ];

  return (
    <>
      <AdminHeading title="Control tower" sub="Everything on the site is managed from here. Changes go live the moment you save." />

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="glass group rounded-[24px] p-5 transition-transform hover:-translate-y-1">
            <s.icon className="size-5 text-muted" />
            <p className="mt-4 font-display text-4xl font-bold tracking-tight">{s.value}</p>
            <p className="mt-1 text-sm font-semibold">{s.label}</p>
            <p className="text-xs text-muted">{s.sub}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="glass rounded-[24px] p-5">
          <h2 className="font-display text-lg font-bold">Users by role</h2>
          <ul className="mt-4 space-y-2">
            {ROLES.map((r) => {
              const n = users.filter((u) => u.role === r).length;
              return (
                <li key={r} className="flex items-center gap-3 text-sm">
                  <span className="w-24 capitalize">{r}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-fg/5">
                    <span className="block h-full rounded-full bg-gradient-to-r from-saffron to-rose" style={{ width: `${users.length ? (n / users.length) * 100 : 0}%` }} />
                  </span>
                  <span className="w-8 text-right font-semibold tabular-nums">{n}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="glass rounded-[24px] p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Modules</h2>
            <Link href="/admin/modules" className="text-sm font-semibold text-primary hover:underline">
              Manage
            </Link>
          </div>
          <ul className="mt-4 space-y-2">
            {modules.map((m) => (
              <li key={m.key} className="flex items-center gap-3 text-sm">
                <span className="grid size-8 place-items-center rounded-lg text-white" style={{ background: `linear-gradient(135deg, ${m.colors[0]}, ${m.colors[1]})` }}>
                  <m.icon className="size-4" />
                </span>
                <span className="flex-1">{m.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.enabled ? "bg-teal/15 text-teal" : "bg-fg/5 text-muted"}`}>
                  {m.enabled ? "Enabled" : "Disabled"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Link href="/admin/content" className="glass mt-6 flex items-center gap-4 rounded-[24px] p-5 transition-transform hover:-translate-y-1">
        <SquarePen className="size-6 text-saffron" />
        <span>
          <span className="block font-semibold">Edit site content</span>
          <span className="text-sm text-muted">Hero, marquee, stats, journey, roles, call-to-action and dashboard text.</span>
        </span>
      </Link>
    </>
  );
}
