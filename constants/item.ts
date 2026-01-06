import type { BrickBase, BrickRow } from "types/brick";

const dummyBase: BrickBase = {
  position: {
    mobile: { x: 0, y: 0 },
    desktop: { x: 0, y: 0 },
  },
  style: {
    mobile: { grid: { w: 1, h: 2 } },
    desktop: { grid: { w: 1, h: 2 } },
  },
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

export const dummyLinkBricks: BrickRow<"link">[] = [
  {
    id: "brick-1",
    type: "link",
    ...dummyBase,
    data: {
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
    ...dummyBase,
    data: {
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
    ...dummyBase,
    data: {
      url: "https://www.threads.com/@just_human__b2ing",
      title: "Justhumanb2ing",
      description: "My profile",
      site_name: "threads",
      icon_url: null,
      image_url: null,
    },
  },
];

export const dummyTextBricks: BrickRow<"text">[] = [
  {
    id: "brick-0",
    type: "text",
    ...dummyBase,
    data: {
      text: "안녕하세요. 임시 페이지입니다. Welcome. aksdf mlaksdmflkasdf마ㅣㄴ으리ㅏㅁㄴ으라ㅣㅁ느이람ㄴㅇㄹ",
    },
  },
];

export const dummyImageBricks: BrickRow<"image">[] = [
  {
    id: "brick-4",
    type: "image",
    ...dummyBase,
    data: {
      image_url:
        "https://images.unsplash.com/photo-1764649841485-82d7bd92760a?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      link_url: null,
    },
  },
  {
    id: "brick-5",
    type: "image",
    ...dummyBase,
    data: {
      image_url:
        "https://images.unsplash.com/photo-1765834082477-5f9c1466a7c4?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      link_url: "https://unsplash.com/ko/@t_ahmetler",
    },
  },
];

export const dummySectionBricks: BrickRow<"section">[] = [
  {
    id: "brick-6",
    type: "section",
    ...dummyBase,
    data: {
      text: "section title asdfasdf asdflkamsdlkmaskldfaklsdmfklasdmflkasdmflkasdflk",
    },
  },
  {
    id: "brick-6",
    type: "section",
    ...dummyBase,
    data: {
      text: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.",
    },
  },
];

export const dummyVideoBricks: BrickRow<"video">[] = [
  {
    id: "brick-7",
    type: "video",
    ...dummyBase,
    data: {
      video_url: "https://www.pexels.com/download/video/35154911/",
      link_url: null,
    },
  },
  {
    id: "brick-7",
    type: "video",
    ...dummyBase,
    data: {
      video_url: "https://www.pexels.com/download/video/35145106/",
      link_url: "https://www.pexels.com/@jessica-bonafede-390172932/",
    },
  },
];
