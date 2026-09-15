"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Star, X } from "lucide-react";

import { CatalogPicker } from "@/components/CatalogPicker";
import { addWatchlistItem, removeWatchlistItem } from "@/lib/dashboard/actions";

function AddSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-1.5 rounded-sm border border-teal-dim bg-teal-dim/10 px-3 py-2 text-sm font-medium text-teal transition-colors hover:bg-teal-dim/20 disabled:opacity-50"
    >
      <Plus size={14} />
      {pending ? "Adding…" : "Pin"}
    </button>
  );
}

export function AddWatchlistForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pickerKey, setPickerKey] = useState(0);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await addWatchlistItem(formData);
        formRef.current?.reset();
        setPickerKey((key) => key + 1);
      }}
      className="flex gap-2"
    >
      <CatalogPicker
        key={pickerKey}
        placeholder="Search or paste a name, e.g. Saryn Prime Set"
      />
      <AddSubmitButton />
    </form>
  );
}

function RemoveSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Remove from watchlist"
      className="rounded-sm border border-line p-1.5 text-platinum-faint transition-colors hover:border-red/50 hover:text-red disabled:opacity-50"
    >
      <X size={14} />
    </button>
  );
}

export function RemoveWatchlistButton({ urlName }: { urlName: string }) {
  return (
    <form action={removeWatchlistItem}>
      <input type="hidden" name="urlName" value={urlName} />
      <RemoveSubmitButton />
    </form>
  );
}

function ToggleSubmitButton({ isWatchlisted }: { isWatchlisted: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
        isWatchlisted
          ? "border-amber-dim bg-amber-dim/10 text-amber hover:bg-amber-dim/20"
          : "border-line text-platinum-dim hover:border-line-strong hover:text-platinum"
      }`}
    >
      <Star size={14} fill={isWatchlisted ? "currentColor" : "none"} />
      {pending ? "Saving…" : isWatchlisted ? "Pinned" : "Pin"}
    </button>
  );
}

export function WatchlistToggleButton({
  urlName,
  isWatchlisted,
}: {
  urlName: string;
  isWatchlisted: boolean;
}) {
  return (
    <form action={isWatchlisted ? removeWatchlistItem : addWatchlistItem}>
      <input type="hidden" name="urlName" value={urlName} />
      <ToggleSubmitButton isWatchlisted={isWatchlisted} />
    </form>
  );
}
