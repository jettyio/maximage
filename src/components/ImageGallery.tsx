"use client";

import { useState } from "react";
import { ImageLightbox } from "./ImageLightbox";

interface ImageItem {
  path: string;
  label?: string;
}

export function ImageGallery({ images }: { images: ImageItem[] }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (images.length === 0) {
    return (
      <p className="text-sm text-neutral-500">No images generated yet.</p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img, i) => (
          <button
            key={img.path}
            onClick={() => setLightboxIdx(i)}
            className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 transition-colors hover:border-neutral-600"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/file?path=${encodeURIComponent(img.path)}`}
              alt={img.label ?? `Image ${i + 1}`}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            {img.label && (
              <span className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-xs text-neutral-300">
                {img.label}
              </span>
            )}
          </button>
        ))}
      </div>

      {lightboxIdx !== null && (
        <ImageLightbox
          images={images}
          initialIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </>
  );
}
