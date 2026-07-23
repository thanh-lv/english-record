import React from "react";

interface YouTubePlayerProps {
  url?: string | null;
  videoId?: string | null;
  title?: string;
  className?: string;
}

export function extractYoutubeId(url?: string | null) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export default function YouTubePlayer({
  url,
  videoId,
  title,
  className = "",
}: YouTubePlayerProps) {
  const id = videoId ?? extractYoutubeId(url) ?? null;

  if (!id) {
    return (
      <div
        className={`w-full h-full flex items-center justify-center text-white font-bold ${className}`}
      >
        Invalid Video URL
      </div>
    );
  }

  const src = `https://www.youtube.com/embed/${id}?rel=0`;

  return (
    <iframe
      title={title || `youtube-${id}`}
      src={src}
      className={className}
      allowFullScreen
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    />
  );
}

export { YouTubePlayer };
