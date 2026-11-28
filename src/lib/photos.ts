/**
 * Photography from Unsplash (Unsplash License, free to use). Each photo keeps its credit.
 * Served from the Unsplash image CDN at the size each slot needs.
 */
export interface Photo {
  id: string;
  alt: string;
  author: string;
}

export const PHOTOS = {
  artisan: {
    id: "photo-1773146916231-e6aeae932080",
    alt: "A maker at her workbench, wrapping an order among craft supplies",
    author: "Filipp Romanovski",
  },
  packer: {
    id: "photo-1648747067192-790595bc6d5e",
    alt: "A seller folding a cardboard box on her packing table",
    author: "M. Cooper",
  },
  phone: {
    id: "photo-1770013413878-2530e2c3d82b",
    alt: "A seller checking an order on her phone next to a stack of parcels",
    author: "Rifki Kurniawan",
  },
  handover: {
    id: "photo-1566576721346-d4a3b4eaeb55",
    alt: "A parcel being handed to a customer",
    author: "RoseBox",
  },
  unboxing: {
    id: "photo-1758691031621-f6870f9f998a",
    alt: "A man smiling as he looks into an open parcel",
    author: "Vitaly Gariev",
  },
} satisfies Record<string, Photo>;

export function photoUrl(p: Photo, width: number, ratio?: number): string {
  const h = ratio ? `&h=${Math.round(width * ratio)}` : "";
  return `https://images.unsplash.com/${p.id}?auto=format&fit=crop&q=80&w=${width}${h}`;
}

export function photoSrcSet(p: Photo, width: number, ratio?: number): string {
  return `${photoUrl(p, width, ratio)} 1x, ${photoUrl(p, width * 2, ratio)} 2x`;
}
