import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { CreateProjectView } from "./create-project-view";

export const metadata: Metadata = {
  title: "Create New Project — Rabbit Verse",
  description: "Describe your project idea and let AI help you structure it.",
};

/**
 * /projects/new — the whole flow is client state until the final Server Action,
 * so this page has nothing to fetch. It only passes down whether there is a
 * database to save into: in demo mode the page still generates and edits a full
 * blueprint, it just cannot write one.
 */
export default function NewProjectPage() {
  return <CreateProjectView canSave={isSupabaseConfigured} />;
}
