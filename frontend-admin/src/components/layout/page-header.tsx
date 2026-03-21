import { type PropsWithChildren } from "react";

import { Button } from "@/components/ui/button";

interface PageHeaderProps extends PropsWithChildren {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

const PageHeader = ({ title, subtitle, actionLabel, onAction, children }: PageHeaderProps) => (
  <div className="flex flex-col gap-4 overflow-hidden rounded-[1.75rem] border border-[rgba(112,104,84,0.14)] bg-[linear-gradient(135deg,rgba(255,253,248,0.98),rgba(249,244,235,0.96),rgba(255,242,234,0.9))] px-6 py-6 shadow-[0_22px_45px_rgba(71,61,45,0.1)] backdrop-blur lg:flex-row lg:items-center lg:justify-between">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--jo-forest)]">VSP Admin</p>
      <h1 className="mt-2 text-[2rem] font-black tracking-tight text-slate-950">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--jo-muted)]">{subtitle}</p>
    </div>

    <div className="flex flex-wrap items-center gap-3">
      {children}
      {actionLabel ? <Button onClick={onAction}>{actionLabel}</Button> : null}
    </div>
  </div>
);

export { PageHeader };
