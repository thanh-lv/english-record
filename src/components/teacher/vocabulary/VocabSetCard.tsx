import { ChevronDown, ChevronUp, Plus, Trash2, Loader2 } from "lucide-react";
import { VocabSet, VocabCard } from "../../../types/vocabulary";
import { Translations } from "../../../i18n/LanguageContext";

interface VocabSetCardProps {
  t: Translations;
  set: VocabSet;
  isExpanded: boolean;
  cards: VocabCard[] | undefined;
  cardsLoading: boolean;
  onToggle: () => void;
  onOpenAddCard: (setId: string) => void;
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
  onDeleteSet,
  onDeleteCard,
}: VocabSetCardProps) {
  const vm = t.vocabManager;
  const tc = t.common;

  return (
    <div className="bg-white rounded-lg border-2 border-slate-100 shadow-sm overflow-hidden transition-all hover:border-blue-200">
      {/* Set Header */}
      <div
        onClick={onToggle}
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-3xl shrink-0 p-1 bg-slate-50 rounded-lg">
            {set.emoji}
          </span>
          <div className="min-w-0">
            <h4 className="font-black text-slate-800 text-base truncate">
              {set.title}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-bold text-slate-400">
                {set.card_count ?? 0} {vm.cardCountUnit || "thẻ từ"}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                {set.age_group === "kindergarten"
                  ? t.teacherModal?.ageKindergarten || "Mầm non"
                  : set.age_group === "primary"
                    ? t.teacherModal?.agePrimary || "Tiểu học"
                    : t.teacherModal?.ageAll || "Tất cả"}
              </span>
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
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">{vm.addCard || "Thêm từ"}</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSet(set);
            }}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
          {isExpanded ? (
            <ChevronUp size={20} className="text-slate-400" />
          ) : (
            <ChevronDown size={20} className="text-slate-400" />
          )}
        </div>
      </div>

      {/* Cards Accordion Content */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-3">
          {cardsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          ) : !cards || cards.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs font-bold bg-white rounded-lg border border-dashed border-slate-200">
              {vm.emptyCards || "Chưa có từ vựng nào trong bộ này"}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex gap-3 items-center group relative"
                >
                  {card.image_url ? (
                    <img
                      src={card.image_url}
                      alt={card.front}
                      className="w-14 h-14 object-cover rounded-lg border border-slate-100 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-blue-50 text-blue-400 rounded-lg flex items-center justify-center font-black text-xl shrink-0">
                      {card.front.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h5 className="font-black text-slate-800 text-sm truncate">
                      {card.front}
                    </h5>
                    {card.ipa && (
                      <p className="text-xs text-purple-600 font-bold truncate">
                        /{card.ipa}/
                      </p>
                    )}
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                      {card.back}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteCard(card)}
                    className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100 shrink-0"
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
