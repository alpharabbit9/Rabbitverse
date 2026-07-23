import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

/** The core glass surface used throughout Rabbit Verse. */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("glass rounded-2xl", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex items-center justify-between gap-3 p-5 pb-0", className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return <h3 className={cn("text-sm font-medium text-fg-secondary", className)} {...props} />;
}

export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-5", className)} {...props} />;
}
