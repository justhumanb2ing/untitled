import { describe, expect, it } from "vitest";

import {
  buildLinkBrickViewModel,
  resolveLinkBrickVariant,
} from "../../service/pages/link-brick-view-model";
import type { BrickLinkRow } from "../../types/brick";

const baseData: BrickLinkRow = {
  title: "Example title",
  description: "Example description",
  url: "https://example.com/path",
  site_name: "Example",
  icon_url: "https://example.com/icon.png",
  image_url: "https://example.com/image.png",
};

describe("resolveLinkBrickVariant", () => {
  it("returns compact for 1x1 tiles", () => {
    expect(resolveLinkBrickVariant({ w: 1, h: 1 })).toBe("compact");
  });

  it("returns rich for 2x4 tiles", () => {
    expect(resolveLinkBrickVariant({ w: 2, h: 4 })).toBe("rich");
  });
});

describe("buildLinkBrickViewModel", () => {
  it("hides description and site label for compact tiles", () => {
    const viewModel = buildLinkBrickViewModel(baseData, { w: 1, h: 1 });

    expect(viewModel.variant).toBe("compact");
    expect(viewModel.showDescription).toBe(false);
    expect(viewModel.showSiteLabel).toBe(false);
    expect(viewModel.layout).toBe("inline");
  });

  it("shows description and image for rich tiles", () => {
    const viewModel = buildLinkBrickViewModel(baseData, { w: 2, h: 4 });

    expect(viewModel.variant).toBe("rich");
    expect(viewModel.showDescription).toBe(true);
    expect(viewModel.showImage).toBe(true);
  });

  it("resolves title line limits by size", () => {
    expect(buildLinkBrickViewModel(baseData, { w: 1, h: 1 }).titleLines).toBe(1);
    expect(buildLinkBrickViewModel(baseData, { w: 1, h: 2 }).titleLines).toBe(3);
    expect(buildLinkBrickViewModel(baseData, { w: 2, h: 2 }).titleLines).toBe(3);
    expect(buildLinkBrickViewModel(baseData, { w: 1, h: 4 }).titleLines).toBe(5);
    expect(buildLinkBrickViewModel(baseData, { w: 2, h: 4 }).titleLines).toBe(5);
  });

  it("falls back to hostname when site name is missing", () => {
    const viewModel = buildLinkBrickViewModel(
      { ...baseData, site_name: null },
      { w: 1, h: 2 }
    );

    expect(viewModel.siteLabel).toBe("example.com");
  });
});
