import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { debounce, isEqual } from "es-toolkit";

import { getStrictContext } from "@/lib/get-strict-context";
import { usePageSaver } from "@/hooks/use-page-saver";
import type { PageSnapshot } from "../../service/pages/save-page";

type AutoSaveStatus = "idle" | "dirty" | "saving" | "synced" | "error";

type AutoSaveState = {
  status: AutoSaveStatus;
  message: string | null;
};

type AutoSaveAction =
  | { type: "MARK_IDLE" }
  | { type: "MARK_DIRTY" }
  | { type: "MARK_SAVING" }
  | { type: "MARK_SYNCED" }
  | { type: "MARK_ERROR"; message: string };

const statusLabels: Record<AutoSaveStatus, string> = {
  idle: "Up to date",
  dirty: "Saving...",
  saving: "Saving...",
  synced: "Up to date",
  error: "Save failed",
};

const initialState: AutoSaveState = {
  status: "idle",
  message: null,
};

function autoSaveReducer(
  state: AutoSaveState,
  action: AutoSaveAction
): AutoSaveState {
  switch (action.type) {
    case "MARK_IDLE":
      if (state.status === "idle" && state.message === null) {
        return state;
      }
      return { status: "idle", message: null };
    case "MARK_DIRTY":
      if (state.status === "dirty" && state.message === null) {
        return state;
      }
      return { status: "dirty", message: null };
    case "MARK_SAVING":
      if (state.status === "saving" && state.message === null) {
        return state;
      }
      return { status: "saving", message: null };
    case "MARK_SYNCED":
      if (state.status === "synced" && state.message === null) {
        return state;
      }
      return { status: "synced", message: null };
    case "MARK_ERROR":
      if (state.status === "error" && state.message === action.message) {
        return state;
      }
      return { status: "error", message: action.message };
    default:
      return state;
  }
}

type PageAutoSaveState = {
  status: AutoSaveStatus;
  statusLabel: string;
  message: string | null;
};

type PageAutoSaveActions = {
  updateDraft: (changes: Partial<PageSnapshot>) => void;
  markDirty: () => void;
  markError: () => void;
};

const [PageAutoSaveStateProvider, usePageAutoSaveState] =
  getStrictContext<PageAutoSaveState>("PageAutoSaveState");
const [PageAutoSaveActionsProvider, usePageAutoSaveActions] =
  getStrictContext<PageAutoSaveActions>("PageAutoSaveActions");

interface PageAutoSaveControllerProps {
  pageId: string;
  initialSnapshot: PageSnapshot;
  children: ReactNode;
  debounceMs?: number;
  enabled?: boolean;
}

/**
 * Coordinates debounced page snapshot saves and exposes status via context.
 */
export function PageAutoSaveController({
  pageId,
  initialSnapshot,
  debounceMs = 800,
  enabled = true,
  children,
}: PageAutoSaveControllerProps) {
  const [state, dispatch] = useReducer(autoSaveReducer, initialState);
  const savePage = usePageSaver();
  const savePageRef = useRef(savePage);
  const snapshotRef = useRef<PageSnapshot>(initialSnapshot);
  const syncedSnapshotRef = useRef<PageSnapshot>(initialSnapshot);
  const requestIdRef = useRef(0);
  const pageIdRef = useRef(pageId);
  const enabledRef = useRef(enabled);
  const mountedRef = useRef(true);

  useEffect(() => {
    savePageRef.current = savePage;
  }, [savePage]);

  useEffect(() => {
    pageIdRef.current = pageId;
  }, [pageId]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const performSave = useCallback(async (requestId: number) => {
    if (!enabledRef.current) {
      return;
    }

    dispatch({ type: "MARK_SAVING" });
    const snapshot = snapshotRef.current;

    try {
      await savePageRef.current({ pageId: pageIdRef.current, ...snapshot });

      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      syncedSnapshotRef.current = snapshot;
      dispatch({ type: "MARK_SYNCED" });
    } catch (error) {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      const message =
        error instanceof Error ? error.message : statusLabels.error;
      dispatch({ type: "MARK_ERROR", message });
    }
  }, []);

  const debouncedSave = useMemo(
    () =>
      debounce((requestId: number) => {
        void performSave(requestId);
      }, debounceMs),
    [performSave, debounceMs]
  );

  useEffect(() => {
    snapshotRef.current = initialSnapshot;
    syncedSnapshotRef.current = initialSnapshot;
    requestIdRef.current += 1;
    debouncedSave.cancel();
    dispatch({ type: "MARK_IDLE" });
  }, [initialSnapshot, debouncedSave]);

  useEffect(() => {
    if (!enabled) {
      debouncedSave.cancel();
      dispatch({ type: "MARK_IDLE" });
    }
  }, [enabled, debouncedSave]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  const updateDraft = useCallback(
    (changes: Partial<PageSnapshot>) => {
      if (!enabledRef.current) {
        return;
      }

      const previousSnapshot = snapshotRef.current;
      const nextSnapshot = { ...previousSnapshot, ...changes };

      if (isEqual(nextSnapshot, previousSnapshot)) {
        return;
      }

      snapshotRef.current = nextSnapshot;
      requestIdRef.current += 1;

      if (isEqual(nextSnapshot, syncedSnapshotRef.current)) {
        debouncedSave.cancel();
        dispatch({ type: "MARK_IDLE" });
        return;
      }

      dispatch({ type: "MARK_DIRTY" });
      debouncedSave(requestIdRef.current);
    },
    [debouncedSave]
  );

  const markDirty = useCallback(() => {
    if (!enabledRef.current) {
      return;
    }

    requestIdRef.current += 1;
    debouncedSave.cancel();
    dispatch({ type: "MARK_DIRTY" });
  }, [debouncedSave]);

  const markError = useCallback(() => {
    dispatch({ type: "MARK_ERROR", message: statusLabels.error });
  }, []);

  const stateValue = useMemo(
    () => ({
      status: state.status,
      statusLabel: statusLabels[state.status],
      message: state.message,
    }),
    [state.status, state.message]
  );

  const actionsValue = useMemo(
    () => ({ updateDraft, markDirty, markError }),
    [updateDraft, markDirty, markError]
  );

  return (
    <PageAutoSaveActionsProvider value={actionsValue}>
      <PageAutoSaveStateProvider value={stateValue}>
        {children}
      </PageAutoSaveStateProvider>
    </PageAutoSaveActionsProvider>
  );
}

export { usePageAutoSaveActions, usePageAutoSaveState };
export type { AutoSaveStatus };
