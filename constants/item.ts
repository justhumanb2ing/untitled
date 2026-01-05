/**
 * 모든 brick_* 테이블이 공통으로 가지는 필드
 */
export interface BrickBase {
  block_id: string;
}

export interface BrickLinkRow extends BrickBase {
  title: string | null;
  description: string | null;
  url: string;
  site_name: string | null;
  icon_url: string | null;
  image_url: string | null;
}

export interface BrickMapRow extends BrickBase {
  lat: number | null;
  lng: number | null;
  zoom: number | null;
}

export interface BrickSectionRow extends BrickBase {
  text: string | null;
}

export interface BrickTextRow extends BrickBase {
  text: string;
}

export interface BrickVideoRow extends BrickBase {
  video_url: string;
  link_url: string | null;
}

export interface BrickImageRow extends BrickBase {
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
export type BrickRow<T extends BrickType = BrickType> = {
  type: T;
  data: BrickRowMap[T];
};

export type DummyBrick<T extends BrickType = BrickType> = {
  id: string;
  type: T;
  row: BrickRowMap[T];
};

export const dummyLinkBricks: DummyBrick<"link">[] = [
  {
    id: "brick-1",
    type: "link",
    row: {
      block_id: "brick-1",
      url: "https://www.threads.com/@just_human__b2ing",
      title: "Justhumanb2ing",
      description: "My profile",
      site_name: "threads",
      icon_url:
        "https://static.cdninstagram.com/rsrc.php/v4/yV/r/giQBh6jDlMa.png",
      image_url:
        "https://scontent-ssn1-1.cdninstagram.com/v/t51.82787-19/569724718_17848344591585690_5585469391110556324_n.jpg?stp=dst-jpg_s640x640_tt6&_nc_cat=108&ccb=7-5&_nc_sid=b3fa00&_nc_ohc=f3ggbvIDCHUQ7kNvwFgAs6O&_nc_oc=AdksoQRj2OxSxnGPYSkEp2-O2wDl9aobqDb3jhrUhTxTLnexX-KxUCmPya6Z-9JDBFc&_nc_zt=24&_nc_ht=scontent-ssn1-1.cdninstagram.com&_nc_gid=RCycD4RXttYZ3U3H3Ikxfw&oh=00_AfqWv-Iq8SGJRasSw6doO3tkQX4VQtHJ9Z6lWahWBBx4wg&oe=6961274C",
    },
  },
  {
    id: "brick-2",
    type: "link",
    row: {
      block_id: "brick-2",
      url: "https://www.threads.com/@just_human__b2ing",
      title: "Justhumanb2ing",
      description: "My profile",
      site_name: null,
      icon_url: null,
      image_url:
        "https://scontent-ssn1-1.cdninstagram.com/v/t51.82787-19/569724718_17848344591585690_5585469391110556324_n.jpg?stp=dst-jpg_s640x640_tt6&_nc_cat=108&ccb=7-5&_nc_sid=b3fa00&_nc_ohc=f3ggbvIDCHUQ7kNvwFgAs6O&_nc_oc=AdksoQRj2OxSxnGPYSkEp2-O2wDl9aobqDb3jhrUhTxTLnexX-KxUCmPya6Z-9JDBFc&_nc_zt=24&_nc_ht=scontent-ssn1-1.cdninstagram.com&_nc_gid=RCycD4RXttYZ3U3H3Ikxfw&oh=00_AfqWv-Iq8SGJRasSw6doO3tkQX4VQtHJ9Z6lWahWBBx4wg&oe=6961274C",
    },
  },
  {
    id: "brick-3",
    type: "link",
    row: {
      block_id: "brick-3",
      url: "https://www.threads.com/@just_human__b2ing",
      title: "Justhumanb2ing",
      description: "My profile",
      site_name: "threads",
      icon_url: null,
      image_url: null,
    },
  },
];

export const dummyTextBricks: DummyBrick<"text">[] = [
  {
    id: "brick-0",
    type: "text",
    row: {
      block_id: "brick-0",
      text: "안녕하세요. 임시 페이지입니다. Welcome. aksdf mlaksdmflkasdf마ㅣㄴ으리ㅏㅁㄴ으라ㅣㅁ느이람ㄴㅇㄹ",
    },
  },
];

export const dummyImageBricks: DummyBrick<"image">[] = [
  {
    id: "brick-4",
    type: "image",
    row: {
      block_id: "brick-4",
      image_url:
        "https://images.unsplash.com/photo-1764649841485-82d7bd92760a?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      link_url: null,
    },
  },
  {
    id: "brick-5",
    type: "image",
    row: {
      block_id: "brick-5",
      image_url:
        "https://images.unsplash.com/photo-1765834082477-5f9c1466a7c4?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      link_url: "https://unsplash.com/ko/@t_ahmetler",
    },
  },
];

export const dummySectionBricks: DummyBrick<"section">[] = [
  {
    id: "brick-6",
    type: "section",
    row: {
      block_id: "brick-6",
      text: "section title asdfasdf asdflkamsdlkmaskldfaklsdmfklasdmflkasdmflkasdflk",
    },
  },
  {
    id: "brick-6",
    type: "section",
    row: {
      block_id: "brick-6",
      text: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.",
    },
  },
];

export const dummyVideoBricks: DummyBrick<"video">[] = [
  {
    id: "brick-7",
    type: "video",
    row: {
      block_id: "brick-7",
      video_url: "https://www.pexels.com/download/video/35154911/",
      link_url: null,
    },
  },
  {
    id: "brick-7",
    type: "video",
    row: {
      block_id: "brick-7",
      video_url: "https://www.pexels.com/download/video/35145106/",
      link_url: "https://www.pexels.com/@jessica-bonafede-390172932/",
    },
  },
];
