"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface ImageItem {
  path: string;
  label?: string;
}

export function ImageLightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: ImageItem[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(initialIndex);
  const img = images[idx];

  const prev = useCallback(
    () => setIdx((i) => (i > 0 ? i - 1 : images.length - 1)),
    [images.length]
  );
  const next = useCallback(
    () => setIdx((i) => (i < images.length - 1 ? i + 1 : 0)),
    [images.length]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
      >
        <X className="h-6 w-6" />
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-4 rounded-full p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-4 rounded-full p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </>
      )}

      <div
        className="max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/file?path=${encodeURIComponent(img.path)}`}
          alt={img.label ?? `Image ${idx + 1}`}
          className="max-h-[85vh] rounded-lg object-contain"
        />
        {img.label && (
          <p className="mt-2 text-center text-sm text-neutral-400">
            {img.label}
          </p>
        )}
        <p className="mt-1 text-center text-xs text-neutral-600">
          {idx + 1} / {images.length}
        </p>
      </div>
    </div>
  );
}
