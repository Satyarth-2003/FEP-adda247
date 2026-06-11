"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Search, Shield, Users, UserCheck, Loader2, Check, X } from "lucide-react";
import type { User, Role } from "@/types";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<Role, { label: string; color: string }> = {
  fep_admin:   { label: "Admin",   color: "text-violet-500 bg-violet-500/10 border-violet-500/25" },
  fep_manager: { label: "Manager", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/25" },
  fep_faculty: { label: "Faculty", color: "text-sky-500 bg-sky-500/10 border-sky-500/25" },
};

export default function AdminDashboard() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", email: "", phone: "", role: "fep_faculty" as Role, subjects: "", teachingSubject: "", examTarget: "" });

  const usersQ = useQuery<{ users: User[] }>({
    queryKey: ["admin-users"],
    queryFn: () => fetch("/api/admin/users").then(r => r.json()),
  });

  const createMut = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); setAdding(false); setDraft({ name: "", email: "", phone: "", role: "fep_faculty", subjects: "", teachingSubject: "", examTarget: "" }); },
  });

  const deleteMut = useMutation({
    mutationFn: (userId: string) =>
      fetch("/api/admin/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const users = usersQ.data?.users ?? [];
  const filtered = users.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const stats = {
    total: users.length,
    faculty: users.filter(u => u.role === "fep_faculty").length,
    managers: users.filter(u => u.role === "fep_manager").length,
    admins: users.filter(u => u.role === "fep_admin").length,
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 md:px-6 py-8 md:py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 rounded-full border border-border bg-bg-elev/50 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-fg-muted w-fit mb-4">
          <Shield className="h-3 w-3" />Admin Console
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">User Management</h1>
        <p className="text-sm text-fg-muted mb-6">Add, remove, and manage all FEP user accounts.</p>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Users} label="Total Users" value={stats.total} />
        <StatCard icon={UserCheck} label="Faculty" value={stats.faculty} />
        <StatCard icon={Shield} label="Managers" value={stats.managers} />
        <StatCard icon={Shield} label="Admins" value={stats.admins} />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-full border border-border bg-bg-elev/60 pl-9 pr-3 py-2 text-sm outline-none focus:border-fg/30" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="rounded-full border border-border bg-bg-elev/60 px-3 py-2 text-xs outline-none">
          <option value="all">All Roles</option>
          <option value="fep_faculty">Faculty</option>
          <option value="fep_manager">Manager</option>
          <option value="fep_admin">Admin</option>
        </select>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded-full bg-fg px-4 py-2 text-sm font-medium text-bg hover:bg-fg/90 transition-colors">
          <Plus className="h-3.5 w-3.5" />Add User
        </button>
      </div>

      {/* Add user form */}
      {adding && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-2xl p-5 mb-5">
          <h3 className="text-sm font-semibold mb-4">New User</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              placeholder="Full Name *" className="rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm text-fg outline-none" />
            <input value={draft.email} onChange={e => setDraft(d => ({ ...d, email: e.target.value }))}
              placeholder="Email *" className="rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm text-fg outline-none" />
            <input value={draft.phone} onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))}
              placeholder="Phone" className="rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm text-fg outline-none" />
            <select value={draft.role} onChange={e => setDraft(d => ({ ...d, role: e.target.value as Role }))}
              className="rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm text-fg outline-none">
              <option value="fep_faculty">Faculty</option>
              <option value="fep_manager">Manager</option>
              <option value="fep_admin">Admin</option>
            </select>
            <input value={draft.subjects} onChange={e => setDraft(d => ({ ...d, subjects: e.target.value }))}
              placeholder="Vertical (e.g. ssc, neet)" className="rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm text-fg outline-none" />
            <input value={draft.teachingSubject} onChange={e => setDraft(d => ({ ...d, teachingSubject: e.target.value }))}
              placeholder="Teaching Subject" className="rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm text-fg outline-none" />
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => createMut.mutate({
                ...draft,
                subjects: draft.subjects ? draft.subjects.split(",").map(s => s.trim()) : [],
              })}
              disabled={!draft.name || !draft.email || createMut.isPending}
              className="flex items-center gap-1.5 rounded-full bg-fg px-4 py-1.5 text-xs font-medium text-bg disabled:opacity-40">
              {createMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Create
            </button>
            <button onClick={() => setAdding(false)}
              className="flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-xs text-fg-muted hover:text-fg">
              <X className="h-3.5 w-3.5" />Cancel
            </button>
          </div>
          {createMut.data?.error && (
            <p className="mt-2 text-xs text-rose-500">{createMut.data.error}</p>
          )}
        </motion.div>
      )}

      {/* Users table */}
      <div className="glass rounded-2xl overflow-hidden">
        {usersQ.isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-fg-muted" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-fg-muted border-b border-border">
                  <th className="text-left px-5 py-3 font-medium">Name</th>
                  <th className="text-left px-3 py-3 font-medium">Email</th>
                  <th className="text-left px-3 py-3 font-medium">Role</th>
                  <th className="text-left px-3 py-3 font-medium">Cohort</th>
                  <th className="text-left px-3 py-3 font-medium">Subject</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const r = ROLE_LABELS[u.role] ?? ROLE_LABELS.fep_faculty;
                  return (
                    <tr key={u.userId} className="group border-b border-border/60 last:border-0 hover:bg-bg-elev/40 transition-colors">
                      <td className="px-5 py-2.5 font-medium text-fg/90 whitespace-nowrap">{u.name}</td>
                      <td className="px-3 py-2.5 text-fg-muted text-xs">{u.email}</td>
                      <td className="px-3 py-2.5">
                        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium", r.color)}>
                          {r.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-fg-muted text-xs">{u.cohort ?? "—"}</td>
                      <td className="px-3 py-2.5 text-fg-muted text-xs">{u.teachingSubject ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => { if (confirm(`Delete ${u.name}?`)) deleteMut.mutate(u.userId); }}
                          className="opacity-0 group-hover:opacity-100 text-fg-dim hover:text-rose-500 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5 py-3 border-t border-border text-[11px] text-fg-muted">
          Showing {filtered.length} of {users.length} users
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-fg-muted">
        <Icon className="h-3 w-3" />{label}
      </div>
      <div className="mt-1.5 text-mono text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}
