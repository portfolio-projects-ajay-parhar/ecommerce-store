"use client";

import { useEffect, useState } from "react";
import { http, getErrorMessage } from "@/lib/http";
import { useToast } from "@/components/providers/ToastProvider";

interface ProfileDTO {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: string;
}

export function ProfilePage() {
  const toast = useToast();
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    http.get<{ profile: ProfileDTO }>("/profile").then(({ data }) => {
      setProfile(data.profile);
      setName(data.profile.name ?? "");
      setPhone(data.profile.phone ?? "");
    });
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await http.patch<{ profile: ProfileDTO }>("/profile", {
        name,
        phone: phone || null,
      });
      setProfile(data.profile);
      toast.toast("Profile saved", "success");
    } catch (err) {
      toast.toast(getErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return <div className="h-48 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />;
  }

  return (
    <div className="flex max-w-md flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-neutral-500">{profile.email}</p>
      </div>
      <form onSubmit={save} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Phone (optional)
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={30}
            className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
          />
        </label>
        <button
          disabled={saving}
          className="self-start rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
