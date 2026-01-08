import type {
  GridPosition,
  GridResponsive,
  GridSize,
} from "@/config/grid-rule";

export type BrickStyle = {
  grid: GridSize;
};

export type BrickTimestamp = string;

export interface BrickBase {
  position: GridResponsive<GridPosition>;
  style: GridResponsive<BrickStyle>;
  created_at: BrickTimestamp;
  updated_at: BrickTimestamp;
}

export interface BrickLinkRow {
  title: string | null;
  description: string | null;
  url: string;
  site_name: string | null;
  icon_url: string | null;
  image_url: string | null;
}

export interface BrickMapRow {
  lat: number | null;
  lng: number | null;
  zoom: number | null;
  href: string;
  caption: string | null;
}

export interface BrickSectionRow {
  text: string;
}

export interface BrickTextRow {
  text: string;
}

export interface BrickVideoRow {
  video_url: string;
  link_url: string | null;
}

export interface BrickImageRow {
  image_url: string;
  link_url: string | null;
}

/**
 * brick.type → 실제 Row 타입 매핑
 * 신규 brick 추가 시 여기만 수정
 */
export interface BrickRowMap {
  link: BrickLinkRow;
  map: BrickMapRow;
  section: BrickSectionRow;
  text: BrickTextRow;
  video: BrickVideoRow;
  image: BrickImageRow;
}

export type BrickType = keyof BrickRowMap;

/**
 * type-safe brick row
 */
export type BrickRow<T extends BrickType = BrickType> = BrickBase & {
  id: string;
  type: T;
  data: BrickRowMap[T];
};
