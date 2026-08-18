import { ChevronDown, ChevronUp, Plus, Trash2, Loader2, Pencil } from "lucide-react";
import { VocabSet, VocabCard } from "../../../types/vocabulary";
import { Translations, interpolate } from "../../../i18n/LanguageContext";

interface VocabSetCardProps {
  t: Translations;
  set: VocabSet;
  isExpanded: boolean;
  cards: VocabCard[] | undefined;
  cardsLoading: boolean;
  onToggle: () => void;
  onOpenAddCard: (setId: string) => void;
  onEditSet: (set: VocabSet) => void;
  onDeleteSet: (set: VocabSet) => void;
  onDeleteCard: (card: VocabCard) => void;
}

export function VocabSetCard({
  t,
  set,
  isExpanded,
  cards,
  cardsLoading,
  onToggle,
  onOpenAddCard,
  onEditSet,
  onDeleteSet,
  onDeleteCard,
}: VocabSetCardProps) {
  const vm = t.vocabManager;
  const tc = t.common;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden group hover:border-blue-300">
      {/* Set Header */}
      <div
        onClick={onToggle}
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 transition-colors gap-3"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <span className="w-12 h-12 shrink-0 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-2xl shadow-2xs group-hover:scale-105 transition-transform">
            {set.emoji}
          </span>
          <div className="min-w-0">
            <h4 className="font-black text-slate-800 text-base truncate group-hover:text-blue-600 transition-colors">
              {set.title}
            </h4>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="inline-flex items-center text-xs font-black text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-lg shadow-2xs">
                🏷️ {set.card_count ?? 0} {vm.cardCountUnit || "thẻ từ"}
              </span>
              {Array.isArray(set.grades) && set.grades.length > 0 ? (
                <span className="inline-flex items-center text-[11px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-lg shadow-2xs">
                  {interpolate(t.common.gradeLabel, {
                    grade: set.grades
                      .slice()
                      .sort((a: number, b: number) => a - b)
                      .join(", "),
                  })}
                </span>
              ) : (
                <span className="inline-flex items-center text-[11px] font-black text-slate-600 bg-slate-100 border border-slate-200/60 px-2.5 py-0.5 rounded-lg">
                  {t.teacherModal?.allGradesOption || "Tất cả các khối"}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenAddCard(set.id);
            }}
            className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-black rounded-xl border border-blue-100 shadow-2xs transition-all flex items-center gap-1.5 active:scale-95"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">{vm.addCard || "Thêm từ"}</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditSet(set);
            }}
            className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-xl border border-slate-100 transition-colors"
            title={t.common.edit}
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSet(set);
            }}
            className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl border border-slate-100 transition-colors"
            title={t.common.delete}
          >
            <Trash2 size={15} />
          </button>
          <div className="p-1 text-slate-400">
            {isExpanded ? (
              <ChevronUp size={20} className="transition-transform duration-200" />
            ) : (
              <ChevronDown size={20} className="transition-transform duration-200" />
            )}
          </div>
        </div>
      </div>

      {/* Cards Accordion Content */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/40 p-4 sm:p-5 space-y-4">
          {cardsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          ) : !cards || cards.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-bold bg-white rounded-2xl border border-dashed border-slate-200">
              {vm.emptyCards || "Chưa có từ vựng nào trong bộ này"}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="bg-white p-3.5 rounded-2xl border border-slate-200/80 hover:border-blue-300 shadow-2xs hover:shadow-xs transition-all flex gap-3 items-center group/card relative"
                >
                  {card.image_url ? (
                    <img
                      src={card.image_url}
                      alt={card.front}
                      className="w-13 h-13 object-cover rounded-xl border border-slate-100 shrink-0 shadow-2xs"
                    />
                  ) : (
                    <div className="w-13 h-13 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 border border-blue-100 rounded-xl flex items-center justify-center font-black text-xl shrink-0 shadow-2xs">
                      {card.front.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h5 className="font-black text-slate-800 text-sm truncate leading-snug">
                      {card.front}
                    </h5>
                    {card.ipa && (
                      <p className="text-[11px] font-mono text-purple-600 font-black truncate">
                        /{card.ipa}/
                      </p>
                    )}
                    <p className="text-xs text-slate-500 font-bold truncate mt-0.5">
                      {card.back}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteCard(card)}
                    className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors opacity-100 sm:opacity-0 group-hover/card:opacity-100 shrink-0"
                    title={t.common.delete}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
