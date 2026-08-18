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
import { useLanguage, interpolate } from "../../../i18n/LanguageContext";
import { useEscapeToClose } from "../../../hooks/useEscapeToClose";
import { DeleteConfirmModal } from "../shared/DeleteConfirmModal";
import { useVocabulary } from "./useVocabulary";
import { VocabSetCard } from "./VocabSetCard";

export function VocabularyManager() {
  const { t } = useLanguage();
  const vm = t.vocabManager;
  const tc = t.common;

  const {
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
  useEscapeToClose(() => setEditingSet(null), !!editingSet);
  useEscapeToClose(() => setAddCardSetId(null), !!addCardSetId);
  useEscapeToClose(() => setDeleteSetTarget(null), !!deleteSetTarget);
  useEscapeToClose(() => setDeleteCardTarget(null), !!deleteCardTarget);

  return (
    <div className="space-y-6">
      {/* Header and Filter Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/95 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <BookMarked size={22} />
            </span>
            {vm.title || "Quản Lý Từ Vựng & Flashcards"}
          </h3>
          <p className="text-xs text-slate-400 font-bold mt-1">
            {filteredSets.length} {vm.title ? vm.title.toLowerCase() : "bộ từ vựng"}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search bar */}
          <div className="relative min-w-[180px] sm:min-w-[220px]">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder={vm.searchSets || "Tìm bộ từ vựng..."}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-400 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
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

          {/* Grade filter */}
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-400 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs cursor-pointer"
          >
            <option value="all">{t.teacherModal?.allGradesOption || "Tất cả các khối"}</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
              <option key={g} value={g.toString()}>
                {interpolate(t.common.gradeLabel, { grade: g })}
              </option>
            ))}
            <option value="unassigned">
              {t.teacherModal?.allGradesOption || "Tất cả các khối"} (Mặc định)
            </option>
          </select>

          {/* Add set button */}
          <button
            type="button"
            onClick={() => setShowCreateSet(true)}
            className="bg-[#1E88E5] hover:bg-[#1565C0] text-white px-4 py-2 rounded-xl font-black flex items-center gap-2 transition-all shadow-xs text-xs active:scale-95 shrink-0"
          >
            <Plus size={16} />
            {vm.createSet || "Tạo bộ từ mới"}
          </button>
        </div>
      </div>

      {/* Vocabulary Sets List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="space-y-4">
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
              onEditSet={(setTarget) => openEditSet(setTarget)}
              onDeleteSet={(setTarget) => setDeleteSetTarget(setTarget)}
              onDeleteCard={(cardTarget) => setDeleteCardTarget(cardTarget)}
            />
          ))}

          {filteredSets.length === 0 && (
            <div className="py-16 text-center text-slate-400 font-bold bg-white rounded-2xl border border-slate-200/80">
              {vm.emptySets || "Chưa có bộ từ vựng nào"}
            </div>
          )}
        </div>
      )}

      {/* Create Set Modal */}
      {showCreateSet && (
        <div
          className="!m-0 fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] overflow-y-auto overscroll-contain"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 my-8 border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-black text-lg text-slate-800 flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <BookMarked size={18} />
                </span>
                {vm.createSetTitle || "Tạo bộ từ vựng mới"}
              </h4>
              <button
                type="button"
                onClick={() => setShowCreateSet(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    {vm.setLabelTitle || "Tên bộ từ"}
                  </label>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="VD: Animals, Family..."
                    className="w-full px-3.5 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-400 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    Emoji
                  </label>
                  <input
                    value={newEmoji}
                    onChange={(e) => setNewEmoji(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-400 rounded-xl text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                  {t.teacherModal?.targetGrades || "Khối / Lớp áp dụng"}
                </label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedGrades([])}
                    className={`px-3 py-1 rounded-xl text-xs font-black border transition-all ${
                      selectedGrades.length === 0
                        ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200"
                    }`}
                  >
                    {t.teacherModal?.allGradesOption || "Tất cả các khối"}
                  </button>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => {
                    const isSelected = selectedGrades.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          setSelectedGrades((prev) =>
                            isSelected
                              ? prev.filter((x) => x !== g)
                              : [...prev, g].sort((a, b) => a - b),
                          );
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-black border transition-all ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200"
                        }`}
                      >
                        {interpolate(t.common.gradeLabel, { grade: g })}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  {t.teacherModal?.gradesHint}
                </p>
              </div>

              {createSetError && (
                <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                  {createSetError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreateSet(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-xs transition-all"
              >
                {tc.cancel || "Hủy"}
              </button>
              <button
                type="button"
                onClick={handleCreateSet}
                disabled={createSetSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
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

      {/* Edit Set Modal */}
      {editingSet && (
        <div
          className="!m-0 fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] overflow-y-auto overscroll-contain"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 my-8 border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-black text-lg text-slate-800 flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <BookMarked size={18} />
                </span>
                {vm.editSetTitle || "Chỉnh sửa bộ từ vựng"}
              </h4>
              <button
                type="button"
                onClick={() => setEditingSet(null)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    {vm.setLabelTitle || "Tên bộ từ"}
                  </label>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="VD: Animals, Family..."
                    className="w-full px-3.5 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-400 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    Emoji
                  </label>
                  <input
                    value={editEmoji}
                    onChange={(e) => setEditEmoji(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-400 rounded-xl text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                  {t.teacherModal?.targetGrades || "Khối / Lớp áp dụng"}
                </label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  <button
                    type="button"
                    onClick={() => setEditGrades([])}
                    className={`px-3 py-1 rounded-xl text-xs font-black border transition-all ${
                      editGrades.length === 0
                        ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200"
                    }`}
                  >
                    {t.teacherModal?.allGradesOption || "Tất cả các khối"}
                  </button>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => {
                    const isSelected = editGrades.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          setEditGrades((prev) =>
                            isSelected
                              ? prev.filter((x) => x !== g)
                              : [...prev, g].sort((a, b) => a - b),
                          );
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-black border transition-all ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200"
                        }`}
                      >
                        {interpolate(t.common.gradeLabel, { grade: g })}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  {t.teacherModal?.gradesHint}
                </p>
              </div>

              {editError && (
                <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                  {editError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingSet(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-xs transition-all"
              >
                {tc.cancel || "Hủy"}
              </button>
              <button
                type="button"
                onClick={handleUpdateSet}
                disabled={editSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
              >
                {editSaving && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                {vm.saveChanges || tc.save || "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      {addCardSetId && (
        <div
          className="!m-0 fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] overflow-y-auto overscroll-contain"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 my-8 border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-black text-lg text-slate-800 flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                  <Sparkles size={18} />
                </span>
                {vm.addCardTitle || "Thêm thẻ từ vựng"}
              </h4>
              <button
                type="button"
                onClick={() => setAddCardSetId(null)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                  {vm.frontLabel || "Từ Tiếng Anh (Mặt trước)"}
                </label>
                <div className="flex gap-2">
                  <input
                    value={cardFront}
                    onChange={(e) => setCardFront(e.target.value)}
                    placeholder={
                      vm.frontPlaceholder || "VD: Elephant, Apple..."
                    }
                    className="flex-1 px-3.5 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-400 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <button
                    type="button"
                    onClick={autoGenIpa}
                    disabled={ipaLoading || !cardFront.trim()}
                    className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-black text-xs rounded-xl border border-purple-200 shadow-2xs transition-all flex items-center gap-1 shrink-0 active:scale-95"
                    title={
                      vm.ipaAutoGenTitle || "Tự động lấy phiên âm IPA bằng AI"
                    }
                  >
                    {ipaLoading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Sparkles size={13} />
                    )}
                    {vm.ipaAutoGenShort || "AI IPA"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    {vm.ipaLabel || "Phiên âm (IPA)"}
                  </label>
                  <input
                    value={cardIpa}
                    onChange={(e) => setCardIpa(e.target.value)}
                    placeholder={vm.ipaPlaceholder || "VD: ˈel.ɪ.fənt"}
                    className="w-full px-3.5 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-400 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    {vm.backLabel || "Nghĩa Tiếng Việt (Mặt sau)"}
                  </label>
                  <input
                    value={cardBack}
                    onChange={(e) => setCardBack(e.target.value)}
                    placeholder={
                      vm.backPlaceholder || "VD: Con voi, Quả táo..."
                    }
                    className="w-full px-3.5 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-400 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                  {vm.imageLabel || "Hình ảnh minh họa (Không bắt buộc)"}
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => cardImageInputRef.current?.click()}
                    disabled={cardImageUploading}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
                  >
                    {cardImageUploading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ImagePlus size={14} />
                    )}
                    {vm.uploadFromDevice || "Tải ảnh từ máy"}
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
                        className="w-11 h-11 object-cover rounded-xl border border-slate-200 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setCardImageUrl("")}
                        className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-0.5 shadow-xs transition-colors"
                      >
                        <X size={11} />
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
                <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                  {addCardError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAddCardSetId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-xs transition-all"
              >
                {tc.cancel || "Hủy"}
              </button>
              <button
                type="button"
                onClick={handleAddCard}
                disabled={
                  addCardSaving || !cardFront.trim() || !cardBack.trim()
                }
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs shadow-xs flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
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
          title={vm.deleteSetTitle || "Xác nhận xóa bộ từ vựng"}
          description={deleteSetTarget.title}
          onConfirm={handleDeleteSet}
          onCancel={() => setDeleteSetTarget(null)}
        />
      )}

      {/* Delete Card Confirmation Modal */}
      {deleteCardTarget && (
        <DeleteConfirmModal
          title={vm.deleteCardTitle || "Xác nhận xóa thẻ từ vựng"}
          description={deleteCardTarget.front}
          onConfirm={handleDeleteCard}
          onCancel={() => setDeleteCardTarget(null)}
        />
      )}
    </div>
  );
}
