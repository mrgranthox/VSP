import { type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "rounded-[1.35rem] border border-[rgba(112,104,84,0.14)] bg-[linear-gradient(180deg,rgba(255,253,248,0.98),rgba(250,245,236,0.96))] shadow-[0_18px_40px_rgba(71,61,45,0.08)] backdrop-blur",
      className
    )}
    {...props}
  />
);

const CardHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />
);

const CardTitle = ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn("text-lg font-bold tracking-tight text-[color:var(--jo-ink)]", className)} {...props} />
);

const CardDescription = ({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-[color:var(--jo-muted)]", className)} {...props} />
);

const CardContent = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("px-6 pb-6", className)} {...props} />
);

export { Card, CardContent, CardDescription, CardHeader, CardTitle };
