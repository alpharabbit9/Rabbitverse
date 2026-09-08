"use client";

/*
  The Create New Project state machine.

  Every rule of the flow lives here and nothing else does: the components below
  this file render what they are given and call what they are handed. That split
  is what makes the page testable by reading it — you can answer "when can the
  Create button fire?" without opening a single .tsx.

  The draft is entirely local until the final action. Generating a blueprint,
  editing an idea, deleting a feature, dragging a milestone — none of it touches
  the database, so closing the tab costs the user their draft and nothing else.
*/

import { useCallback, useMemo, useReducer, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  DESCRIPTION_MAX,
  draftId,
  reorder,
  toDraft,
  validateCreatePayload,
  type DraftBlueprint,
  type DraftMilestone,
  type MilestoneStatus,
} from "@/lib/ai/project-blueprint";
import {
  removeProjectLogo,
  uploadProjectLogo,
  validateLogoFile,
} from "@/lib/project-logo";
import { MAX_PROJECT_TAGS } from "@/lib/project-tags";
import {
  createProjectFromBlueprint,
  generateProjectBlueprint,
} from "@/app/(app)/projects/blueprint-actions";

export type GenerationPhase = "idle" | "loading" | "ready" | "error";

export interface LogoState {
  /** Object URL for the chosen file — what the preview shows. */
  preview: string | null;
  /** Public URL once stored. Null while uploading, or when storage is absent. */
  url: string | null;
  /** Bucket path, kept so a replaced logo can be cleaned up. */
  path: string | null;
  uploading: boolean;
  fileName: string | null;
}

export interface CreateProjectState {
  name: string;
  description: string;
  logo: LogoState;
  /** Aimed finish date as `yyyy-mm-dd`; "" for none. Independent of the AI step. */
  targetDate: string;
  /** Preset labels the user picked; independent of the AI step. */
  tags: string[];
  /** Free label for the detail header (e.g. "Personal Growth"); "" for none. */
  category: string;
  /** Free label for the detail header (e.g. "Full-stack Web App"); "" for none. */
  type: string;
  phase: GenerationPhase;
  error: string | null;
  /** The blueprint came from the offline heuristic rather than the model. */
  offline: boolean;
  blueprint: DraftBlueprint | null;
}

const EMPTY_LOGO: LogoState = { preview: null, url: null, path: null, uploading: false, fileName: null };

const INITIAL: CreateProjectState = {
  name: "",
  description: "",
  logo: EMPTY_LOGO,
  targetDate: "",
  tags: [],
  category: "",
  type: "",
  phase: "idle",
  error: null,
  offline: false,
  blueprint: null,
};

type ListKey = "keyFeatures" | "problems";

type Action =
  | { type: "setName"; value: string }
  | { type: "setDescription"; value: string }
  | { type: "setTargetDate"; value: string }
  | { type: "setCategory"; value: string }
  | { type: "setType"; value: string }
  | { type: "toggleTag"; tag: string }
  | { type: "logoPending"; preview: string; fileName: string }
  | { type: "logoStored"; url: string | null; path: string | null }
  | { type: "logoFailed" }
  | { type: "logoCleared" }
  | { type: "generateStart" }
  | { type: "generateOk"; blueprint: DraftBlueprint; offline: boolean; name: string }
  | { type: "generateFail"; error: string }
  | { type: "reset" }
  | { type: "clearBlueprint" }
  | { type: "setIdea"; value: string }
  | { type: "listAdd"; key: ListKey; value: string }
  | { type: "listUpdate"; key: ListKey; index: number; value: string }
  | { type: "listRemove"; key: ListKey; index: number }
  | { type: "milestoneAdd"; id: string }
  | { type: "milestoneUpdate"; id: string; patch: Partial<Omit<DraftMilestone, "id">> }
  | { type: "milestoneRemove"; id: string }
  | { type: "milestoneMove"; from: number; to: number };

function withBlueprint(
  state: CreateProjectState,
  fn: (b: DraftBlueprint) => DraftBlueprint,
): CreateProjectState {
  if (!state.blueprint) return state;
  return { ...state, blueprint: fn(state.blueprint) };
}

