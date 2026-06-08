import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { useLanguage } from "../../i18n/LanguageContext";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

export function OfflineBanner() {
  const { t } = useLanguage();
  const isOnline = useOnlineStatus();
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowBackOnline(false);
    } else if (wasOffline) {
      setShowBackOnline(true);
      setWasOffline(false);
      const timer = setTimeout(() => setShowBackOnline(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!isOnline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 inset-x-0 z-[300] flex items-center justify-center gap-2 bg-rose-500 text-white text-sm font-bold py-2 px-4 shadow-md"
      >
        <WifiOff size={16} />
        {t.common.offlineBanner}
      </div>
    );
  }

  if (showBackOnline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 inset-x-0 z-[300] flex items-center justify-center gap-2 bg-emerald-500 text-white text-sm font-bold py-2 px-4 shadow-md animate-in fade-in duration-300"
      >
        <Wifi size={16} />
        {t.common.onlineBanner}
      </div>
    );
  }

  return null;
}
