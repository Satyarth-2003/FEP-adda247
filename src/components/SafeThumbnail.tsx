"use client";
import { useState } from "react";
import { Play } from "lucide-react";

interface SafeThumbnailProps {
  src?: string;
  alt?: string;
  className?: string;
  iconSize?: number;
}

export function SafeThumbnail({
  src,
  alt,
  className,
  iconSize = 14,
}: SafeThumbnailProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg-elev text-fg-dim">
        <Play style={{ width: iconSize, height: iconSize }} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt || ""}
      className={className}
      onError={() => setError(true)}
    />
  );
}
