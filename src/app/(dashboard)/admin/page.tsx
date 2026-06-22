"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Search, Shield, Users, UserCheck, Loader2, Check, X, Edit2 } from "lucide-react";
import type { User, Role } from "@/types";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<Role, { label: string; color: string }> = {
  eduskill_admin:   { label: "Admin",   color: "text-violet-500 bg-violet-500/10 border-violet-500/25" },
  eduskill_manager: { label: "Manager", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/25" },
  eduskill_faculty: { label: "Faculty", color: "text-sky-500 bg-sky-500/10 border-sky-500/25" },
};

export default function AdminDashboard() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", email: "", phone: "", role: "eduskill_faculty" as Role, subjects: "", teachingSubject: "", examTarget: "", cohort: "June EduSkill" });

  const usersQ = useQuery<{ users: User[] }>({
    queryKey: ["admin-users"],
    queryFn: () => fetch("/api/admin/users").then(r => r.json()),
  });

  const createMut = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); setAdding(false); setDraft({ name: "", email: "", phone: "", role: "eduskill_faculty", subjects: "", teachingSubject: "", examTarget: "", cohort: "June EduSkill" }); },
  });

  const deleteMut = useMutation({
    mutationFn: (userId: string) =>
      fetch("/api/admin/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ name: "", teachingSubject: "", cohort: "", subjects: "" });

  const updateMut = useMutation({
    mutationFn: (data: { userId: string; name: string; subjects: string[]; teachingSubject?: string; cohort?: string }) =>
      fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingUserId(null);
    }
  });

  function startEdit(u: User) {
    setEditingUserId(u.userId);
    setEditDraft({
      name: u.name || "",
      teachingSubject: u.teachingSubject || "",
      cohort: u.cohort || "",
      subjects: u.subjects ? u.subjects.join(", ") : "",
    });
  }

  function saveEdit(userId: string) {
    updateMut.mutate({
      userId,
      name: editDraft.name,
      teachingSubject: editDraft.teachingSubject || undefined,
      cohort: editDraft.cohort || undefined,
      subjects: editDraft.subjects ? editDraft.subjects.split(",").map(s => s.trim()).filter(Boolean) : [],
    });
  }

  const users = usersQ.data?.users ?? [];
  const filtered = users.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const stats = {
    total: users.length,
    faculty: users.filter(u => u.role === "eduskill_faculty").length,
    managers: users.filter(u => u.role === "eduskill_manager").length,
    admins: users.filter(u => u.role === "eduskill_admin").length,
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 md:px-6 py-8 md:py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 rounded-full border border-border bg-bg-elev/50 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-fg-muted w-fit mb-4">
          <Shield className="h-3 w-3" />Admin Console
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">User Management</h1>
        <p className="text-sm text-fg-muted mb-6">Add, remove, and manage all EduSkill user accounts.</p>
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
          <option value="eduskill_faculty">Faculty</option>
          <option value="eduskill_manager">Manager</option>
          <option value="eduskill_admin">Admin</option>
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
              <option value="eduskill_faculty">Faculty</option>
              <option value="eduskill_manager">Manager</option>
              <option value="eduskill_admin">Admin</option>
            </select>
            <input value={draft.subjects} onChange={e => setDraft(d => ({ ...d, subjects: e.target.value }))}
              placeholder="Vertical (e.g. ssc, neet)" className="rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm text-fg outline-none" />
            <input value={draft.teachingSubject} onChange={e => setDraft(d => ({ ...d, teachingSubject: e.target.value }))}
              placeholder="Teaching Subject" className="rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm text-fg outline-none" />
            <input value={draft.cohort} onChange={e => setDraft(d => ({ ...d, cohort: e.target.value }))}
              placeholder="Cohort (e.g. June EduSkill)" className="rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm text-fg outline-none" />
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
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const r = ROLE_LABELS[u.role] ?? ROLE_LABELS.eduskill_faculty;
                  const isEditing = editingUserId === u.userId;
                  return (
                    <tr key={u.userId} className="group border-b border-border/60 last:border-0 hover:bg-bg-elev/40 transition-colors">
                      <td className="px-5 py-2.5 font-medium text-fg/90 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDraft.name}
                            onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))}
                            className="rounded border border-border bg-bg px-2 py-1 text-xs w-full max-w-[150px] outline-none focus:border-fg/30"
                          />
                        ) : (
                          u.name
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-fg-muted text-xs">{u.email}</td>
                      <td className="px-3 py-2.5">
                        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium", r.color)}>
                          {r.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-fg-muted text-xs">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDraft.cohort}
                            onChange={e => setEditDraft(d => ({ ...d, cohort: e.target.value }))}
                            className="rounded border border-border bg-bg px-2 py-1 text-xs w-full max-w-[120px] outline-none focus:border-fg/30"
                          />
                        ) : (
                          u.cohort ?? "—"
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-fg-muted text-xs">
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={editDraft.teachingSubject}
                              onChange={e => setEditDraft(d => ({ ...d, teachingSubject: e.target.value }))}
                              placeholder="Teaching Subject"
                              className="rounded border border-border bg-bg px-2 py-1 text-[11px] w-full max-w-[150px] outline-none focus:border-fg/30"
                            />
                            <input
                              type="text"
                              value={editDraft.subjects}
                              onChange={e => setEditDraft(d => ({ ...d, subjects: e.target.value }))}
                              placeholder="Verticals (e.g. ssc, neet)"
                              className="rounded border border-border bg-bg px-2 py-1 text-[10px] w-full max-w-[150px] outline-none focus:border-fg/30"
                            />
                          </div>
                        ) : (
                          <>
                            <div>{u.teachingSubject || "—"}</div>
                            {u.subjects && u.subjects.length > 0 && (
                              <div className="text-[10px] text-fg-dim mt-0.5">
                                Verticals: {u.subjects.join(", ")}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-right whitespace-nowrap">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => saveEdit(u.userId)}
                              disabled={updateMut.isPending}
                              className="text-emerald-500 hover:bg-emerald-500/10 p-1.5 rounded-lg cursor-pointer inline-flex items-center justify-center border-none bg-transparent"
                              title="Save Changes"
                            >
                              {updateMut.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => setEditingUserId(null)}
                              className="text-fg-dim hover:text-rose-500 p-1.5 rounded-lg cursor-pointer inline-flex items-center justify-center border-none bg-transparent"
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => startEdit(u)}
                              className="text-fg-dim hover:text-emerald-500 p-1.5 hover:bg-emerald-500/10 rounded-lg cursor-pointer inline-flex items-center justify-center border-none bg-transparent"
                              title="Edit User"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => { if (confirm(`Delete ${u.name}?`)) deleteMut.mutate(u.userId); }}
                              className="text-fg-dim hover:text-rose-500 p-1.5 hover:bg-rose-500/10 rounded-lg cursor-pointer inline-flex items-center justify-center border-none bg-transparent"
                              title="Delete User"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
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
