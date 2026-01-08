import { describe, expect, it } from "vitest";

import {
  createPageGridBrick,
  parsePageLayoutSnapshot,
  serializePageLayout,
  type PageGridBrick,
  type PageLayoutSnapshot,
} from "../../service/pages/page-grid";

function buildSampleBricks(): PageGridBrick[] {
  const bricks: PageGridBrick[] = [];

  const first = createPageGridBrick({
    id: "brick-1",
    type: "text",
    status: "ready",
    bricks: [],
    payload: { text: "Hello world" },
  });
  bricks.push(first);

  const second = createPageGridBrick({
    id: "brick-2",
    type: "link",
    status: "ready",
    bricks,
    payload: { url: "https://example.com" },
  });
  bricks.push(second);

  return bricks;
}

describe("parsePageLayoutSnapshot", () => {
  it("returns empty array for null or malformed layouts", () => {
    expect(parsePageLayoutSnapshot(null)).toEqual([]);
    expect(parsePageLayoutSnapshot("{")).toEqual([]);
  });

  it("rehydrates a serialized layout", () => {
    const bricks = buildSampleBricks();
    const layout = serializePageLayout(bricks);
    if (!layout) {
      throw new Error("expected a layout snapshot");
    }

    const parsed = parsePageLayoutSnapshot(layout);

    expect(parsed).toHaveLength(bricks.length);
    expect(parsed[0].id).toBe(bricks[0].id);
    expect(parsed[0].position).toEqual(bricks[0].position);
    expect(parsed[0].style).toEqual(bricks[0].style);
    expect(parsed.every((brick) => brick.status === "ready")).toBe(true);
  });

  it("supports layouts serialized as JSON strings", () => {
    const bricks = buildSampleBricks();
    const layout = serializePageLayout(bricks);
    if (!layout) {
      throw new Error("expected a layout snapshot");
    }

    const layoutString = JSON.stringify(layout);
    const parsed = parsePageLayoutSnapshot(layoutString);

    expect(parsed).toHaveLength(bricks.length);
    expect(parsed.map((brick) => brick.id)).toEqual(bricks.map((brick) => brick.id));
  });

  it("falls back to the available breakpoint when responsive data is incomplete", () => {
    const bricks = buildSampleBricks();
    const layout = serializePageLayout(bricks);
    if (!layout) {
      throw new Error("expected a layout snapshot");
    }

    const legacyLayout = JSON.parse(JSON.stringify(layout)) as PageLayoutSnapshot;
    delete legacyLayout.bricks[0].position.mobile;
    delete legacyLayout.bricks[0].style.mobile;

    const parsed = parsePageLayoutSnapshot(legacyLayout);

    expect(parsed).toHaveLength(bricks.length);
    expect(parsed[0].position.mobile).toEqual(parsed[0].position.desktop);
    expect(parsed[0].style.mobile.grid).toEqual(parsed[0].style.desktop.grid);
  });
});
