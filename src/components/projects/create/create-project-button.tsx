"use client";

/*
  CreateProjectButton — the last thing on the page.

  Full width, purple → blue, and disabled until the draft actually validates. It
  says *why* it is disabled underneath rather than leaving the user to guess: a
  greyed-out button with no explanation is the most common way a form like this
  wastes somebody's afternoon.
*/

import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";

export function CreateProjectButton({
  onCreate,
  creating,
  validationError,
}: {
  onCreate: () => void;
  creating: boolean;
  /** Null when the draft is ready to save. */
  validationError: string | null;
}) {
  const blocked = validationError !== null;

  return (
    <div>
      <Button
        block
        variant="primary"
        size="lg"
        onClick={onCreate}
        loading={creating}
        disabled={blocked}
        aria-describedby={blocked ? "create-project-blocked" : undefined}
        faceClassName="gap-2 py-3 text-[15px] bg-gradient-to-r from-accent-purple via-[color-mix(in_srgb,var(--accent-purple)_55%,var(--accent-blue))] to-accent-cyan text-white"
      >
        {!creating && <Icon name="Rocket" size={17} />}
        {creating ? "Creating your project…" : "Create Project"}
      </Button>

      {blocked && (
        <p id="create-project-blocked" className="mt-2 text-center text-xs text-fg-muted">
          {validationError}
        </p>
      )}
    </div>
  );
}
