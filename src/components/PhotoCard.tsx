import type { ReactNode } from "react";
import { photoSrcSet, photoUrl, type Photo } from "../lib/photos";

/** A photo printed like a parcel snapshot: rounded, tilted, with a sticker and a photographer credit. */
export function PhotoCard({
  photo,
  width = 420,
  ratio = 1.25,
  tilt = 0,
  sticker,
  className = "",
  eager = false,
}: {
  photo: Photo;
  width?: number;
  ratio?: number;
  tilt?: number;
  sticker?: ReactNode;
  className?: string;
  eager?: boolean;
}) {
  return (
    <figure className={`photo-card ${className}`} style={{ "--tilt": `${tilt}deg` } as React.CSSProperties}>
      <img
        src={photoUrl(photo, width, ratio)}
        srcSet={photoSrcSet(photo, width, ratio)}
        alt={photo.alt}
        width={width}
        height={Math.round(width * ratio)}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
      />
      {sticker && <span className="photo-sticker">{sticker}</span>}
      <figcaption>Photo: {photo.author}, Unsplash</figcaption>
    </figure>
  );
}
