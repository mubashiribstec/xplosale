"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface AdminUser {
  id: string;
  phone: string | null;
  name: string | null;
  role: string;
  verificationStatus: string;
  canCreateShop: boolean;
  bannedAt: string | null;
  createdAt: string;
  sellerProfile: { id: string } | null;
  networkProfile: { handle: string } | null;
}

interface AdminUsersTableProps {
  users: AdminUser[];
  total: number;
  page: number;
  pages: number;
}

const MARKETPLACE_CATEGORIES = ["Vehicles", "Mobiles", "Electronics", "Property", "Home & Living", "Appliances", "Fashion", "Gaming", "Other"];
const JOB_CATEGORIES = ["Technology", "Finance", "Healthcare", "Education", "Marketing", "Sales", "Engineering", "Design", "Operations", "HR", "Legal", "Other"];
const SECTIONS = ["MARKETPLACE", "JOBS", "SHOPS", "NETWORK"];
const DURATION_OPTIONS = [
  { label: "1 day", hours: 24 },
  { label: "7 days", hours: 168 },
  { label: "30 days", hours: 720 },
  { label: "Permanent", hours: 0 },
];

const roleBadge: Record<string, string> = {
  USER: "bg-gray-100 text-gray-700",
  PARTNER: "bg-blue-100 text-blue-700",
  ADMIN: "bg-red-100 text-red-700",
};

const verificationBadge: Record<string, string> = {
  VERIFIED: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  REJECTED: "bg-red-100 text-red-700",
  UNVERIFIED: "bg-gray-100 text-gray-500",
};

interface BanModalState {
  userId: string;
  name: string;
  reason: string;
  duration: number; // hours, 0 = permanent
  sections: string[];
  marketplaceCategories: string[];
  jobCategories: string[];
  loading: boolean;
  error: string;
}

