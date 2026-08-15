import React from "react";
import YouTube, { YouTubeProps } from "react-youtube";
import { useLanguage } from "../../i18n/LanguageContext";

interface YouTubePlayerProps {
  url?: string | null;
  videoId?: string | null;
  title?: string;
  className?: string;
  onReady?: YouTubeProps["onReady"];
  onStateChange?: YouTubeProps["onStateChange"];
  opts?: YouTubeProps["opts"];
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
  onReady,
  onStateChange,
  opts,
}: YouTubePlayerProps) {
  const { t } = useLanguage();
  const id = videoId ?? extractYoutubeId(url) ?? null;

  if (!id) {
    return (
      <div
        className={`w-full h-full flex items-center justify-center text-white font-bold ${className}`}
      >
        {t.common.invalidVideoUrl}
      </div>
    );
  }

  const playerOpts = {
    height: "100%",
    width: "100%",
    ...opts,
    playerVars: {
      rel: 0,
      modestbranding: 1,
      ...(opts?.playerVars || {}),
    },
  };

  return (
    <div className={className}>
      <YouTube
        videoId={id}
        title={title || `youtube-${id}`}
        opts={playerOpts}
        onReady={onReady}
        onStateChange={onStateChange}
        className="w-full h-full"
        iframeClassName="w-full h-full"
      />
    </div>
  );
}

export { YouTubePlayer };
