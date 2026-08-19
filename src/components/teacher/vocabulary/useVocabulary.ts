import { useState, useEffect, useMemo, useCallback } from "react";
import { vocabularyService, uploadService } from "../../../services";
import { VocabSet, VocabCard } from "../../../types/vocabulary";
import {
  validateVocabSet,
  validateVocabCard,
  validateImageFile,
  validateGrades,
  sanitizeText,
} from "../../../utils/validators";

export function useVocabulary(t: any) {
  const [sets, setSets] = useState<VocabSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null);
  const [cardsBySet, setCardsBySet] = useState<Record<string, VocabCard[]>>({});
  const [cardsLoading, setCardsLoading] = useState<Record<string, boolean>>({});

  // Create set modal
  const [showCreateSet, setShowCreateSet] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newEmoji, setNewEmoji] = useState("📚");
  const [selectedGrades, setSelectedGrades] = useState<number[]>([]);
  const [createSetSaving, setCreateSetSaving] = useState(false);
  const [createSetError, setCreateSetError] = useState("");

  // Edit set modal
  const [editingSet, setEditingSet] = useState<VocabSet | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editEmoji, setEditEmoji] = useState("📚");
  const [editGrades, setEditGrades] = useState<number[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

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
      const data = await vocabularyService.fetchSets();
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
      const data = await vocabularyService.fetchCards(setId);
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

      if (filterGrade !== "all") {
        if (filterGrade === "unassigned") {
          if (s.grades && s.grades.length > 0) return false;
        } else {
          const gNum = Number(filterGrade);
          if (!Array.isArray(s.grades) || !s.grades.includes(gNum))
            return false;
        }
      }
      return matchText;
    });
  }, [sets, filterText, filterGrade]);

  const handleToggleSet = (setId: string) => {
    if (expandedSetId === setId) {
      setExpandedSetId(null);
    } else {
      setExpandedSetId(setId);
      fetchCards(setId);
    }
  };

  const handleCreateSet = async () => {
    const cleanTitle = sanitizeText(newTitle);
    const cleanEmoji = sanitizeText(newEmoji) || "📚";

    const setVal = validateVocabSet(
      { title: cleanTitle, emoji: cleanEmoji },
      {
        titleRequired:
          t.common?.vocabSetTitleMin || "Tên bộ từ phải có ít nhất 2 ký tự.",
        titleMax:
          t.common?.vocabSetTitleMax ||
          "Tên bộ từ không được vượt quá 100 ký tự.",
      },
    );
    if (!setVal.isValid) {
      setCreateSetError(setVal.error || "Tên bộ từ không hợp lệ");
      return;
    }

    const gradesVal = validateGrades(selectedGrades);
    if (!gradesVal.isValid) {
      setCreateSetError(gradesVal.error || "Khối lớp không hợp lệ");
      return;
    }

    setCreateSetSaving(true);
    setCreateSetError("");
    try {
      const newSet = await vocabularyService.createSet(
        cleanTitle,
        cleanEmoji,
        selectedGrades,
      );
      setSets([newSet, ...sets]);
      setShowCreateSet(false);
      setNewTitle("");
      setNewEmoji("📚");
      setSelectedGrades([]);
    } catch (err: any) {
      setCreateSetError(err.message || "Lỗi tạo bộ từ vựng");
    } finally {
      setCreateSetSaving(false);
    }
  };

  const openEditSet = (set: VocabSet) => {
    setEditingSet(set);
    setEditTitle(set.title);
    setEditEmoji(set.emoji || "📚");
    setEditGrades(set.grades || []);
    setEditError("");
  };

  const handleUpdateSet = async () => {
    if (!editingSet) return;
    const cleanTitle = sanitizeText(editTitle);
    const cleanEmoji = sanitizeText(editEmoji) || "📚";

    const setVal = validateVocabSet(
      { title: cleanTitle, emoji: cleanEmoji },
      {
        titleRequired:
          t.common?.vocabSetTitleMin || "Tên bộ từ phải có ít nhất 2 ký tự.",
        titleMax:
          t.common?.vocabSetTitleMax ||
          "Tên bộ từ không được vượt quá 100 ký tự.",
      },
    );
    if (!setVal.isValid) {
      setEditError(setVal.error || "Tên bộ từ không hợp lệ");
      return;
    }

    const gradesVal = validateGrades(editGrades);
    if (!gradesVal.isValid) {
      setEditError(gradesVal.error || "Khối lớp không hợp lệ");
      return;
    }

    setEditSaving(true);
    setEditError("");
    try {
      const updated = await vocabularyService.updateSet(editingSet.id, {
        title: cleanTitle,
        emoji: cleanEmoji,
        grades: editGrades,
      });
      setSets((prev) =>
        prev.map((s) => (s.id === editingSet.id ? { ...s, ...updated } : s)),
      );
      setEditingSet(null);
    } catch (err: any) {
      setEditError(err.message || "Lỗi cập nhật bộ từ");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteSet = async () => {
    if (!deleteSetTarget) return;
    setDeleteSetSaving(true);
    setDeleteSetError("");
    try {
      await vocabularyService.deleteSet(deleteSetTarget.id);
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
    const word = sanitizeText(cardFront);
    if (!word) return;
    setIpaLoading(true);
    try {
      const ipa = await vocabularyService.generateIpa(word);
      if (ipa) setCardIpa(ipa);
    } finally {
      setIpaLoading(false);
    }
  };

  const uploadCardImage = async (file: File) => {
    const fileVal = validateImageFile(file, 5, {
      typeInvalid: t.common?.imageTypeInvalid,
      sizeTooLarge: t.common?.imageSizeLimit,
    });
    if (!fileVal.isValid) {
      setCardImageError(fileVal.error || "Ảnh không hợp lệ");
      return;
    }

    setCardImageUploading(true);
    setCardImageError("");
    try {
      const url = await uploadService.uploadFile(file, "vocab_images");
      setCardImageUrl(url);
    } catch (err: any) {
      console.error("Upload error:", err);
      setCardImageError(
        err.message ||
          t.vocabManager?.uploadCardImageError ||
          "Lỗi tải ảnh lên",
      );
    } finally {
      setCardImageUploading(false);
    }
  };

  const handleAddCard = async () => {
    if (!addCardSetId) return;
    const cleanFront = sanitizeText(cardFront);
    const cleanBack = sanitizeText(cardBack);
    const cleanIpa = sanitizeText(cardIpa);

    const cardVal = validateVocabCard(
      { front: cleanFront, back: cleanBack, ipa: cleanIpa },
      {
        frontRequired:
          t.common?.vocabFrontRequired || "Vui lòng nhập từ tiếng Anh.",
        frontMax:
          t.common?.vocabFrontMax || "Từ vựng không được vượt quá 200 ký tự.",
        backRequired:
          t.common?.vocabBackRequired || "Vui lòng nhập nghĩa tiếng Việt.",
        backMax:
          t.common?.vocabBackMax || "Nghĩa không được vượt quá 500 ký tự.",
        ipaMax:
          t.common?.vocabIpaMax ||
          "Phiên âm IPA không được vượt quá 100 ký tự.",
      },
    );

    if (!cardVal.isValid) {
      setAddCardError(cardVal.error || "Thông tin thẻ từ không hợp lệ");
      return;
    }

    setAddCardSaving(true);
    setAddCardError("");
    try {
      const currentCards = cardsBySet[addCardSetId] || [];
      const orderIndex = currentCards.length;
      const data = await vocabularyService.createCard({
        set_id: addCardSetId,
        front: cleanFront,
        back: cleanBack,
        ipa: cleanIpa || null,
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
      setAddCardError(err.message || "Lỗi tạo thẻ từ");
    } finally {
      setAddCardSaving(false);
    }
  };

  const handleDeleteCard = async () => {
    if (!deleteCardTarget) return;
    setDeleteCardSaving(true);
    setDeleteCardError("");
    try {
      await vocabularyService.deleteCard(deleteCardTarget.id);
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
    filterGrade,
    setFilterGrade,
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
    selectedGrades,
    setSelectedGrades,
    createSetSaving,
    createSetError,
    editingSet,
    setEditingSet,
    editTitle,
    setEditTitle,
    editEmoji,
    setEditEmoji,
    editGrades,
    setEditGrades,
    editSaving,
    editError,
    openEditSet,
    handleUpdateSet,
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
