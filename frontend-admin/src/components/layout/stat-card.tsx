import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  accent: "blue" | "green" | "amber" | "purple" | "red";
}

const accentMap = {
  blue: "bg-[rgba(65,150,70,0.12)] text-[color:var(--jo-forest)]",
  green: "bg-[rgba(65,150,70,0.16)] text-[color:var(--jo-forest)]",
  amber: "bg-[rgba(246,179,19,0.18)] text-[#9a6a00]",
  purple: "bg-[rgba(233,119,155,0.16)] text-[color:var(--jo-rose)]",
  red: "bg-[rgba(255,75,25,0.14)] text-[color:var(--jo-coral)]"
};

const StatCard = ({ label, value, helper, icon: Icon, accent }: StatCardProps) => (
  <Card className="overflow-hidden">
    <CardContent className="pt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:rgba(107,114,102,0.72)]">{label}</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-[color:var(--jo-ink)]">{value}</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--jo-muted)]">{helper}</p>
        </div>

        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ${accentMap[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export { StatCard };
