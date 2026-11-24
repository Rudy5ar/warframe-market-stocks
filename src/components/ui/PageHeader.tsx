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
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div className="flex max-w-2xl flex-col gap-1.5">
        <h1 className="font-display text-2xl font-bold tracking-tight text-platinum sm:text-[26px]">
          {title}
        </h1>
        {description ? (
          <p className="text-sm leading-relaxed text-platinum-dim">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
