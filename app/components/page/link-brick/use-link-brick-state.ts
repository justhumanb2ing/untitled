import { useMemo } from "react";

import { useEditableField } from "@/hooks/use-editable-field";
import { usePageGridActions } from "@/components/page/page-grid-context";
import type { GridSize } from "@/config/grid-rule";
import type { PageGridBrick } from "service/pages/page-grid";
import { buildLinkBrickViewModel } from "@/service/pages/link-brick-view-model";

type UseLinkBrickStateParams = {
  brick: PageGridBrick<"link">;
  grid: GridSize;
};

export function useLinkBrickState({ brick, grid }: UseLinkBrickStateParams) {
  const { updateLinkBrick, isEditable } = usePageGridActions();
  const viewModel = useMemo(
    () => buildLinkBrickViewModel(brick.data, grid),
    [brick.data, grid]
  );
  const titleClampClass = resolveTitleClampClass(viewModel.titleLines);
  const isUploading = brick.status === "uploading";

  const {
    value: title,
    handleChange: handleTitleChange,
    handleBlur: handleTitleBlur,
    handleFocus: handleTitleFocus,
  } = useEditableField({
    initialValue: viewModel.title,
    onCommit: (nextValue) => {
      const normalizedTitle = normalizeLinkTitle(nextValue);
      updateLinkBrick({
        id: brick.id,
        data: { ...brick.data, title: normalizedTitle },
      });
    },
    normalize: normalizeLinkTitle,
    isEditable,
  });

  return {
    viewModel,
    title,
    titleClampClass,
    isUploading,
    isEditable,
    handleTitleChange,
    handleTitleBlur,
    handleTitleFocus,
  };
}

function resolveTitleClampClass(lines: number) {
  switch (lines) {
    case 1:
      return "line-clamp-1 truncate";
    case 3:
      return "line-clamp-3";
    case 5:
      return "line-clamp-5";
    default:
      return "";
  }
}

function normalizeLinkTitle(value: string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
