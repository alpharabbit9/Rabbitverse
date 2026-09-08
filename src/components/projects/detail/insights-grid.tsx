/*
  The three information cards — The Idea, Key Features, Problems We Solve.

  Each is a `SectionCard` in its own accent lane (purple / green / red), with a
  matching header icon and a faint oversized watermark of that icon in the
  corner for depth — CSS + a Lucide glyph, no illustration dependency. The grid
  makes them equal height on desktop (`items-stretch` is the grid default and
  every card is `h-full`), stacks to one column on phones, and goes 2-up on
  medium tablets with the third card dropping full-width beneath.
*/

import { Icon } from "@/components/icon";
import { SectionCard, type SectionCardVariant } from "./section-card";
import { tint } from "../card/status";
import type { ProjectInsights } from "./types";
import { cn } from "@/lib/utils";

function InsightCard({
  title,
  icon,
  accent,
  variant,
  className,
  children,
}: {
  title: string;
  icon: string;
  accent: string;
  variant: SectionCardVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <SectionCard variant={variant} className={cn("relative flex h-full flex-col overflow-hidden p-5 lg:p-6", className)}>
      {/* Corner watermark — decorative only. Colour cascades to the glyph via
          currentColor, so it lands on a span the Icon can't take aria on. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-6 -right-4 select-none"
        style={{ color: tint(accent, 7, "transparent") }}
      >
        <Icon name={icon} size={128} strokeWidth={1.25} />
      </span>

      <div className="relative flex items-center gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: tint(accent, 15), color: accent }}>
          <Icon name={icon} size={18} />
        </span>
        <h3 className="text-base font-semibold text-fg">{title}</h3>
      </div>

      <div className="relative mt-4 min-w-0 flex-1">{children}</div>
    </SectionCard>
  );
}

function ListItem({ text, icon, accent }: { text: string; icon: string; accent: string }) {
  return (
    <li className="flex items-start gap-2.5 text-sm leading-6 text-fg-secondary">
      <Icon name={icon} size={16} className="mt-0.5 shrink-0" style={{ color: accent }} />
      <span className="min-w-0 break-words">{text}</span>
    </li>
  );
}

interface CardDesc {
  key: string;
  title: string;
  icon: string;
  accent: string;
  variant: SectionCardVariant;
  body: React.ReactNode;
}

export function ProjectInsightsGrid({ insights, className }: { insights: ProjectInsights; className?: string }) {
  const purple = "var(--accent-purple)";
  const green = "var(--accent-mint)";
  const rose = "var(--accent-rose)";

  // Only render a card that has something to say — sample and older projects can
  // be missing a brief, features, or problems, and a blank card reads as broken.
  const cards: CardDesc[] = [];
  if (insights.goals.trim()) {
    cards.push({
      key: "goals",
      title: "Goals",
      icon: "Target",
      accent: purple,
      variant: "purple",
      body: <p className="whitespace-pre-line text-sm leading-6 text-fg-secondary">{insights.goals}</p>,
    });
  }
  if (insights.features.length) {
    cards.push({
      key: "features",
      title: "Key Features",
      icon: "Sparkles",
      accent: green,
      variant: "green",
      body: (
        <ul className="space-y-2.5">
          {insights.features.map((f) => (
            <ListItem key={f} text={f} icon="CheckCircle2" accent={green} />
          ))}
        </ul>
      ),
    });
  }
  if (insights.problems.length) {
    cards.push({
      key: "problems",
      title: "Problems We Solve",
      icon: "TriangleAlert",
      accent: rose,
      variant: "red",
      body: (
        <ul className="space-y-2.5">
          {insights.problems.map((p) => (
            <ListItem key={p} text={p} icon="TriangleAlert" accent={rose} />
          ))}
        </ul>
      ),
    });
  }

  if (!cards.length) return null;

  // An odd number of cards leaves a lonely trailing card on the md (2-col) grid;
  // let the last one span both columns there so the row reads full. On xl it
  // returns to a single column, keeping the three-across design.
  const lastSpans = cards.length % 2 === 1;

  return (
    <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3", className)}>
      {cards.map((c, i) => (
        <InsightCard
          key={c.key}
          title={c.title}
          icon={c.icon}
          accent={c.accent}
          variant={c.variant}
          className={i === cards.length - 1 && lastSpans ? "md:col-span-2 xl:col-span-1" : undefined}
        >
          {c.body}
        </InsightCard>
      ))}
    </div>
  );
}
