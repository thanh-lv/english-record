import { useState, useEffect, useMemo, useCallback } from "react";
import { vocabService } from "../../../services/vocabService";
import { uploadService } from "../../../services/uploadService";
import { VocabSet, VocabCard } from "../../../types/vocabulary";

export function useVocabulary(t: any) {
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
  const [addCardSaving, setAddCardSaving] = useState(false);
  const [addCardError, setAddCardError] = useState("");
  const [ipaLoading, setIpaLoading] = useState(false);

  // Delete targets
  const [deleteSetTarget, setDeleteSetTarget] = useState<VocabSet | null>(null);
  const [deleteSetSaving, setDeleteSetSaving] = useState(false);
  const [deleteSetError, setDeleteSetError] = useState("");

  const [deleteCardTarget, setDeleteCardTarget] = useState<VocabCard | null>(
    null,
  );
  const [deleteCardSaving, setDeleteCardSaving] = useState(false);
  const [deleteCardError, setDeleteCardError] = useState("");

  const fetchSets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vocabService.fetchSets();
      setSets(data);
    } catch (err: any) {
      console.error("Fetch sets error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSets();
  }, [fetchSets]);

  const fetchCards = async (setId: string) => {
    if (cardsBySet[setId]) return;
    setCardsLoading((prev) => ({ ...prev, [setId]: true }));
    try {
      const data = await vocabService.fetchCards(setId);
      setCardsBySet((prev) => ({ ...prev, [setId]: data }));
    } catch (err: any) {
      console.error("Fetch cards error:", err);
    } finally {
      setCardsLoading((prev) => ({ ...prev, [setId]: false }));
    }
  };

  const filteredSets = useMemo(() => {
    return sets.filter((s) => {
      const matchText =
        !filterText || s.title.toLowerCase().includes(filterText.toLowerCase());
      const matchAge =
        filterAgeGroup === "all" ||
        s.age_group === filterAgeGroup ||
        s.age_group === "all";
      return matchText && matchAge;
    });
  }, [sets, filterText, filterAgeGroup]);

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
      setCreateSetError(
        t.vocabManager?.titleRequired || "Vui lòng nhập tên bộ từ",
      );
      return;
    }
    setCreateSetSaving(true);
    setCreateSetError("");
    try {
      const newSet = await vocabService.createSet(
        newTitle.trim(),
        newEmoji,
        newAgeGroup,
      );
      setSets([newSet, ...sets]);
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
      await vocabService.deleteSet(deleteSetTarget.id);
      setSets(sets.filter((s) => s.id !== deleteSetTarget.id));
      if (expandedSetId === deleteSetTarget.id) setExpandedSetId(null);
      setDeleteSetTarget(null);
    } catch (err: any) {
      setDeleteSetError(err.message);
    } finally {
      setDeleteSetSaving(false);
    }
  };

  const autoGenIpa = async () => {
    const word = cardFront.trim();
    if (!word) return;
    setIpaLoading(true);
    try {
      const ipa = await vocabService.generateIpa(word);
      if (ipa) setCardIpa(ipa);
    } finally {
      setIpaLoading(false);
    }
  };

  const uploadCardImage = async (file: File) => {
    setCardImageUploading(true);
    setCardImageError("");
    try {
      const url = await uploadService.uploadFile(file, "vocab_images");
      setCardImageUrl(url);
    } catch (err) {
      console.error("Upload error:", err);
      setCardImageError(
        t.vocabManager?.uploadCardImageError || "Lỗi tải ảnh lên",
      );
    } finally {
      setCardImageUploading(false);
    }
  };

  const handleAddCard = async () => {
    if (!addCardSetId) return;
    if (!cardFront.trim() || !cardBack.trim()) {
      setAddCardError(
        t.vocabManager?.frontBackRequired || "Vui lòng nhập từ và nghĩa",
      );
      return;
    }
    setAddCardSaving(true);
    setAddCardError("");
    try {
      const currentCards = cardsBySet[addCardSetId] || [];
      const orderIndex = currentCards.length;
      const data = await vocabService.createCard({
        set_id: addCardSetId,
        front: cardFront.trim(),
        back: cardBack.trim(),
        ipa: cardIpa.trim() || null,
        image_url: cardImageUrl || null,
        order_index: orderIndex,
      });

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
      await vocabService.deleteCard(deleteCardTarget.id);
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

  return {
    sets,
    loading,
    filterText,
    setFilterText,
    filterAgeGroup,
    setFilterAgeGroup,
    filteredSets,
    expandedSetId,
    cardsBySet,
    cardsLoading,
    showCreateSet,
    setShowCreateSet,
    newTitle,
    setNewTitle,
    newEmoji,
    setNewEmoji,
    newAgeGroup,
    setNewAgeGroup,
    createSetSaving,
    createSetError,
    addCardSetId,
    setAddCardSetId,
    cardFront,
    setCardFront,
    cardBack,
    setCardBack,
    cardIpa,
    setCardIpa,
    cardImageUrl,
    setCardImageUrl,
    cardImageUploading,
    cardImageError,
    addCardSaving,
    addCardError,
    ipaLoading,
    deleteSetTarget,
    setDeleteSetTarget,
    deleteSetSaving,
    deleteSetError,
    deleteCardTarget,
    setDeleteCardTarget,
    deleteCardSaving,
    deleteCardError,
    handleToggleSet,
    handleCreateSet,
    handleDeleteSet,
    autoGenIpa,
    uploadCardImage,
    handleAddCard,
    handleDeleteCard,
  };
}
