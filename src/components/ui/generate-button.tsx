"use client";

/*
  The AI button — the one place the app admits a model is thinking.

  It is the same `<Button variant="primary">` as everything else; what it adds is
  the flourish from the original "Generate" design: a sparkle that flickers and a
  label whose letters light up one after the next, left to right. While the
  Server Action is in flight the label swaps to `activeLabel` and both animations
  speed up, so the wait has a heartbeat instead of a spinner.

  The letters have to be real elements to stagger, which means the label is read
  by a screen reader one character at a time — so the whole strip is
  `aria-hidden` and the accessible name comes from `aria-label`.
*/

import { Icon } from "@/components/icon";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface GenerateButtonProps extends Omit<ButtonProps, "children" | "loading" | "data-generating"> {
  /** What it says at rest. */
  label?: string;
  /** What it says while `generating` is true. */
  activeLabel?: string;
  /** True while the model is working — swaps the label and quickens the shimmer. */
  generating?: boolean;
}

export function GenerateButton({
  label = "Generate",
  activeLabel = "Generating",
  generating = false,
  variant = "primary",
  size = "md",
  hue = "purple",
  className,
  faceClassName,
  disabled,
  ...props
}: GenerateButtonProps) {
  const text = generating ? activeLabel : label;

  return (
    <Button
      variant={variant}
      size={size}
      hue={hue}
      className={className}
      faceClassName={cn("gap-2.5", faceClassName)}
      disabled={disabled || generating}
      aria-label={text}
      data-generating={generating ? "true" : "false"}
      {...props}
    >
      <Icon name="Sparkles" size={17} className="rv-btn-spark shrink-0" />
      <span aria-hidden className="inline-flex">
        {/* `key` includes the text so the animation restarts on the swap. */}
        {[...text].map((letter, i) => (
          <span
            key={`${text}-${i}`}
            className="rv-btn-letter"
            style={{ animationDelay: `${(i * 0.08).toFixed(2)}s` }}
          >
            {letter}
          </span>
        ))}
      </span>
    </Button>
  );
}

export default GenerateButton;