export default function AdminUsersTable({ users, total, page, pages }: AdminUsersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banModal, setBanModal] = useState<BanModalState | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkBanModal, setBulkBanModal] = useState<{ reason: string; duration: number; loading: boolean; error: string } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ userId: string; name: string } | null>(null);

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value); else params.delete(key);
      params.set("page", "1");
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  async function saveRole(userId: string) {
    const newRole = pendingRoles[userId];
    if (!newRole) return;
    setSaving(userId);
    setErrors((prev) => ({ ...prev, [userId]: "" }));
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) {
        setPendingRoles((prev) => { const next = { ...prev }; delete next[userId]; return next; });
        router.refresh();
      } else {
        setErrors((prev) => ({ ...prev, [userId]: json.error ?? "Failed" }));
      }
    } catch {
      setErrors((prev) => ({ ...prev, [userId]: "Network error" }));
    } finally {
      setSaving(null);
    }
  }

  function openBanModal(user: AdminUser) {
    setBanModal({
      userId: user.id,
      name: user.name ?? "User",
      reason: "",
      duration: 168,
      sections: [],
      marketplaceCategories: [],
      jobCategories: [],
      loading: false,
      error: "",
    });
  }

  async function submitBan() {
    if (!banModal || !banModal.reason.trim()) {
      setBanModal((prev) => prev ? { ...prev, error: "Reason is required." } : null);
      return;
    }
    setBanModal((prev) => prev ? { ...prev, loading: true, error: "" } : null);
    const bannedUntil = banModal.duration > 0
      ? new Date(Date.now() + banModal.duration * 60 * 60 * 1000).toISOString()
      : undefined;
    try {
      const res = await fetch(`/api/admin/users/${banModal.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ban: true,
          reason: banModal.reason,
          bannedUntil,
          bannedSections: banModal.sections,
          bannedMarketplaceCategories: banModal.marketplaceCategories,
          bannedJobCategories: banModal.jobCategories,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) {
        setBanModal(null);
        router.refresh();
      } else {
        setBanModal((prev) => prev ? { ...prev, loading: false, error: json.error ?? "Failed" } : null);
      }
    } catch {
      setBanModal((prev) => prev ? { ...prev, loading: false, error: "Network error" } : null);
    }
  }

  async function toggleShopkeeper(userId: string, current: boolean) {
    setSaving(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canCreateShop: !current }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) router.refresh();
      else setErrors((prev) => ({ ...prev, [userId]: json.error ?? "Failed" }));
    } catch {
      setErrors((prev) => ({ ...prev, [userId]: "Network error" }));
    } finally {
      setSaving(null);
    }
  }

  async function grantAll(userId: string) {
    setSaving(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canCreateShop: true }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) router.refresh();
      else setErrors((prev) => ({ ...prev, [userId]: json.error ?? "Failed" }));
    } catch {
      setErrors((prev) => ({ ...prev, [userId]: "Network error" }));
    } finally {
      setSaving(null);
    }
  }

  async function unban(userId: string) {
    setSaving(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ban: false, reason: "Unbanned by admin" }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) router.refresh();
      else setErrors((prev) => ({ ...prev, [userId]: json.error ?? "Failed" }));
    } catch {
      setErrors((prev) => ({ ...prev, [userId]: "Network error" }));
    } finally {
      setSaving(null);
    }
  }

  async function submitDelete() {
    if (!deleteModal) return;
    setSaving(deleteModal.userId);
    try {
      const res = await fetch(`/api/admin/users/${deleteModal.userId}`, { method: "DELETE" });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) {
        setDeleteModal(null);
        router.refresh();
      } else {
        setErrors((prev) => ({ ...prev, [deleteModal.userId]: json.error ?? "Failed" }));
      }
    } catch {
      setErrors((prev) => ({ ...prev, [deleteModal.userId]: "Network error" }));
    } finally {
      setSaving(null);
    }
  }

  function toggleArray<T>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
  }

  const selectableUsers = users.filter((u) => u.role !== "ADMIN");

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      selectableUsers.length > 0 && selectableUsers.every((u) => prev.has(u.id))
        ? new Set()
        : new Set(selectableUsers.map((u) => u.id))
    );
  }

  async function bulkUnban() {
    const userIds = Array.from(selected);
    if (userIds.length === 0) return;
    setBulkLoading(true);
    setBulkError(null);
    try {
      const res = await fetch("/api/admin/users/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds, action: "unban" }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) {
        setSelected(new Set());
        router.refresh();
      } else {
        setBulkError(json.error ?? "Failed");
      }
    } catch {
      setBulkError("Network error");
    } finally {
      setBulkLoading(false);
    }
  }

  async function submitBulkBan() {
    if (!bulkBanModal || !bulkBanModal.reason.trim()) {
      setBulkBanModal((p) => p ? { ...p, error: "Reason is required." } : null);
      return;
    }
    const userIds = Array.from(selected);
    setBulkBanModal((p) => p ? { ...p, loading: true, error: "" } : null);
    const bannedUntil = bulkBanModal.duration > 0
      ? new Date(Date.now() + bulkBanModal.duration * 60 * 60 * 1000).toISOString()
      : undefined;
    try {
      const res = await fetch("/api/admin/users/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds, action: "ban", reason: bulkBanModal.reason, bannedUntil }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) {
        setBulkBanModal(null);
        setSelected(new Set());
        router.refresh();
      } else {
        setBulkBanModal((p) => p ? { ...p, loading: false, error: json.error ?? "Failed" } : null);
      }
    } catch {
      setBulkBanModal((p) => p ? { ...p, loading: false, error: "Network error" } : null);
    }
  }

  return (
    <div className="space-y-4 pb-16">
      {/* Ban modal */}
      {banModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Ban {banModal.name}</h2>
              <button onClick={() => setBanModal(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Reason (required)</label>
              <textarea
                value={banModal.reason}
                onChange={(e) => setBanModal((p) => p ? { ...p, reason: e.target.value } : null)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                rows={2}
                placeholder="Explain the reason for this ban…"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Duration</label>
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setBanModal((p) => p ? { ...p, duration: opt.hours } : null)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      banModal.duration === opt.hours
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Platform sections (optional — leave empty for full ban)</label>
              <div className="flex flex-wrap gap-2">
                {SECTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setBanModal((p) => p ? { ...p, sections: toggleArray(p.sections, s) } : null)}
                    className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                      banModal.sections.includes(s)
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Marketplace categories (optional)</label>
              <div className="flex flex-wrap gap-1.5">
                {MARKETPLACE_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setBanModal((p) => p ? { ...p, marketplaceCategories: toggleArray(p.marketplaceCategories, c) } : null)}
                    className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                      banModal.marketplaceCategories.includes(c)
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Job categories (optional)</label>
              <div className="flex flex-wrap gap-1.5">
                {JOB_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setBanModal((p) => p ? { ...p, jobCategories: toggleArray(p.jobCategories, c) } : null)}
                    className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                      banModal.jobCategories.includes(c)
                        ? "bg-purple-500 text-white border-purple-500"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {banModal.error && (
              <p className="text-xs text-red-600">{banModal.error}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBanModal(null)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitBan()}
                disabled={banModal.loading}
                className="flex-1 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {banModal.loading ? "Banning…" : "Ban User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk ban modal */}
      {bulkBanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Ban {selected.size} user{selected.size !== 1 ? "s" : ""}</h2>
              <button onClick={() => setBulkBanModal(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Reason (required)</label>
              <textarea
                value={bulkBanModal.reason}
                onChange={(e) => setBulkBanModal((p) => p ? { ...p, reason: e.target.value } : null)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                rows={2}
                placeholder="Explain the reason for this ban…"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Duration</label>
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setBulkBanModal((p) => p ? { ...p, duration: opt.hours } : null)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      bulkBanModal.duration === opt.hours
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {bulkBanModal.error && (
              <p className="text-xs text-red-600">{bulkBanModal.error}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkBanModal(null)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitBulkBan()}
                disabled={bulkBanModal.loading}
                className="flex-1 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {bulkBanModal.loading ? "Banning…" : `Ban ${selected.size} User${selected.size !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-bold text-gray-900">Delete {deleteModal.name}?</h2>
            <p className="text-sm text-gray-600">
              This permanently deletes the user and all their data (shops, listings, applications, messages). This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitDelete()}
                disabled={saving === deleteModal.userId}
                className="flex-1 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {saving === deleteModal.userId ? "Deleting…" : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="search"
          defaultValue={searchParams.get("search") ?? ""}
          placeholder="Search name or phone…"
          onChange={(e) => updateParam("search", e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-60"
        />
        <select
          defaultValue={searchParams.get("role") ?? ""}
          onChange={(e) => updateParam("role", e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All roles</option>
          <option value="USER">USER</option>
          <option value="PARTNER">PARTNER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <select
          defaultValue={searchParams.get("status") ?? ""}
          onChange={(e) => updateParam("status", e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          <option value="UNVERIFIED">UNVERIFIED</option>
          <option value="PENDING">PENDING</option>
          <option value="VERIFIED">VERIFIED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
        <span className="text-sm text-gray-500 ml-auto">{total} user{total !== 1 ? "s" : ""}</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500 w-8">
                <input
                  type="checkbox"
                  checked={selectableUsers.length > 0 && selectableUsers.every((u) => selected.has(u.id))}
                  onChange={toggleSelectAll}
                  aria-label="Select all users"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Phone</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Joined</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No users found.</td>
              </tr>
            ) : (
              users.map((user) => {
                const isBanned = !!user.bannedAt;
                return (
                  <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${isBanned ? "bg-red-50/40" : ""}`}>
                    <td className="px-4 py-3">
                      {user.role !== "ADMIN" && (
                        <input
                          type="checkbox"
                          checked={selected.has(user.id)}
                          onChange={() => toggleSelect(user.id)}
                          aria-label={`Select ${user.name ?? "user"}`}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {user.name ?? "—"}
                      {user.networkProfile && (
                        <span className="ml-1 text-xs text-gray-400">@{user.networkProfile.handle}</span>
                      )}
                      {isBanned && (
                        <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded font-medium">BANNED</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{user.phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${roleBadge[user.role] ?? roleBadge.USER}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${verificationBadge[user.verificationStatus] ?? verificationBadge.UNVERIFIED}`}>
                        {user.verificationStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString("en-PK")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={pendingRoles[user.id] ?? user.role}
                          onChange={(e) => setPendingRoles((prev) => ({ ...prev, [user.id]: e.target.value }))}
                          className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="USER">USER</option>
                          <option value="PARTNER">PARTNER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                        {pendingRoles[user.id] && pendingRoles[user.id] !== user.role && (
                          <button
                            type="button"
                            onClick={() => saveRole(user.id)}
                            disabled={saving === user.id}
                            className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {saving === user.id ? "…" : "Save"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void toggleShopkeeper(user.id, user.canCreateShop)}
                          disabled={saving === user.id}
                          title="Allow this user to create a shop"
                          className={`px-2 py-1 text-xs font-medium rounded transition-colors disabled:opacity-50 ${
                            user.canCreateShop
                              ? "bg-indigo-600 text-white hover:bg-indigo-700"
                              : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                          }`}
                        >
                          {user.canCreateShop ? "Shopkeeper ✓" : "Make Shopkeeper"}
                        </button>
                        {user.role !== "PARTNER" && user.role !== "ADMIN" && (
                          <Link
                            href="/admin/partners"
                            title="Review this user's partner application to verify them as a Company"
                            className="px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded hover:bg-purple-100 transition-colors"
                          >
                            Verify Company →
                          </Link>
                        )}
                        {(!user.canCreateShop || (user.role !== "PARTNER" && user.role !== "ADMIN")) && (
                          <button
                            type="button"
                            onClick={() => void grantAll(user.id)}
                            disabled={saving === user.id}
                            title="Grant shopkeeper permission; company verification still requires reviewing their partner application"
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
                          >
                            Grant All
                          </button>
                        )}
                        {isBanned ? (
                          <button
                            type="button"
                            onClick={() => void unban(user.id)}
                            disabled={saving === user.id}
                            className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {saving === user.id ? "…" : "Unban"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openBanModal(user)}
                            className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded hover:bg-red-200 transition-colors"
                          >
                            Ban
                          </button>
                        )}
                        {user.role !== "ADMIN" && (
                          <button
                            type="button"
                            onClick={() => setDeleteModal({ userId: user.id, name: user.name ?? "this user" })}
                            disabled={saving === user.id}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                        {errors[user.id] && (
                          <span className="text-xs text-red-500">{errors[user.id]}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center gap-2 justify-center">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), page: String(p) }).toString()}`}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                p === page
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}

      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white rounded-xl shadow-xl px-4 py-3 flex items-center gap-3 flex-wrap justify-center">
          <span className="text-sm font-medium">{selected.size} selected</span>
          {bulkError && <span className="text-xs text-red-400">{bulkError}</span>}
          <button
            type="button"
            onClick={() => { setBulkBanModal({ reason: "", duration: 168, loading: false, error: "" }); setBulkError(null); }}
            disabled={bulkLoading}
            className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            Ban Selected
          </button>
          <button
            type="button"
            onClick={() => void bulkUnban()}
            disabled={bulkLoading}
            className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {bulkLoading ? "Working…" : "Unban Selected"}
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            disabled={bulkLoading}
            className="px-3 py-1.5 border border-gray-600 text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
