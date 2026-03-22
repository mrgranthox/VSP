import { ChevronLeft, ChevronRight } from "lucide-react";
import { type PropsWithChildren } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ApiPagination } from "@/types/api";

const FilterCard = ({ children }: PropsWithChildren) => (
  <Card>
    <CardContent className="grid gap-4 pt-6 lg:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))]">{children}</CardContent>
  </Card>
);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <Card className="border-dashed border-[rgba(112,104,84,0.24)] bg-[rgba(255,253,248,0.92)]">
    <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <h3 className="text-lg font-bold text-[color:var(--jo-ink)]">{title}</h3>
      <p className="max-w-md text-sm text-[color:var(--jo-muted)]">{description}</p>
    </CardContent>
  </Card>
);

interface PaginationControlsProps {
  pagination?: ApiPagination;
  onPageChange: (page: number) => void;
}

const PaginationControls = ({ pagination, onPageChange }: PaginationControlsProps) => {
  if (!pagination) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-[rgba(112,104,84,0.14)] bg-[rgba(255,253,248,0.96)] px-4 py-3 shadow-[0_14px_28px_rgba(71,61,45,0.08)]">
      <p className="text-sm text-[color:var(--jo-muted)]">
        Page <span className="font-semibold text-[color:var(--jo-ink)]">{pagination.page}</span> · Showing up to {pagination.limit} of {pagination.total}
      </p>
      <div className="flex items-center gap-2">
        <Button disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)} variant="outline">
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button disabled={!pagination.hasNext} onClick={() => onPageChange(pagination.page + 1)} variant="outline">
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export { EmptyState, FilterCard, PaginationControls };
