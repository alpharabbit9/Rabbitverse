/*
  The button. Every clickable control in the app is this component.

  The look is the liquid-glass pill Rifat picked: a glass face inside a thin halo
  band, lit from above, with the accent glow rising from the bottom edge on hover
  and flaring on press. All of that lives in `.rv-btn` in `globals.css` — this
  file is only the markup and the vocabulary (variant / size / hue).

  Two classNames, on purpose. `className` styles the **outer** element, which is
  the halo band and therefore the thing the surrounding layout sees: `w-full`,
  `flex-1`, `ml-auto`, `shrink-0` belong there. `faceClassName` styles the pill
  inside it: padding, type size, `justify-start` for a left-aligned menu row.
  Mixing the two up is the one easy mistake, so sizes only ever touch the face.

  No "use client" — it holds no state, so a server page can render one directly
  and a client component can hand it an onClick.
*/

import Link from "next/link";
import { Icon } from "@/components/icon";
import { hueValue, type HueName } from "@/lib/hues";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "dashed" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

/** Padding and type live on the face; Tailwind's layer wins over `.rv-btn-face`. */
const FACE_SIZE: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm font-semibold",
  icon: "size-9 shrink-0 p-0",
  "icon-sm": "size-7 shrink-0 p-0",
};

/** A thinner halo on the small sizes, or the band swallows the control. */
const HALO_SIZE: Partial<Record<ButtonSize, string>> = {
  sm: "[--rv-pad:3px]",
  "icon-sm": "[--rv-pad:3px]",
};

const SPINNER: Record<ButtonSize, number> = {
  sm: 12,
  md: 14,
  lg: 15,
  icon: 15,
  "icon-sm": 12,
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Which accent the glow takes — a name from `lib/hues.ts`, or a raw angle. */
  hue?: HueName | number;
  /** Fill the row it sits in. */
  block?: boolean;
  /** Classes for the inner pill. `className` goes to the outer halo. */
  faceClassName?: string;
}

function chrome({
  variant = "secondary",
  size = "md",
  block,
  className,
}: Omit<CommonProps, "hue" | "faceClassName"> & { className?: string }) {
  return cn("rv-btn", `rv-btn-${variant}`, HALO_SIZE[size], block && "w-full", className);
}

/** `--rv-hue` is read by every shadow, rim and glow in `.rv-btn`. */
function hueStyle(hue: HueName | number | undefined, variant: ButtonVariant | undefined) {
  return { "--rv-hue": hueValue(hue ?? (variant === "danger" ? "rose" : "purple")) } as React.CSSProperties;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, CommonProps {
  /** Show a spinner and refuse clicks — for a pending Server Action. */
  loading?: boolean;
  /** A toggle that is currently on: the glow stays lit with no pointer on it. */
  selected?: boolean;
  /** Set by <GenerateButton/>; drives the letter shimmer in `globals.css`. */
  "data-generating"?: "true" | "false";
}

export function Button({
  variant = "secondary",
  size = "md",
  hue,
  block,
  loading = false,
  selected,
  className,
  faceClassName,
  children,
  disabled,
  type = "button",
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      data-selected={selected ? "true" : undefined}
      aria-pressed={selected === undefined ? undefined : selected}
      className={chrome({ variant, size, block, className })}
      style={{ ...hueStyle(hue, variant), ...style }}
      {...props}
    >
      <span className={cn("rv-btn-face", FACE_SIZE[size], faceClassName)}>
        {loading && <Icon name="Loader" size={SPINNER[size]} className="animate-spin" />}
        {children}
      </span>
    </button>
  );
}

export interface ButtonLinkProps extends React.ComponentPropsWithoutRef<typeof Link>, CommonProps {}

/** The same control, when the thing it does is "go somewhere". */
export function ButtonLink({
  variant = "secondary",
  size = "md",
  hue,
  block,
  className,
  faceClassName,
  children,
  style,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={chrome({ variant, size, block, className })}
      style={{ ...hueStyle(hue, variant), ...style }}
      {...props}
    >
      <span className={cn("rv-btn-face", FACE_SIZE[size], faceClassName)}>{children}</span>
    </Link>
  );
}
