import { BookOpen, Square, Volume2, X } from "lucide-react";

interface StoryModalProps {
  story: any;
  isPlayingAudio: boolean;
  onClose: () => void;
  onPlayAudio: (e: React.MouseEvent) => void;
}

export function StoryModal({
  story,
  isPlayingAudio,
  onClose,
  onPlayAudio,
}: StoryModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center p-4 z-[60] overflow-y-auto items-start py-8">
      <div className="bg-white rounded-[2.5rem] w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 relative my-auto">
        {story.image_url ? (
          <div className="w-full h-64 md:h-80 relative">
            <img
              src={story.image_url}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-white/20 backdrop-blur-md hover:bg-white/40 text-white rounded-full p-2 transition-colors"
            >
              <X size={24} />
            </button>
            <div className="absolute bottom-4 left-6 right-6">
              <span className="text-xs font-black bg-purple-500 text-white px-3 py-1 rounded-full mb-2 inline-block">
                {story.type}
              </span>
              <h3 className="text-3xl md:text-4xl font-black text-white leading-tight drop-shadow-md">
                {story.title}
              </h3>
            </div>
          </div>
        ) : (
          <div className="p-6 pb-0 flex justify-between items-start">
            <div>
              <span className="text-xs font-black bg-purple-100 text-purple-700 px-3 py-1 rounded-full mb-2 inline-block">
                {story.type}
              </span>
              <h3 className="text-3xl md:text-4xl font-black text-slate-800 leading-tight">
                {story.emoji} {story.title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full p-2 transition-colors shrink-0"
            >
              <X size={24} />
            </button>
          </div>
        )}

        <div className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-black text-slate-800 text-xl flex items-center gap-2">
              <BookOpen className="text-purple-500" />
              Nội dung truyện
            </h4>
            <button
              onClick={onPlayAudio}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all shadow-sm ${
                isPlayingAudio
                  ? "bg-rose-100 text-rose-600 hover:bg-rose-200"
                  : "bg-purple-100 text-purple-600 hover:bg-purple-200"
              }`}
            >
              {isPlayingAudio ? (
                <>
                  <Square size={18} fill="currentColor" /> Dừng nghe
                </>
              ) : (
                <>
                  <Volume2 size={18} /> Đọc truyện
                </>
              )}
            </button>
          </div>
          <div className="bg-purple-50/50 p-6 md:p-8 rounded-[2rem] border-2 border-purple-100">
            <p className="text-lg md:text-xl font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
              {story.content}
            </p>
          </div>
        </div>

        <div className="p-4 md:p-6 bg-slate-50 border-t-2 border-slate-100 flex justify-center">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
          >
            Đóng lại
          </button>
        </div>
      </div>
    </div>
  );
}
