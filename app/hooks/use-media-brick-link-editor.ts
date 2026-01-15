import { useCallback, useRef, useState } from "react";

type MediaBrickLinkUpdate = {
  id: string;
  linkUrl: string | null;
};

type UseMediaBrickLinkEditorOptions = {
  updateMediaBrickLink: (update: MediaBrickLinkUpdate) => void;
};

type UseMediaBrickLinkEditorReturn = {
  linkInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  isPopoverOpen: (brickId: string) => boolean;
  getInputValue: (brickId: string, fallback: string) => string;
  handlePopoverChange: (brickId: string, open: boolean, currentValue: string) => void;
  handleInputChange: (brickId: string, value: string) => void;
  handleInputClear: (brickId: string) => void;
  handleSubmit: (brickId: string, value: string) => void;
};

/**
 * 미디어 브릭의 링크 편집 기능을 관리하는 훅
 *
 * 팝오버 상태, 입력 값, ref 관리를 캡슐화합니다.
 *
 * @param updateMediaBrickLink - 미디어 브릭 링크 업데이트 콜백
 */
export function useMediaBrickLinkEditor({
  updateMediaBrickLink,
}: UseMediaBrickLinkEditorOptions): UseMediaBrickLinkEditorReturn {
  const linkInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [popovers, setPopovers] = useState<Record<string, boolean>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});

  const isPopoverOpen = useCallback(
    (brickId: string) => {
      return !!popovers[brickId];
    },
    [popovers]
  );

  const getInputValue = useCallback(
    (brickId: string, fallback: string) => {
      return inputs[brickId] ?? fallback;
    },
    [inputs]
  );

  const handlePopoverChange = useCallback(
    (brickId: string, open: boolean, currentValue: string) => {
      setPopovers((prev) => ({
        ...prev,
        [brickId]: open,
      }));

      if (open) {
        setInputs((prev) => ({
          ...prev,
          [brickId]: currentValue,
        }));
      }
    },
    []
  );

  const handleInputChange = useCallback((brickId: string, value: string) => {
    setInputs((prev) => ({
      ...prev,
      [brickId]: value,
    }));
  }, []);

  const handleInputClear = useCallback((brickId: string) => {
    setInputs((prev) => ({
      ...prev,
      [brickId]: "",
    }));
    linkInputRefs.current[brickId]?.focus();
  }, []);

  const handleSubmit = useCallback(
    (brickId: string, value: string) => {
      updateMediaBrickLink({
        id: brickId,
        linkUrl: value.length > 0 ? value : null,
      });
      setPopovers((prev) => ({
        ...prev,
        [brickId]: false,
      }));
    },
    [updateMediaBrickLink]
  );

  return {
    linkInputRefs,
    isPopoverOpen,
    getInputValue,
    handlePopoverChange,
    handleInputChange,
    handleInputClear,
    handleSubmit,
  };
}
