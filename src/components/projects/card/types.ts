/*
  The shape the project card renders. Deliberately its own type rather than the
  app's `Project` from `lib/types` — the card is a presentation component and
  should be usable by anything that can produce these fields (a list page, a
  search result, a Storybook fixture), without dragging the domain model along.
*/

export type ProjectCardStatus = "planned" | "in_progress" | "completed" | "on_hold" | "archived";

export interface ProjectCardTag {
  name: string;
  /** A name from the shared registry in `components/icon.tsx`. */
  icon: string;
}

export interface ProjectTeamMember {
  id: string;
  name: string;
  /** Missing is normal — the avatar falls back to the member's initials. */
  avatar?: string;
}

export interface ProjectCardData {
  id: string;
  name: string;
  subtitle?: string;
  /** Any URL the browser can load: png, svg, webp, a data: URI. */
  logo?: string;
  status: ProjectCardStatus;
  /** 0-100. Clamped and rounded on the way in, so a caller can hand over 43.7. */
  progress: number;
  /** Distinct days with an update logged. Hidden when 0 or absent. */
  daysLogged?: number;
  tags?: ProjectCardTag[];
  description?: string;
  teamMembers?: ProjectTeamMember[];
}
