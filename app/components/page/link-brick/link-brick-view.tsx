import EditableParagraph from "@/components/profile/editable-paragraph";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LinkBrickVariant, LinkBrickViewModel } from "@/service/pages/link-brick-view-model";
import { LinkSimpleIcon } from "@phosphor-icons/react";

type LinkBrickViewProps = {
  viewModel: LinkBrickViewModel;
  title: string;
  titleClampClass: string;
  isUploading: boolean;
  isEditable: boolean;
  onTitleChange: (value: string) => void;
  onTitleBlur: () => void;
  onTitleFocus: () => void;
  linkUrl: string;
};

export function LinkBrickView({
  viewModel,
  title,
  titleClampClass,
  isUploading,
  isEditable,
  onTitleChange,
  onTitleBlur,
  onTitleFocus,
  linkUrl,
}: LinkBrickViewProps) {
  const renderTitle = (extraClass?: string) => (
    <EditableParagraph
      value={title}
      onValueChange={onTitleChange}
      onValueBlur={onTitleBlur}
      onFocus={onTitleFocus}
      readOnly={!isEditable}
      placeholder="Link title"
      ariaLabel="Link title"
      className={cn(
        "non-drag min-w-0 font-light text-foreground hover:bg-muted p-1 rounded-sm focus:bg-muted py-2",
        titleClampClass,
        extraClass
      )}
    />
  );

  const renderIcon = (iconSize?: string) =>
    viewModel.showIcon ? (
      <a
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-fit link-icon"
      >
        {viewModel.iconUrl ? (
          <img
            src={viewModel.iconUrl}
            alt=""
            className={cn(
              "size-7 shrink-0 rounded-lg object-cover xl:size-9",
              iconSize
            )}
          />
        ) : (
          <span className="size-5 shrink-0 rounded-lg flex items-center justify-center xl:size-6">
            <LinkSimpleIcon weight="bold" className="size-full" />
          </span>
        )}
      </a>
    ) : null;

  const layoutElement = (layout: LinkBrickVariant) => {
    switch (layout) {
      case "compact":
        return (
          <div className="h-full flex items-center gap-4 min-w-0">
            {renderIcon()}
            {renderTitle("flex-1")}
          </div>
        );
      case "standard":
        return (
          <div className="h-full flex flex-col justify-between min-w-0">
            <div className="flex flex-col gap-2 min-w-0 xl:gap-4">
              {renderIcon()}
              {renderTitle("line-clamp-2 xl:line-clamp-3")}
            </div>
            <p className="text-muted-foreground text-xs">
              {viewModel.siteLabel}
            </p>
          </div>
        );
      case "wide":
        return (
          <div className="h-full flex flex-row justify-between gap-8 min-w-0">
            <div className="flex flex-col justify-between flex-3 min-w-0">
              <div className="flex flex-col gap-2 min-w-0 xl:gap-4">
                {renderIcon()}
                {renderTitle("line-clamp-2 xl:line-clamp-3")}
              </div>
              <p className="text-muted-foreground text-xs">
                {viewModel.siteLabel}
              </p>
            </div>

            <div className="shrink-0 flex-2 overflow-hidden rounded-lg">
              {viewModel.imageUrl ? (
                <img
                  src={viewModel.imageUrl}
                  alt={viewModel.siteLabel ?? ""}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-muted" />
              )}
            </div>
          </div>
        );
      case "tall":
        return (
          <div className="h-full flex flex-col justify-between gap-8 min-w-0">
            <div className="flex flex-col gap-4 flex-2 min-w-0">
              {renderIcon()}
              {renderTitle()}
            </div>
            <div className="shrink-0 flex-2 overflow-hidden rounded-lg">
              {viewModel.imageUrl ? (
                <img
                  src={viewModel.imageUrl}
                  alt={viewModel.siteLabel ?? ""}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-muted" />
              )}
            </div>
          </div>
        );
      case "rich":
        return (
          <div className="h-full flex flex-col justify-between gap-8 min-w-0">
            <div className="flex flex-col gap-4 flex-2 min-w-0">
              {renderIcon()}
              {renderTitle()}
            </div>
            <div className="shrink-0 flex-3 overflow-hidden rounded-lg">
              {viewModel.imageUrl ? (
                <img
                  src={viewModel.imageUrl}
                  alt={viewModel.siteLabel ?? ""}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-muted" />
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className={cn(
        "relative h-full w-full box-border rounded-xl p-4 text-sm overflow-hidden",
        isUploading ? "bg-muted/60" : "bg-muted/30"
      )}
      aria-busy={isUploading}
    >
      {isUploading ? (
        <Skeleton className="absolute inset-0" />
      ) : (
        <div className="h-full">{layoutElement(viewModel.variant)}</div>
      )}
    </div>
  );
}
