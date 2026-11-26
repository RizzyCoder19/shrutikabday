export interface ShrutiPhoto {
  id: string;
  src: string;
  width: number;
  height: number;
  depthLayer: number; // 0.65 .. 1.25 for parallax depth
}

/**
 * Approved Shruti photographs from /public/images/shruti/.
 * Aspect ratios preserved directly from source image dimensions.
 * Zero invented captions or unverified labels.
 */
export const SHRUTI_PHOTOS: ShrutiPhoto[] = [
  { id: "p-1", src: "/images/shruti/1000019961.jpg", width: 720, height: 1280, depthLayer: 1.05 },
  { id: "p-2", src: "/images/shruti/1000019966.jpg", width: 4032, height: 2880, depthLayer: 0.9 },
  { id: "p-3", src: "/images/shruti/1000019968.jpg", width: 2832, height: 2864, depthLayer: 1.15 },
  { id: "p-4", src: "/images/shruti/1000019969.jpg", width: 1711, height: 1080, depthLayer: 0.8 },
  { id: "p-5", src: "/images/shruti/1000019962.jpg", width: 720, height: 1280, depthLayer: 1.0 },
  { id: "p-6", src: "/images/shruti/1000019971.jpg", width: 1707, height: 1080, depthLayer: 0.85 },
  { id: "p-7", src: "/images/shruti/1000019963.jpg", width: 720, height: 1280, depthLayer: 1.1 },
  { id: "p-8", src: "/images/shruti/1000019975.jpg", width: 1080, height: 1920, depthLayer: 0.95 },
  { id: "p-9", src: "/images/shruti/1000019981.jpg", width: 3796, height: 2880, depthLayer: 0.85 },
  { id: "p-10", src: "/images/shruti/1000019973.jpg", width: 1719, height: 1080, depthLayer: 1.0 },
  { id: "p-11", src: "/images/shruti/1000019982.jpg", width: 1888, height: 1080, depthLayer: 0.78 },
  { id: "p-12", src: "/images/shruti/1000019983.jpg", width: 1702, height: 2864, depthLayer: 1.12 },
];
