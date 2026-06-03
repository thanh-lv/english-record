import { Library } from "lucide-react";

interface StoriesTabProps {
  dbStories: any[];
  profile: any;
  studentAge: number;
  onStoryClick: (story: any) => void;
}

export function StoriesTab({ dbStories, profile, studentAge, onStoryClick }: StoriesTabProps) {
  return (
    <div className="bg-white/70 backdrop-blur-sm p-6 sm:p-8 rounded-[2rem] border-3 border-white shadow-md">
      <div className="mb-8 space-y-2 text-center">
        <h3 className="text-3xl font-black text-purple-500 flex items-center justify-center gap-3">
          <Library size={32} /> Góc Truyện Kể <Library size={32} />
        </h3>
        <p className="text-slate-500 font-bold text-sm">
          Chào {profile.name}! Con {studentAge} tuổi nên cô tặng con những truyện này nhé:
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {dbStories.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 font-bold bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            Chưa có truyện nào phù hợp với tuổi của con.
          </div>
        )}
        {dbStories.map((story) => (
          <div
            key={story.id}
            className="bg-white rounded-[2rem] border-4 border-purple-100 shadow-sm hover:shadow-md hover:scale-105 transition-all cursor-pointer flex flex-col items-center text-center overflow-hidden"
            onClick={() => onStoryClick(story)}
          >
            <div className="w-full aspect-video bg-slate-100 relative">
              {story.image_url ? (
                <img src={story.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl">
                  {story.emoji}
                </div>
              )}
            </div>
            <div className="p-4 w-full">
              <h4 className="font-extrabold text-slate-800 text-lg leading-tight mb-1">
                {story.title}
              </h4>
              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                {story.type}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
