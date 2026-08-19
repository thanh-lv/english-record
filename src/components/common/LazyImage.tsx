import React, { useState } from 'react';
import { ImageOff, Loader2 } from 'lucide-react';

export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
  fallbackIcon?: React.ReactNode;
  aspectRatio?: string;
  showSkeleton?: boolean;
}

/**
 * Universal lazy-loaded Image component with:
 * - Native `loading="lazy"` & `decoding="async"`.
 * - Shimmer skeleton placeholder while loading.
 * - Smooth fade-in transition on decode.
 * - Graceful fallback when URL is missing or fails to load.
 */
export function LazyImage({
  src,
  alt = '',
  className = '',
  containerClassName = '',
  fallbackIcon,
  aspectRatio,
  showSkeleton = true,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(!src);

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-100 text-slate-400 select-none ${containerClassName || className}`}
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        {fallbackIcon || <ImageOff size={20} className="opacity-50" />}
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${containerClassName}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* Shimmer loading skeleton */}
      {!isLoaded && showSkeleton && (
        <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-pulse flex items-center justify-center">
          <Loader2 size={16} className="text-slate-300 animate-spin" />
        </div>
      )}

      {/* Lazy image */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        {...props}
      />
    </div>
  );
}
