"use client";

import { useEffect, useState } from "react";
import { http, getErrorMessage } from "@/lib/http";
import { useToast } from "@/components/providers/ToastProvider";
import { formatAddressLine } from "@/components/checkout/CheckoutParts";

export interface AddressDTO {
  id: string;
  label: string | null;
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
}

interface FormState {
  label: string;
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

const EMPTY_FORM: FormState = {
  label: "", fullName: "", line1: "", line2: "", city: "",
  state: "", postalCode: "", country: "", phone: "", isDefault: false,
};

export function AddressesPage() {
  const toast = useToast();
  const [addresses, setAddresses] = useState<AddressDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () =>
    http
      .get<{ items: AddressDTO[] }>("/addresses")
      .then(({ data }) => setAddresses(data.items))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        label: form.label || null,
        fullName: form.fullName,
        line1: form.line1,
        line2: form.line2 || null,
        city: form.city,
        state: form.state || null,
        postalCode: form.postalCode,
        country: form.country,
        phone: form.phone || null,
        isDefault: form.isDefault,
      };
      if (editingId) {
        await http.patch(`/addresses/${editingId}`, payload);
      } else {
        await http.post("/addresses", payload);
      }
      toast.toast("Address saved", "success");
      setForm({ ...EMPTY_FORM });
      setEditingId(null);
      await load();
    } catch (err) {
      toast.toast(getErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await http.delete(`/addresses/${id}`);
      await load();
      toast.toast("Address removed", "info");
    } catch (err) {
      toast.toast(getErrorMessage(err), "error");
    }
  };

  const makeDefault = async (id: string) => {
    try {
      await http.patch(`/addresses/${id}`, { isDefault: true });
      await load();
    } catch (err) {
      toast.toast(getErrorMessage(err), "error");
    }
  };

  const edit = (a: AddressDTO) => {
    setEditingId(a.id);
    setForm({
      label: a.label ?? "",
      fullName: a.fullName,
      line1: a.line1,
      line2: a.line2 ?? "",
      city: a.city,
      state: a.state ?? "",
      postalCode: a.postalCode,
      country: a.country,
      phone: a.phone ?? "",
      isDefault: a.isDefault,
    });
  };

  const set =
    (k: keyof FormState) =>
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLInputElement> & { target: HTMLInputElement },
    ) =>
      setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const field = (key: keyof FormState, label: string, required = false) => (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        value={String(form[key] ?? "")}
        onChange={set(key)}
        required={required}
        className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
      />
    </label>
  );

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">Addresses</h1>

      <section className="flex flex-col gap-3">
        {loading ? (
          <div className="h-32 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
        ) : addresses.length === 0 ? (
          <p className="text-sm text-neutral-500">No addresses yet.</p>
        ) : (
          addresses.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div className="text-sm">
                <span className="font-medium">
                  {a.label ?? a.fullName}
                  {a.isDefault && (
                    <span className="ml-2 rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] dark:bg-neutral-700">
                      Default
                    </span>
                  )}
                </span>
                <br />
                <span className="text-neutral-500">{formatAddressLine(a)}</span>
              </div>
              <div className="flex shrink-0 gap-2 text-sm">
                {!a.isDefault && (
                  <button onClick={() => makeDefault(a.id)} className="hover:underline">
                    Make default
                  </button>
                )}
                <button onClick={() => edit(a)} className="hover:underline">
                  Edit
                </button>
                <button onClick={() => remove(a.id)} className="text-red-600 hover:underline">
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="max-w-md">
        <h2 className="mb-3 font-semibold">{editingId ? "Edit address" : "Add a new address"}</h2>
        <form onSubmit={save} className="flex flex-col gap-3">
          {field("label", "Label (e.g. Home)")}
          {field("fullName", "Full name", true)}
          {field("line1", "Address line 1", true)}
          {field("line2", "Address line 2")}
          <div className="grid grid-cols-2 gap-3">
            {field("city", "City", true)}
            {field("state", "State/Region")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("postalCode", "Postal code", true)}
            {field("country", "Country", true)}
          </div>
          {field("phone", "Phone")}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={set("isDefault")}
            />
            Set as default
          </label>
          <div className="flex gap-2">
            <button
              disabled={saving}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900"
            >
              {saving ? "Saving…" : editingId ? "Save changes" : "Add address"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm({ ...EMPTY_FORM });
                }}
                className="text-sm text-neutral-500 hover:underline"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