function reducer(state: CreateProjectState, action: Action): CreateProjectState {
  switch (action.type) {
    case "setName":
      return { ...state, name: action.value.slice(0, 120) };

    case "setDescription":
      return { ...state, description: action.value.slice(0, DESCRIPTION_MAX) };

    case "setTargetDate":
      return { ...state, targetDate: action.value };

    case "setCategory":
      return { ...state, category: action.value.slice(0, 60) };

    case "setType":
      return { ...state, type: action.value.slice(0, 60) };

    case "toggleTag":
      return {
        ...state,
        tags: state.tags.includes(action.tag)
          ? state.tags.filter((t) => t !== action.tag)
          : [...state.tags, action.tag].slice(0, MAX_PROJECT_TAGS),
      };

    case "logoPending":
      return {
        ...state,
        logo: { preview: action.preview, url: null, path: null, uploading: true, fileName: action.fileName },
      };

    case "logoStored":
      return { ...state, logo: { ...state.logo, url: action.url, path: action.path, uploading: false } };

    case "logoFailed":
      // The preview survives a failed upload: the user picked a real image and
      // may well want to retry rather than re-find the file.
      return { ...state, logo: { ...state.logo, uploading: false, url: null, path: null } };

    case "logoCleared":
      return { ...state, logo: EMPTY_LOGO };

    case "generateStart":
      return { ...state, phase: "loading", error: null };

    case "generateOk":
      return {
        ...state,
        phase: "ready",
        error: null,
        offline: action.offline,
        blueprint: action.blueprint,
        name: state.name.trim() || action.name,
      };

    case "generateFail":
      return { ...state, phase: "error", error: action.error };

    case "clearBlueprint":
      return { ...state, phase: "idle", error: null, offline: false, blueprint: null };

    case "reset":
      return INITIAL;

    case "setIdea":
      return withBlueprint(state, (b) => ({ ...b, idea: action.value.slice(0, 1000) }));

    case "listAdd":
      return withBlueprint(state, (b) => ({
        ...b,
        [action.key]: [...b[action.key], action.value.slice(0, 200)],
      }));

    case "listUpdate":
      return withBlueprint(state, (b) => ({
        ...b,
        [action.key]: b[action.key].map((item, i) => (i === action.index ? action.value.slice(0, 200) : item)),
      }));

    case "listRemove":
      return withBlueprint(state, (b) => ({
        ...b,
        [action.key]: b[action.key].filter((_, i) => i !== action.index),
      }));

    case "milestoneAdd":
      return withBlueprint(state, (b) => ({
        ...b,
        milestones: [...b.milestones, { id: action.id, title: "", description: "", status: "planned" }],
      }));

    case "milestoneUpdate":
      return withBlueprint(state, (b) => ({
        ...b,
        milestones: b.milestones.map((m) => (m.id === action.id ? { ...m, ...action.patch } : m)),
      }));

    case "milestoneRemove":
      return withBlueprint(state, (b) => ({
        ...b,
        milestones: b.milestones.filter((m) => m.id !== action.id),
      }));

    case "milestoneMove":
      return withBlueprint(state, (b) => ({
        ...b,
        milestones: reorder(b.milestones, action.from, action.to),
      }));
  }
}

