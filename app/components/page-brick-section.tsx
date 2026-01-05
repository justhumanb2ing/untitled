import {
  Item,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { LinkIcon } from "@phosphor-icons/react";
import {
  dummyImageBricks,
  dummyLinkBricks,
  dummySectionBricks,
  dummyTextBricks,
  dummyVideoBricks,
} from "constants/item";

interface PageBrickSectionProps {}

export default function PageBrickSection({}: PageBrickSectionProps) {
  return (
    <div className="space-y-6">
      {/* Link Brick Item */}
      <div className="flex flex-col gap-3">
        {dummyLinkBricks.map(
          ({ id, row: { url, title, site_name, icon_url, image_url } }) => (
            // TODO: Custom Width, Height
            <Item
              key={id}
              variant={"muted"}
              className="bg-muted/50 rounded-xl max-w-sm"
              render={
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full min-w-full"
                >
                  <ItemMedia variant={"image"} className="self-center">
                    {icon_url ? (
                      <img
                        src={icon_url}
                        alt="favicon"
                        className="object-cover"
                      />
                    ) : (
                      <LinkIcon weight="bold" className="size-5" />
                    )}
                  </ItemMedia>
                  <ItemContent className="gap-0">
                    <ItemTitle className="text-base/relaxed font-normal tracking-wider">
                      {title}
                    </ItemTitle>
                    <ItemDescription>{site_name}</ItemDescription>
                  </ItemContent>
                  {image_url && (
                    <ItemFooter className="overflow-hidden justify-start mt-10">
                      <div className="w-full aspect-video h-44 rounded-xl overflow-hidden">
                        <img
                          src={image_url}
                          alt="image"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </ItemFooter>
                  )}
                </a>
              }
            />
          )
        )}
      </div>

      {/* Text Brick Item */}
      <div className="flex flex-col gap-3">
        <Item className="hover:bg-muted/50 rounded-xl">
          <ItemContent>
            <ItemTitle className="text-lg text-pretty break-all font-light">
              {dummyTextBricks[0].row.text}
            </ItemTitle>
          </ItemContent>
        </Item>
      </div>

      {/* Image Brick Item */}
      <div className="flex flex-col gap-3">
        {dummyImageBricks.map(({ id, row: { image_url, link_url } }) => (
          <Item
            key={id}
            render={
              <a
                href={link_url ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full min-w-full rounded-xl"
              >
                <ItemContent>
                  {/* TODO: Custom Width, Height */}
                  <div className="rounded-lg overflow-hidden h-60">
                    <img
                      src={image_url}
                      alt="image"
                      className="object-cover w-full h-full"
                    />
                  </div>
                </ItemContent>
              </a>
            }
          />
        ))}
      </div>

      {/* Section Brick Item */}
      <div className="flex flex-col gap-3">
        {dummySectionBricks.map(({ id, row: { text } }) => (
          <Item key={id} className="hover:bg-muted/50 rounded-xl">
            <ItemContent>
              <ItemTitle className="text-2xl font-semibold text-pretty break-all">
                {text}
              </ItemTitle>
            </ItemContent>
          </Item>
        ))}
      </div>

      {/* Video Brick Item */}
      <div className="flex flex-col gap-3">
        {dummyVideoBricks.map(({ id, row: { video_url, link_url } }) => (
          <Item
            key={id}
            render={
              <a
                href={link_url ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full min-w-full rounded-xl"
              >
                <ItemContent>
                  {/* TODO: Custom Width, Height */}
                  <div className="rounded-lg overflow-hidden h-60">
                    <video
                      src={video_url}
                      className="object-cover w-full h-full"
                      muted
                      playsInline
                      preload="metadata"
                      loop
                      autoPlay
                    />
                  </div>
                </ItemContent>
              </a>
            }
          />
        ))}
      </div>
    </div>
  );
}
