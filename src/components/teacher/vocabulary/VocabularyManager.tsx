import {
  BookMarked,
  ImagePlus,
  Loader2,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useRef } from "react";
import { useLanguage } from "../../../i18n/LanguageContext";
import { useEscapeToClose } from "../../../hooks/useEscapeToClose";
import { DeleteConfirmModal } from "../shared/DeleteConfirmModal";
import { useVocabulary } from "./useVocabulary";
import { VocabSetCard } from "./VocabSetCard";

export function VocabularyManager() {
  const { t } = useLanguage();
  const vm = (t as any).vocabManager || {};
  const tc = (t as any).common || {};

  const {
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
    deleteCardTarget,
    setDeleteCardTarget,
    handleToggleSet,
    handleCreateSet,
    handleDeleteSet,
    autoGenIpa,
    uploadCardImage,
    handleAddCard,
    handleDeleteCard,
  } = useVocabulary(t);

  const cardImageInputRef = useRef<HTMLInputElement>(null);

  useEscapeToClose(() => setShowCreateSet(false), showCreateSet);
  useEscapeToClose(() => setAddCardSetId(null), !!addCardSetId);
  useEscapeToClose(() => setDeleteSetTarget(null), !!deleteSetTarget);
  useEscapeToClose(() => setDeleteCardTarget(null), !!deleteCardTarget);

  return (
    <div className="space-y-4">
      {/* Header action buttons */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <BookMarked className="text-blue-600" />
          {vm.title || "Quản Lý Từ Vựng & Flashcards"}
        </h3>
        <button
          type="button"
          onClick={() => setShowCreateSet(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5"
        >
          <Plus size={16} />
          {vm.createSet || "Tạo bộ từ mới"}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder={vm.searchSets || "Tìm bộ từ vựng..."}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-blue-400"
          />
          {filterText && (
            <button
              type="button"
              onClick={() => setFilterText("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <select
          value={filterAgeGroup}
          onChange={(e) => setFilterAgeGroup(e.target.value as any)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:outline-none"
        >
          <option value="all">{vm.filterAgeAll || "Tất cả độ tuổi"}</option>
          <option value="kindergarten">
            {vm.ageKindergarten || "Mầm non"}
          </option>
          <option value="primary">{vm.agePrimary || "Tiểu học"}</option>
        </select>
      </div>

      {/* Vocabulary Sets List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSets.map((set) => (
            <VocabSetCard
              key={set.id}
              t={t}
              set={set}
              isExpanded={expandedSetId === set.id}
              cards={cardsBySet[set.id]}
              cardsLoading={!!cardsLoading[set.id]}
              onToggle={() => handleToggleSet(set.id)}
              onOpenAddCard={(setId) => setAddCardSetId(setId)}
              onDeleteSet={(setTarget) => setDeleteSetTarget(setTarget)}
              onDeleteCard={(cardTarget) => setDeleteCardTarget(cardTarget)}
            />
          ))}

          {filteredSets.length === 0 && (
            <div className="py-12 text-center text-slate-400 font-bold bg-white rounded-lg border-2 border-dashed border-slate-200">
              {vm.emptySets || "Chưa có bộ từ vựng nào"}
            </div>
          )}
        </div>
      )}

      {/* Create Set Modal */}
      {showCreateSet && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto overscroll-contain"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg w-full max-w-md shadow-md border-4 border-blue-100 p-6 space-y-4 my-8">
            <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3">
              <h4 className="font-black text-lg text-slate-800 flex items-center gap-2">
                📚 {vm.createSetModalTitle || "Tạo bộ từ vựng mới"}
              </h4>
              <button
                type="button"
                onClick={() => setShowCreateSet(false)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-600 mb-1 uppercase">
                    {vm.setLabelTitle || "Tên bộ từ"}
                  </label>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="VD: Animals, Family..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1 uppercase">
                    Emoji
                  </label>
                  <input
                    value={newEmoji}
                    onChange={(e) => setNewEmoji(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-center focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1 uppercase">
                  Độ tuổi phù hợp
                </label>
                <select
                  value={newAgeGroup}
                  onChange={(e) => setNewAgeGroup(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:border-blue-400 focus:outline-none"
                >
                  <option value="all">Tất cả độ tuổi</option>
                  <option value="kindergarten">Mầm non (dưới 6 tuổi)</option>
                  <option value="primary">Tiểu học (trên 6 tuổi)</option>
                </select>
              </div>

              {createSetError && (
                <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-lg">
                  {createSetError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreateSet(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
              >
                {tc.cancel || "Hủy"}
              </button>
              <button
                type="button"
                onClick={handleCreateSet}
                disabled={createSetSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-1"
              >
                {createSetSaving && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                {tc.save || "Lưu bộ từ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      {addCardSetId && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto overscroll-contain"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg w-full max-w-lg shadow-md border-4 border-blue-100 p-6 space-y-4 my-8">
            <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3">
              <h4 className="font-black text-lg text-slate-800 flex items-center gap-2">
                🎴 {vm.addCardModalTitle || "Thêm thẻ từ vựng"}
              </h4>
              <button
                type="button"
                onClick={() => setAddCardSetId(null)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1 uppercase">
                  Từ Tiếng Anh (Mặt trước)
                </label>
                <div className="flex gap-2">
                  <input
                    value={cardFront}
                    onChange={(e) => setCardFront(e.target.value)}
                    placeholder="VD: Elephant, Apple..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:border-blue-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={autoGenIpa}
                    disabled={ipaLoading || !cardFront.trim()}
                    className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-600 font-extrabold text-xs rounded-lg transition-colors flex items-center gap-1 shrink-0"
                    title="Tự động lấy phiên âm IPA bằng AI"
                  >
                    {ipaLoading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Sparkles size={13} />
                    )}
                    IPA AI
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1 uppercase">
                    Phiên âm (IPA)
                  </label>
                  <input
                    value={cardIpa}
                    onChange={(e) => setCardIpa(e.target.value)}
                    placeholder="VD: ˈel.ɪ.fənt"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1 uppercase">
                    Nghĩa Tiếng Việt (Mặt sau)
                  </label>
                  <input
                    value={cardBack}
                    onChange={(e) => setCardBack(e.target.value)}
                    placeholder="VD: Con voi, Quả táo..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1 uppercase">
                  Hình ảnh minh họa (Không bắt buộc)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => cardImageInputRef.current?.click()}
                    disabled={cardImageUploading}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    {cardImageUploading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ImagePlus size={14} />
                    )}
                    Tải ảnh từ máy
                  </button>
                  <input
                    ref={cardImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadCardImage(file);
                    }}
                  />
                  {cardImageUrl && (
                    <div className="relative group">
                      <img
                        src={cardImageUrl}
                        alt="Xem trước hình minh họa từ vựng"
                        className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => setCardImageUrl("")}
                        className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  )}
                </div>
                {cardImageError && (
                  <p className="text-xs font-bold text-rose-500 mt-1">
                    {cardImageError}
                  </p>
                )}
              </div>

              {addCardError && (
                <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-lg">
                  {addCardError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAddCardSetId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
              >
                {tc.cancel || "Hủy"}
              </button>
              <button
                type="button"
                onClick={handleAddCard}
                disabled={
                  addCardSaving || !cardFront.trim() || !cardBack.trim()
                }
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-1"
              >
                {addCardSaving && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                {tc.save || "Thêm thẻ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Set Confirmation Modal */}
      {deleteSetTarget && (
        <DeleteConfirmModal
          title={vm.deleteSetConfirm || "Xác nhận xóa bộ từ vựng"}
          description={deleteSetTarget.title}
          onConfirm={handleDeleteSet}
          onCancel={() => setDeleteSetTarget(null)}
        />
      )}

      {/* Delete Card Confirmation Modal */}
      {deleteCardTarget && (
        <DeleteConfirmModal
          title={vm.deleteCardConfirm || "Xác nhận xóa thẻ từ vựng"}
          description={deleteCardTarget.front}
          onConfirm={handleDeleteCard}
          onCancel={() => setDeleteCardTarget(null)}
        />
      )}
    </div>
  );
}
