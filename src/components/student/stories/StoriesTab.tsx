import { Library } from 'lucide-react';
import { interpolate, useLanguage } from '../../../i18n/LanguageContext';
import { LazyImage } from '../../common/LazyImage';

interface StoriesTabProps {
  dbStories: any[];
  profile: any;
  studentAge: number;
  onStoryClick: (story: any) => void;
}

export function StoriesTab({ dbStories, profile, studentAge, onStoryClick }: StoriesTabProps) {
  const { t } = useLanguage();
  return (
    <div className="sm:bg-white/70 sm:backdrop-blur-sm sm:p-6 rounded-lg border-3 sm:border-white sm:shadow-md">
      <div className="mb-6 space-y-1">
        <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <Library size={22} /> {t.stories.title}
        </h3>
        <p className="text-slate-500 font-bold text-sm">
          {interpolate(t.stories.subtitle, {
            name: profile.name,
            age: studentAge,
          })}
        </p>
      </div>

      {dbStories.length === 0 && (
        <div className="py-12 px-2 text-center text-slate-400 font-bold rounded-lg border-2 border-dashed border-slate-200">
          {t.stories.empty}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-5">
        {dbStories.map(story => (
          <div
            key={story.id}
            className="bg-white rounded-lg border-3 border-purple-100 shadow-md hover:shadow-md hover:scale-105 transition-all cursor-pointer flex flex-col overflow-hidden"
            onClick={() => onStoryClick(story)}
          >
            <div className="w-full aspect-square bg-slate-100 relative">
              {story.image_url ? (
                <LazyImage
                  src={story.image_url}
                  alt={story.title}
                  className="w-full h-full object-cover"
                  containerClassName="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl">
                  {story.emoji}
                </div>
              )}
            </div>
            <div className="p-3">
              <h4 className="font-extrabold text-slate-800 text-sm leading-tight mb-1 line-clamp-2">
                {story.title}
              </h4>
              <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg">
                {story.type}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
