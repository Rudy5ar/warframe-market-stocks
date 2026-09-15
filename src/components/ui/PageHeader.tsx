import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex max-w-2xl flex-col gap-2">
        <div className="h-0.5 w-10 bg-teal" aria-hidden />
        <h1 className="font-display text-2xl font-bold tracking-tight text-platinum">{title}</h1>
        {description ? <p className="text-sm leading-relaxed text-platinum-dim">{description}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
