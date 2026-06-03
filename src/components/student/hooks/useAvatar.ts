import { useState } from "react";
import { supabase } from "../../../lib/supabase";

export const AVATARS = [
  "🐰",
  "🐯",
  "🐶",
  "🦊",
  "🐻",
  "🐼",
  "🐨",
  "🐸",
  "🐧",
  "🦄",
  "🦖",
  "🐳",
];

export function useAvatar(profile: any) {
  const [currentAvatar, setCurrentAvatar] = useState(() => {
    return (
      profile.avatar || localStorage.getItem(`avatar_${profile.id}`) || "🐰"
    );
  });
  const [showAvatarSelect, setShowAvatarSelect] = useState(false);

  const changeAvatar = async (emoji: string) => {
    setCurrentAvatar(emoji);
    setShowAvatarSelect(false);
    localStorage.setItem(`avatar_${profile.id}`, emoji);
    try {
      await supabase
        .from("profiles")
        .update({ avatar: emoji })
        .eq("id", profile.id);
    } catch (e) {
      console.warn("Could not save avatar to db", e);
    }
  };

  return { currentAvatar, showAvatarSelect, setShowAvatarSelect, changeAvatar };
}
