"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, X } from "lucide-react";

import { CatalogPicker } from "@/components/CatalogPicker";
import { addModStashItem, bulkAddModStash, removeModStashItem } from "@/lib/dashboard/actions";

function AddSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-1.5 rounded-sm border border-teal-dim bg-teal-dim/10 px-3 py-2 text-sm font-medium text-teal transition-colors hover:bg-teal-dim/20 disabled:opacity-50"
    >
      <Plus size={14} />
      {pending ? "Adding…" : "Add"}
    </button>
  );
}

export function AddModStashForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pickerKey, setPickerKey] = useState(0);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await addModStashItem(formData);
        formRef.current?.reset();
        setPickerKey((key) => key + 1);
      }}
      className="flex flex-wrap gap-2"
    >
      <CatalogPicker
        key={pickerKey}
        placeholder="Search or paste a mod, e.g. Transient Fortitude"
      />
      <input
        name="quantity"
        type="number"
        min={1}
        defaultValue={1}
        className="w-20 rounded-sm border border-line bg-void-panel px-3 py-2 text-sm text-platinum"
        aria-label="Quantity"
      />
      <AddSubmitButton />
    </form>
  );
}

export function BulkAddModStashForm() {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await bulkAddModStash(formData);
        formRef.current?.reset();
      }}
      className="flex flex-col gap-2"
    >
      <textarea
        name="bulk"
        rows={3}
        placeholder={"Paste names, one per line or comma-separated\ntransient_fortitude\nblind_rage"}
        className="w-full rounded-sm border border-line bg-void-panel px-3 py-2 text-sm text-platinum placeholder:text-platinum-faint"
      />
      <button
        type="submit"
        className="self-start rounded-sm border border-line px-3 py-1.5 text-sm text-platinum-dim transition-colors hover:border-teal-dim hover:text-teal"
      >
        Bulk add
      </button>
    </form>
  );
}

function RemoveSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Remove from stash"
      className="rounded-sm border border-line p-1.5 text-platinum-faint transition-colors hover:border-red/50 hover:text-red disabled:opacity-50"
    >
      <X size={14} />
    </button>
  );
}

export function RemoveModStashButton({ urlName }: { urlName: string }) {
  return (
    <form action={removeModStashItem}>
      <input type="hidden" name="urlName" value={urlName} />
      <RemoveSubmitButton />
    </form>
  );
}
