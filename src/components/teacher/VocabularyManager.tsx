import {
  AlertCircle,
  BookMarked,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import { supabase } from "../../lib/supabase";
import { s3Client, S3_BUCKET } from "../../lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { useEscapeToClose } from "../../hooks/useEscapeToClose";

interface VocabSet {
  id: string;
  title: string;
  emoji: string;
  age_group: "kindergarten" | "primary" | "all";
  created_at: string;
  card_count?: number;
}

interface VocabCard {
  id: string;
  set_id: string;
  front: string;
  back: string;
  ipa: string | null;
  image_url: string | null;
  order_index: number;
  created_at: string;
}

export function VocabularyManager() {
  const { t } = useLanguage();
  const [sets, setSets] = useState<VocabSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");
  const [filterAgeGroup, setFilterAgeGroup] = useState<
    "all" | "kindergarten" | "primary"
  >("all");
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null);
  const [cardsBySet, setCardsBySet] = useState<Record<string, VocabCard[]>>({});
  const [cardsLoading, setCardsLoading] = useState<Record<string, boolean>>({});

  // Create set modal
  const [showCreateSet, setShowCreateSet] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newEmoji, setNewEmoji] = useState("📚");
  const [newAgeGroup, setNewAgeGroup] = useState<
    "kindergarten" | "primary" | "all"
  >("all");
  const [createSetSaving, setCreateSetSaving] = useState(false);
  const [createSetError, setCreateSetError] = useState("");

  // Add card modal
  const [addCardSetId, setAddCardSetId] = useState<string | null>(null);
  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");
  const [cardIpa, setCardIpa] = useState("");
  const [cardImageUrl, setCardImageUrl] = useState("");
  const [cardImageUploading, setCardImageUploading] = useState(false);
  const [cardImageError, setCardImageError] = useState("");
  const [cardImageDragging, setCardImageDragging] = useState(false);
  const [addCardSaving, setAddCardSaving] = useState(false);
  const [addCardError, setAddCardError] = useState("");
  const [ipaLoading, setIpaLoading] = useState(false);
  const cardImageInputRef = useRef<HTMLInputElement>(null);

  const WORKER_URL =
    "https://free-image-generation-api.levanthanh29111999.workers.dev/";

  const autoGenIpa = async () => {
    const word = cardFront.trim();
    if (!word) return;
    const apiKey = import.meta.env.VITE_AI_API_KEY;
    if (!apiKey) return;
    setIpaLoading(true);
    try {
      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ type: "ipa", prompt: word }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.ipa) setCardIpa(data.ipa);
    } catch {
      // silently fail — teacher can type manually
    } finally {
      setIpaLoading(false);
    }
  };

  const uploadCardImage = async (file: File) => {
    setCardImageUploading(true);
    setCardImageError("");
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `vocab_images/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: fileName,
          Body: new Uint8Array(await file.arrayBuffer()),
          ContentType: file.type,
        }),
      );
      const publicBaseUrl = import.meta.env.VITE_R2_PUBLIC_URL;
      const url = publicBaseUrl
        ? `${publicBaseUrl.replace(/\/$/, "")}/${fileName}`
        : `${import.meta.env.VITE_S3_ENDPOINT || ""}/${S3_BUCKET}/${fileName}`;
      setCardImageUrl(url);
    } catch (err) {
      console.error("Upload error:", err);
      setCardImageError(t.vocabManager.uploadCardImageError);
    } finally {
      setCardImageUploading(false);
    }
  };

  // Delete set confirm
  const [deleteSetTarget, setDeleteSetTarget] = useState<VocabSet | null>(null);
  const [deleteSetSaving, setDeleteSetSaving] = useState(false);
  const [deleteSetError, setDeleteSetError] = useState("");

  // Delete card confirm
  const [deleteCardTarget, setDeleteCardTarget] = useState<VocabCard | null>(
    null,
  );
  const [deleteCardSaving, setDeleteCardSaving] = useState(false);
  const [deleteCardError, setDeleteCardError] = useState("");

  useEscapeToClose(() => setShowCreateSet(false), showCreateSet);
  useEscapeToClose(() => setAddCardSetId(null), !!addCardSetId);
  useEscapeToClose(() => setDeleteSetTarget(null), !!deleteSetTarget);
  useEscapeToClose(() => setDeleteCardTarget(null), !!deleteCardTarget);

  useEffect(() => {
    fetchSets();
  }, []);

  const fetchSets = async () => {
    setLoading(true);
    try {
      // Single query with card count via Supabase foreign table aggregation
      const { data, error } = await supabase
        .from("vocabulary_sets")
        .select("id, title, emoji, age_group, created_at, vocabulary_cards(id)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const setsWithCounts = (data || []).map((set: any) => ({
        ...set,
        card_count: set.vocabulary_cards?.length ?? 0,
        vocabulary_cards: undefined,
      }));
      setSets(setsWithCounts);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCards = async (setId: string) => {
    if (cardsBySet[setId]) return;
    setCardsLoading((prev) => ({ ...prev, [setId]: true }));
    try {
      const { data, error } = await supabase
        .from("vocabulary_cards")
        .select(
          "id, set_id, front, back, ipa, image_url, order_index, created_at",
        )
        .eq("set_id", setId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      setCardsBySet((prev) => ({ ...prev, [setId]: data || [] }));
    } catch (err: any) {
      console.error(err);
    } finally {
      setCardsLoading((prev) => ({ ...prev, [setId]: false }));
    }
  };

  const handleToggleSet = (setId: string) => {
    if (expandedSetId === setId) {
      setExpandedSetId(null);
    } else {
      setExpandedSetId(setId);
      fetchCards(setId);
    }
  };

  const handleCreateSet = async () => {
    if (!newTitle.trim()) {
      setCreateSetError(t.vocabManager.titleRequired);
      return;
    }
    setCreateSetSaving(true);
    setCreateSetError("");
    try {
      const { data, error } = await supabase
        .from("vocabulary_sets")
        .insert({
          title: newTitle.trim(),
          emoji: newEmoji,
          age_group: newAgeGroup,
        })
        .select()
        .single();
      if (error) throw error;
      setSets([{ ...data, card_count: 0 }, ...sets]);
      setShowCreateSet(false);
      setNewTitle("");
      setNewEmoji("📚");
      setNewAgeGroup("all");
    } catch (err: any) {
      setCreateSetError(err.message);
    } finally {
      setCreateSetSaving(false);
    }
  };

  const handleDeleteSet = async () => {
    if (!deleteSetTarget) return;
    setDeleteSetSaving(true);
    setDeleteSetError("");
    try {
      const { error } = await supabase
        .from("vocabulary_sets")
        .delete()
        .eq("id", deleteSetTarget.id);
      if (error) throw error;
      setSets(sets.filter((s) => s.id !== deleteSetTarget.id));
      if (expandedSetId === deleteSetTarget.id) setExpandedSetId(null);
      setDeleteSetTarget(null);
    } catch (err: any) {
      setDeleteSetError(err.message);
    } finally {
      setDeleteSetSaving(false);
    }
  };

  const handleAddCard = async () => {
    if (!cardFront.trim() || !cardBack.trim()) {
      setAddCardError(t.vocabManager.cardFieldsRequired);
      return;
    }
    if (!addCardSetId) return;
    setAddCardSaving(true);
    setAddCardError("");
    try {
      const existingCards = cardsBySet[addCardSetId] || [];
      const orderIndex = existingCards.length;
      const { data, error } = await supabase
        .from("vocabulary_cards")
        .insert({
          set_id: addCardSetId,
          front: cardFront.trim(),
          back: cardBack.trim(),
          ipa: cardIpa.trim() || null,
          image_url: cardImageUrl.trim() || null,
          order_index: orderIndex,
        })
        .select()
        .single();
      if (error) throw error;
      setCardsBySet((prev) => ({
        ...prev,
        [addCardSetId]: [...(prev[addCardSetId] || []), data],
      }));
      setSets((prev) =>
        prev.map((s) =>
          s.id === addCardSetId
            ? { ...s, card_count: (s.card_count ?? 0) + 1 }
            : s,
        ),
      );
      setAddCardSetId(null);
      setCardFront("");
      setCardBack("");
      setCardIpa("");
      setCardImageUrl("");
    } catch (err: any) {
      setAddCardError(err.message);
    } finally {
      setAddCardSaving(false);
    }
  };

  const handleDeleteCard = async () => {
    if (!deleteCardTarget) return;
    setDeleteCardSaving(true);
    setDeleteCardError("");
    try {
      const { error } = await supabase
        .from("vocabulary_cards")
        .delete()
        .eq("id", deleteCardTarget.id);
      if (error) throw error;
      const setId = deleteCardTarget.set_id;
      setCardsBySet((prev) => ({
        ...prev,
        [setId]: (prev[setId] || []).filter(
          (c) => c.id !== deleteCardTarget.id,
        ),
      }));
      setSets((prev) =>
        prev.map((s) =>
          s.id === setId
            ? { ...s, card_count: Math.max(0, (s.card_count ?? 1) - 1) }
            : s,
        ),
      );
      setDeleteCardTarget(null);
    } catch (err: any) {
      setDeleteCardError(err.message);
    } finally {
      setDeleteCardSaving(false);
    }
  };

  const filteredSets = useMemo(() => {
    return sets.filter((set) => {
      if (
        filterText &&
        !set.title.toLowerCase().includes(filterText.toLowerCase())
      ) {
        return false;
      }
      if (filterAgeGroup !== "all" && set.age_group !== filterAgeGroup) {
        return false;
      }
      return true;
    });
  }, [sets, filterText, filterAgeGroup]);

  const ageGroupLabel = (ag: string) => {
    if (ag === "kindergarten") return t.teacherModal.ageKindergarten;
    if (ag === "primary") return t.teacherModal.agePrimary;
    return t.teacherModal.ageAll;
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="animate-spin mx-auto text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <BookMarked className="text-blue-500" size={22} />
          {t.vocabManager.title}
        </h3>
        <button
          onClick={() => {
            setShowCreateSet(true);
            setCreateSetError("");
          }}
          className="bg-[#1E88E5] hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md text-sm"
        >
          <Plus size={16} /> {t.vocabManager.newSet}
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder={t.teacherModal.filterVocabPlaceholder}
            className="w-full pl-8 pr-3 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-400"
          />
        </div>
        <select
          value={filterAgeGroup}
          onChange={(e) => setFilterAgeGroup(e.target.value as any)}
          className="px-3 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-400"
        >
          <option value="all">{t.teacherModal.filterVocabAgeAll}</option>
          <option value="kindergarten">{t.teacherModal.ageKindergarten}</option>
          <option value="primary">{t.teacherModal.agePrimary}</option>
        </select>
      </div>

      {/* Sets grid */}
      <div className="space-y-3">
        {filteredSets.map((set) => {
          const isExpanded = expandedSetId === set.id;
          const cards = cardsBySet[set.id] || [];
          const isCardsLoading = cardsLoading[set.id];

          return (
            <div
              key={set.id}
              className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden"
            >
              {/* Set header row */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => handleToggleSet(set.id)}
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 border-2 border-blue-100 flex items-center justify-center text-2xl shrink-0">
                  {set.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-slate-800 text-sm truncate">
                    {set.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {ageGroupLabel(set.age_group)}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {set.card_count} {t.vocabManager.cardCount}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddCardSetId(set.id);
                      setCardFront("");
                      setCardBack("");
                      setCardImageUrl("");
                      setAddCardError("");
                      setCardImageError("");
                      if (!isExpanded) handleToggleSet(set.id);
                    }}
                    className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus size={12} /> {t.vocabManager.addCard}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteSetTarget(set);
                      setDeleteSetError("");
                    }}
                    aria-label={t.common.delete}
                    className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                  </button>
                  <span className="p-1.5 text-slate-400">
                    {isExpanded ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </span>
                </div>
              </div>

              {/* Expanded cards section */}
              {isExpanded && (
                <div className="border-t-2 border-slate-100 px-4 pb-4 pt-3">
                  {isCardsLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2
                        className="animate-spin text-slate-300"
                        size={20}
                      />
                    </div>
                  ) : cards.length === 0 ? (
                    <p className="text-center text-slate-400 text-sm font-bold py-4">
                      {t.vocabManager.noCardsYet}
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                      {cards.map((card) => (
                        <div
                          key={card.id}
                          className="bg-slate-50 border-2 border-slate-100 rounded-xl p-3 flex flex-col gap-1"
                        >
                          {card.image_url && (
                            <img
                              src={card.image_url}
                              alt=""
                              className="w-full h-20 object-cover rounded-lg mb-1"
                            />
                          )}
                          <p className="font-extrabold text-slate-800 text-sm">
                            {card.front}
                            {card.ipa && (
                              <span className="text-xs font-mono text-slate-400 ml-1">
                                {card.ipa}
                              </span>
                            )}
                          </p>
                          <p className="font-bold text-blue-600 text-xs">
                            {card.back}
                          </p>
                          <div className="mt-auto pt-2">
                            <button
                              onClick={() => {
                                setDeleteCardTarget(card);
                                setDeleteCardError("");
                              }}
                              className="w-full py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                            >
                              <Trash2 size={11} /> {t.vocabManager.deleteCard}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredSets.length === 0 && (
          <div className="py-12 text-center text-slate-400 font-bold bg-white rounded-2xl border-2 border-dashed border-slate-200">
            {sets.length === 0
              ? t.vocabManager.noSetsYet
              : t.teacherModal.noVocabSetsFound}
          </div>
        )}
      </div>

      {/* Create Set Modal */}
      {showCreateSet && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-set-title"
        >
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl border-4 border-blue-100 p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4">
              <h4
                id="create-set-title"
                className="font-black text-lg text-slate-800 flex items-center gap-2"
              >
                <BookMarked className="text-blue-500" size={20} />{" "}
                {t.vocabManager.createSetTitle}
              </h4>
              <button
                onClick={() => setShowCreateSet(false)}
                aria-label={t.common.close}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  id="create-set-title-label"
                  className="block text-xs font-black text-slate-600 mb-1.5 uppercase"
                >
                  {t.vocabManager.titleLabel}
                </label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateSet()}
                  placeholder={t.vocabManager.titlePlaceholder}
                  aria-labelledby="create-set-title-label"
                  className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-blue-400 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    id="create-set-emoji-label"
                    className="block text-xs font-black text-slate-600 mb-1.5 uppercase"
                  >
                    {t.vocabManager.emojiLabel}
                  </label>
                  <input
                    value={newEmoji}
                    onChange={(e) => setNewEmoji(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateSet()}
                    aria-labelledby="create-set-emoji-label"
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    id="create-set-age-label"
                    className="block text-xs font-black text-slate-600 mb-1.5 uppercase"
                  >
                    {t.vocabManager.ageGroupLabel}
                  </label>
                  <select
                    aria-labelledby="create-set-age-label"
                    value={newAgeGroup}
                    onChange={(e) =>
                      setNewAgeGroup(
                        e.target.value as "kindergarten" | "primary" | "all",
                      )
                    }
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-blue-400 focus:outline-none"
                  >
                    <option value="kindergarten">
                      {t.teacherModal.ageKindergarten}
                    </option>
                    <option value="primary">{t.teacherModal.agePrimary}</option>
                    <option value="all">{t.teacherModal.ageAll}</option>
                  </select>
                </div>
              </div>
            </div>

            {createSetError && (
              <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                <AlertCircle size={14} /> {createSetError}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowCreateSet(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-full text-sm transition-colors"
              >
                {t.vocabManager.cancel}
              </button>
              <button
                onClick={handleCreateSet}
                disabled={createSetSaving}
                className="flex-1 py-2.5 bg-[#1E88E5] hover:bg-blue-700 text-white font-extrabold rounded-full text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md border-b-4 border-blue-900"
              >
                {createSetSaving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Plus size={15} />
                )}
                {t.vocabManager.createSet}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      {addCardSetId && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-card-title"
        >
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl border-4 border-blue-100 p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4">
              <h4
                id="add-card-title"
                className="font-black text-lg text-slate-800 flex items-center gap-2"
              >
                <Plus className="text-blue-500" size={20} />{" "}
                {t.vocabManager.addCardTitle}
              </h4>
              <button
                onClick={() => setAddCardSetId(null)}
                aria-label={t.common.close}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  id="add-card-front-label"
                  className="block text-xs font-black text-slate-600 mb-1.5 uppercase"
                >
                  {t.vocabManager.frontLabel}
                </label>
                <input
                  value={cardFront}
                  onChange={(e) => setCardFront(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCard()}
                  placeholder={t.vocabManager.frontPlaceholder}
                  aria-labelledby="add-card-front-label"
                  className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-blue-400 focus:outline-none"
                />
              </div>
              <div>
                <label
                  id="add-card-back-label"
                  className="block text-xs font-black text-slate-600 mb-1.5 uppercase"
                >
                  {t.vocabManager.backLabel}
                </label>
                <input
                  value={cardBack}
                  onChange={(e) => setCardBack(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCard()}
                  placeholder={t.vocabManager.backPlaceholder}
                  aria-labelledby="add-card-back-label"
                  className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-blue-400 focus:outline-none"
                />
              </div>
              <div>
                <label
                  id="add-card-ipa-label"
                  className="block text-xs font-black text-slate-600 mb-1.5 uppercase"
                >
                  {t.vocabManager.ipaLabel}
                </label>
                <div className="flex gap-2">
                  <input
                    value={cardIpa}
                    onChange={(e) => setCardIpa(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCard()}
                    placeholder={t.vocabManager.ipaPlaceholder}
                    aria-labelledby="add-card-ipa-label"
                    className="flex-1 px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-blue-400 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={autoGenIpa}
                    disabled={ipaLoading || !cardFront.trim()}
                    title={t.vocabManager.ipaAutoGenTitle}
                    aria-label={t.vocabManager.ipaAutoGenTitle}
                    className="shrink-0 px-3 py-2 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {ipaLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    {ipaLoading ? "..." : t.vocabManager.ipaAutoGenShort}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                  {t.vocabManager.imageLabel}
                </label>
                {/* Drag & drop zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setCardImageDragging(true);
                  }}
                  onDragLeave={() => setCardImageDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setCardImageDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type.startsWith("image/"))
                      uploadCardImage(file);
                  }}
                  onClick={() => cardImageInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                    cardImageDragging
                      ? "border-blue-400 bg-blue-50"
                      : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                  }`}
                >
                  <input
                    ref={cardImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadCardImage(file);
                      e.target.value = "";
                    }}
                  />
                  {cardImageUploading ? (
                    <div className="flex items-center justify-center gap-2 text-blue-500 text-xs font-bold">
                      <Loader2 size={16} className="animate-spin" />{" "}
                      {t.vocabManager.uploading}
                    </div>
                  ) : cardImageUrl ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={cardImageUrl}
                        alt=""
                        className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                      />
                      <span className="text-xs text-slate-500 truncate flex-1">
                        {cardImageUrl.split("/").pop()}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCardImageUrl("");
                        }}
                        aria-label={t.common.delete}
                        className="shrink-0 p-1 text-rose-400 hover:text-rose-600 rounded"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-400">
                      <ImagePlus size={20} />
                      <span className="text-xs font-bold">
                        {t.vocabManager.dropImageHint}
                      </span>
                    </div>
                  )}
                </div>
                {cardImageError && (
                  <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 mt-2">
                    <AlertCircle size={14} className="shrink-0" />{" "}
                    {cardImageError}
                  </div>
                )}
                {/* URL fallback */}
                <input
                  value={cardImageUrl}
                  onChange={(e) => setCardImageUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCard()}
                  placeholder={t.vocabManager.imageUrlPlaceholder}
                  className="w-full mt-2 px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold focus:border-blue-400 focus:outline-none text-slate-600"
                />
              </div>
            </div>

            {addCardError && (
              <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                <AlertCircle size={14} /> {addCardError}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setAddCardSetId(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-full text-sm transition-colors"
              >
                {t.vocabManager.cancel}
              </button>
              <button
                onClick={handleAddCard}
                disabled={addCardSaving}
                className="flex-1 py-2.5 bg-[#1E88E5] hover:bg-blue-700 text-white font-extrabold rounded-full text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md border-b-4 border-blue-900"
              >
                {addCardSaving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Plus size={15} />
                )}
                {t.vocabManager.addCard}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Set Confirm Modal */}
      {deleteSetTarget && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-set-title"
        >
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl border-4 border-rose-100 p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <h4
                  id="delete-set-title"
                  className="font-extrabold text-slate-800 text-lg leading-tight"
                >
                  {t.vocabManager.deleteSetTitle}
                </h4>
                <p className="text-sm text-slate-600 font-bold mt-0.5 line-clamp-1">
                  {deleteSetTarget.emoji} {deleteSetTarget.title}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-500 font-medium">
              {t.vocabManager.deleteSetWarning}
            </p>
            {deleteSetError && (
              <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                <AlertCircle size={14} /> {deleteSetError}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setDeleteSetTarget(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-full text-sm transition-colors border border-slate-200"
              >
                {t.vocabManager.cancel}
              </button>
              <button
                onClick={handleDeleteSet}
                disabled={deleteSetSaving}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold rounded-full text-sm transition-colors shadow-md border-b-4 border-rose-900 flex items-center justify-center gap-2"
              >
                {deleteSetSaving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
                {t.vocabManager.deleteSetConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Card Confirm Modal */}
      {deleteCardTarget && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-card-title"
        >
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl border-4 border-rose-100 p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <h4
                  id="delete-card-title"
                  className="font-extrabold text-slate-800 text-lg leading-tight"
                >
                  {t.vocabManager.deleteCardTitle}
                </h4>
                <p className="text-sm text-slate-600 font-bold mt-0.5">
                  {deleteCardTarget.front} → {deleteCardTarget.back}
                </p>
              </div>
            </div>
            {deleteCardError && (
              <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                <AlertCircle size={14} /> {deleteCardError}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setDeleteCardTarget(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-full text-sm transition-colors border border-slate-200"
              >
                {t.vocabManager.cancel}
              </button>
              <button
                onClick={handleDeleteCard}
                disabled={deleteCardSaving}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold rounded-full text-sm transition-colors shadow-md border-b-4 border-rose-900 flex items-center justify-center gap-2"
              >
                {deleteCardSaving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
                {t.vocabManager.deleteCard}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