export function useCreateProject(onCreated: (projectId: string) => void) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [generating, startGenerate] = useTransition();
  const [creating, startCreate] = useTransition();
  /** Set while a confirmation dialog is open; the dialog owns what happens next. */
  const [confirming, setConfirming] = useState<"clear" | null>(null);

  // A generation in flight is tracked here as well as by useTransition, because
  // the button must refuse a second click during the await *before* React has
  // scheduled the transition — two clicks in the same tick would otherwise cost
  // two model calls.
  const inFlight = useRef(false);

  const hasBlueprint = state.blueprint !== null;
  const hasDraft =
    hasBlueprint ||
    state.description.trim().length > 0 ||
    state.logo.preview !== null ||
    state.targetDate !== "" ||
    state.tags.length > 0 ||
    state.category.trim() !== "" ||
    state.type.trim() !== "";

  // ---- logo ---------------------------------------------------------------

  const chooseLogo = useCallback(
    (file: File) => {
      const invalid = validateLogoFile(file);
      if (invalid) {
        toast.error(invalid);
        return;
      }
      const previous = state.logo.path;
      // Replacing a logo drops the old preview's blob; without this the picked
      // images accumulate in memory for as long as the page is open.
      if (state.logo.preview) URL.revokeObjectURL(state.logo.preview);
      const preview = URL.createObjectURL(file);
      dispatch({ type: "logoPending", preview, fileName: file.name });

      void (async () => {
        const result = await uploadProjectLogo(file);
        if (result.ok) {
          dispatch({ type: "logoStored", url: result.url, path: result.path });
          void removeProjectLogo(previous);
          toast.success("Logo added");
        } else {
          dispatch({ type: "logoFailed" });
          toast.error(result.error);
        }
      })();
    },
    [state.logo.path, state.logo.preview],
  );

  const clearLogo = useCallback(() => {
    if (state.logo.preview) URL.revokeObjectURL(state.logo.preview);
    void removeProjectLogo(state.logo.path);
    dispatch({ type: "logoCleared" });
  }, [state.logo.preview, state.logo.path]);

  // ---- generation ---------------------------------------------------------

  const generate = useCallback(() => {
    if (inFlight.current) return;
    const description = state.description.trim();
    if (!description) {
      toast.error("Describe your project first.");
      return;
    }
    inFlight.current = true;
    dispatch({ type: "generateStart" });

    startGenerate(async () => {
      try {
        const response = await generateProjectBlueprint({ description, projectName: state.name });
        if (!response.ok || !response.blueprint) {
          dispatch({ type: "generateFail", error: response.error ?? "Something went wrong." });
          return;
        }
        const draft = toDraft(response.blueprint);
        dispatch({ type: "generateOk", blueprint: draft, offline: response.offline, name: draft.name });
        toast.success(
          response.offline
            ? "Blueprint drafted offline — review it before creating"
            : "Blueprint ready — review and edit anything",
        );
      } catch {
        dispatch({ type: "generateFail", error: "Couldn't reach the AI — try again." });
      } finally {
        inFlight.current = false;
      }
    });
  }, [state.description, state.name]);

  /** "Clear" wipes the whole draft — and asks first once there is one to lose. */
  const requestClear = useCallback(() => {
    if (!hasDraft) return;
    if (hasBlueprint) {
      setConfirming("clear");
      return;
    }
    clearLogo();
    dispatch({ type: "reset" });
  }, [hasDraft, hasBlueprint, clearLogo]);

  const confirmClear = useCallback(() => {
    clearLogo();
    dispatch({ type: "reset" });
    setConfirming(null);
    toast.success("Cleared");
  }, [clearLogo]);

  // ---- create -------------------------------------------------------------

  const payload = useMemo(
    () => ({
      name: state.name.trim(),
      logoUrl: state.logo.url,
      description: state.description.trim(),
      idea: state.blueprint?.idea.trim() ?? "",
      keyFeatures: state.blueprint?.keyFeatures.map((f) => f.trim()).filter(Boolean) ?? [],
      problems: state.blueprint?.problems.map((p) => p.trim()).filter(Boolean) ?? [],
      milestones:
        state.blueprint?.milestones
          .map((m) => ({ title: m.title.trim(), description: m.description.trim(), status: m.status }))
          .filter((m) => m.title) ?? [],
      targetDate: state.targetDate || null,
      tags: state.tags,
      category: state.category.trim() || null,
      type: state.type.trim() || null,
    }),
    [state],
  );

  const validationError = useMemo(() => validateCreatePayload(payload), [payload]);

  const create = useCallback(() => {
    if (validationError) {
      toast.error(validationError);
      return;
    }
    startCreate(async () => {
      const result = await createProjectFromBlueprint(payload);
      if (result.ok && result.projectId) {
        toast.success("Project created 🚀");
        onCreated(result.projectId);
      } else {
        toast.error(result.error ?? "Couldn't create the project.");
      }
    });
  }, [payload, validationError, onCreated]);

  return {
    state,
    generating: generating || state.phase === "loading",
    creating,
    confirming,
    hasBlueprint,
    hasDraft,
    validationError,
    cancelConfirm: () => setConfirming(null),
    confirmClear,
    actions: {
      setName: (value: string) => dispatch({ type: "setName", value }),
      setDescription: (value: string) => dispatch({ type: "setDescription", value }),
      setTargetDate: (value: string) => dispatch({ type: "setTargetDate", value }),
      setCategory: (value: string) => dispatch({ type: "setCategory", value }),
      setType: (value: string) => dispatch({ type: "setType", value }),
      toggleTag: (tag: string) => dispatch({ type: "toggleTag", tag }),
      chooseLogo,
      clearLogo,
      generate,
      requestClear,
      create,
      setIdea: (value: string) => dispatch({ type: "setIdea", value }),
      addFeature: (value: string) => dispatch({ type: "listAdd", key: "keyFeatures", value }),
      updateFeature: (index: number, value: string) =>
        dispatch({ type: "listUpdate", key: "keyFeatures", index, value }),
      removeFeature: (index: number) => dispatch({ type: "listRemove", key: "keyFeatures", index }),
      addProblem: (value: string) => dispatch({ type: "listAdd", key: "problems", value }),
      updateProblem: (index: number, value: string) =>
        dispatch({ type: "listUpdate", key: "problems", index, value }),
      removeProblem: (index: number) => dispatch({ type: "listRemove", key: "problems", index }),
      /** Mints the id here rather than in the reducer, so the caller can focus the new row. */
      addMilestone: () => {
        const id = draftId();
        dispatch({ type: "milestoneAdd", id });
        return id;
      },
      updateMilestone: (id: string, patch: Partial<Omit<DraftMilestone, "id">>) =>
        dispatch({ type: "milestoneUpdate", id, patch }),
      setMilestoneStatus: (id: string, status: MilestoneStatus) =>
        dispatch({ type: "milestoneUpdate", id, patch: { status } }),
      removeMilestone: (id: string) => dispatch({ type: "milestoneRemove", id }),
      moveMilestone: (from: number, to: number) => dispatch({ type: "milestoneMove", from, to }),
    },
  };
}

export type CreateProjectApi = ReturnType<typeof useCreateProject>;
