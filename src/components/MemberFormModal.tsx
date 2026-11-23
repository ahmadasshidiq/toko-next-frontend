"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, UserPlus, X } from "lucide-react";

export type Member = {
  _id?: string;
  /** diisi untuk member yang baru dibuat dari web (belum punya _id di tampilan) */
  clientId?: string;
  cabangId: string;
  memberId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  poin: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (member: Member) => void;
  branches: { _id: string; name: string }[];
  defaultCabangId?: string;
  defaultName?: string;
};

const newClientId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Nomor member otomatis: MBR-YYMMDD-XXXX */
const makeMemberId = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `MBR-${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
};

const input =
  "h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-jax-lime focus:outline-none focus:ring-2 focus:ring-jax-lime/20";

export default function MemberFormModal({ open, onClose, onSaved, branches, defaultCabangId, defaultName }: Props) {
  const [form, setForm] = useState({ cabangId: "", memberId: "", name: "", phone: "", email: "", address: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open)
      setForm({
        cabangId: defaultCabangId || branches[0]?._id || "",
        memberId: makeMemberId(),
        name: defaultName ?? "",
        phone: "",
        email: "",
        address: "",
      });
  }, [open, defaultCabangId, defaultName, branches]);

  if (!open) return null;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Nama wajib diisi");
    if (!form.cabangId) return toast.error("Cabang wajib dipilih");
    setSaving(true);
    try {
      const clientId = newClientId();
      const result = await fetch("/bff/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, clientId }),
      });
      const res = await result.json();
      if (!result.ok) throw new Error(res?.error || "Gagal menyimpan member");
      toast.success("Member berhasil ditambahkan");
      onSaved({ ...form, name: form.name.trim(), clientId, poin: 0 });
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <form
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-jax-lime/10 text-jax-lime">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-gray-900">Tambah Member</div>
              <div className="text-xs text-gray-400">Pelanggan terdaftar bisa mengumpulkan poin</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Nama *</label>
            <input autoFocus value={form.name} onChange={set("name")} placeholder="Nama pelanggan" className={input} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">No. HP</label>
              <input value={form.phone} onChange={set("phone")} placeholder="08xxxxxxxxxx" inputMode="tel" className={input} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">No. Member</label>
              <input value={form.memberId} onChange={set("memberId")} className={input} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
            <input type="email" value={form.email} onChange={set("email")} placeholder="email@contoh.com" className={input} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Cabang *</label>
            <select value={form.cabangId} onChange={set("cabangId")} className={input}>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Alamat</label>
            <textarea
              value={form.address}
              onChange={set("address")}
              rows={2}
              placeholder="Alamat (opsional)"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-jax-lime focus:outline-none focus:ring-2 focus:ring-jax-lime/20"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-jax-lime px-4 text-sm font-semibold text-white hover:bg-jax-limeDark disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Simpan
          </button>
        </div>
      </form>
    </div>
  );
}
