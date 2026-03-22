import { forwardRef, type SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "w-full rounded-[1rem] border border-[rgba(112,104,84,0.16)] bg-[rgba(255,253,248,0.96)] px-4 py-3 text-sm text-[color:var(--jo-ink)] shadow-sm outline-none transition focus:border-[rgba(65,150,70,0.45)] focus:ring-4 focus:ring-[rgba(65,150,70,0.12)]",
      className
    )}
    {...props}
  />
));

Select.displayName = "Select";

export { Select };
