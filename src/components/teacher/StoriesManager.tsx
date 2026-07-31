import {
  AlertCircle,
  Loader2,
  Pencil,
  Plus,
  Search,
  Wand2,
  X,
} from "lucide-react";
import { useLanguage } from "../../i18n/LanguageContext";
import { useEscapeToClose } from "../../hooks/useEscapeToClose";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { useStories } from "./stories/useStories";
import { StoryCard } from "./stories/StoryCard";

export function StoriesManager() {
  const { t } = useLanguage();
  const tm = (t as any).teacherModal || {};
  const tc = (t as any).common || {};

  const {
    loading,
    filterText,
    setFilterText,
    filterStatus,
    setFilterStatus,
    filteredStories,
    showCreate,
    setShowCreate,
    showManual,
    setShowManual,
    editingStory,
    setEditingStory,
    deleteStoryTarget,
    setDeleteStoryTarget,
    deleteError,
    editTitle,
    setEditTitle,
    editContent,
    setEditContent,
    editEmoji,
    setEditEmoji,
    editError,
    editSaving,
    manualTitle,
    setManualTitle,
    manualContent,
    setManualContent,
    manualEmoji,
    setManualEmoji,
    manualType,
    setManualType,
    manualYearBorn,
    setManualYearBorn,
    manualSaving,
    manualError,
    title,
    setTitle,
    yearBorn,
    setYearBorn,
    type,
    setType,
    emoji,
    setEmoji,
    prompt,
    setPrompt,
    isGenerating,
    generatedStory,
    generatedImageUrl,
    isSaving,
    aiError,
    toggleStoryActive,
    openEditStory,
    saveEditStory,
    confirmDeleteStory,
    handleManualSave,
    handleGenerateAiStory,
    handleSaveAiStory,
  } = useStories(t);

  useEscapeToClose(() => setEditingStory(null), !!editingStory);
  useEscapeToClose(() => setDeleteStoryTarget(null), !!deleteStoryTarget);
  useEscapeToClose(() => setShowManual(false), showManual);
  useEscapeToClose(() => setShowCreate(false), showCreate);

  return (
    <div className="space-y-4">
      {/* Top action buttons */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
          📚 {tc.storyManagerTitle || "Quản Lý Truyện Tiếng Anh"}
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-lg transition-all flex items-center gap-1.5 border border-slate-200"
          >
            <Plus size={15} /> {tc.createManualStory || "Viết truyện tay"}
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5"
          >
            <Wand2 size={15} /> {tc.createAiStory || "Tạo bằng AI"}
          </button>
        </div>
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
            placeholder={tm.searchStories || "Tìm truyện theo tiêu đề..."}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-purple-400"
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
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:outline-none"
        >
          <option value="all">
            {tm.filterStoryStatusAll || "Tất cả trạng thái"}
          </option>
          <option value="active">
            {tm.filterStoryStatusActive || "Đang hiện"}
          </option>
          <option value="hidden">
            {tm.filterStoryStatusHidden || "Đã ẩn"}
          </option>
        </select>
      </div>

      {/* Stories Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={32} className="animate-spin text-purple-600" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-5">
          {filteredStories.map((story) => (
            <StoryCard
              key={story.id}
              t={t}
              story={story}
              onEdit={openEditStory}
              onDelete={(s, e) => {
                e.stopPropagation();
                setDeleteStoryTarget(s);
              }}
              onToggleActive={toggleStoryActive}
            />
          ))}

          {filteredStories.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 font-bold bg-white rounded-lg border-2 border-dashed border-slate-200">
              {tm.noStoriesFound || "Không tìm thấy truyện nào"}
            </div>
          )}
        </div>
      )}

      {/* Edit Story Modal */}
      {editingStory && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto overscroll-contain"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg w-full max-w-2xl shadow-md border-4 border-amber-100 p-6 space-y-5 my-8">
            <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4">
              <h4 className="font-black text-xl text-slate-800 flex items-center gap-2">
                <Pencil className="text-amber-500" />{" "}
                {tc.editStoryInfo || "Chỉnh sửa câu chuyện"}
              </h4>
              <button
                type="button"
                onClick={() => setEditingStory(null)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    {tc.storyTitle || "Tiêu đề"}
                  </label>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-bold focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    {tc.storyEmoji || "Biểu tượng"}
                  </label>
                  <input
                    value={editEmoji}
                    onChange={(e) => setEditEmoji(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-bold focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                  {tc.storyContent || "Nội dung tiếng Anh"}
                </label>
                <textarea
                  rows={6}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-medium focus:border-amber-400 focus:outline-none leading-relaxed"
                />
              </div>

              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold text-rose-600 flex items-center gap-2">
                  <AlertCircle size={15} /> {editError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingStory(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-lg text-sm transition-colors"
              >
                {tc.cancel || "Hủy"}
              </button>
              <button
                type="button"
                onClick={saveEditStory}
                disabled={editSaving}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-lg text-sm shadow-md transition-colors flex items-center gap-1.5"
              >
                {editSaving && <Loader2 size={16} className="animate-spin" />}
                {tc.save || "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Create Modal */}
      {showManual && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto overscroll-contain"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg w-full max-w-xl shadow-md border-4 border-blue-100 p-6 space-y-4 my-8">
            <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3">
              <h4 className="font-black text-lg text-slate-800 flex items-center gap-2">
                ✍️ {tc.createManualStory || "Viết truyện mới"}
              </h4>
              <button
                type="button"
                onClick={() => setShowManual(false)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-600 mb-1 uppercase">
                    {tc.storyTitle || "Tiêu đề"}
                  </label>
                  <input
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="VD: The Little Cat"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1 uppercase">
                    Emoji
                  </label>
                  <input
                    value={manualEmoji}
                    onChange={(e) => setManualEmoji(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-center focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1 uppercase">
                    Thể loại
                  </label>
                  <input
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1 uppercase">
                    Độ tuổi (Năm sinh)
                  </label>
                  <select
                    value={manualYearBorn}
                    onChange={(e) => setManualYearBorn(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:border-blue-400 focus:outline-none"
                  >
                    <option value="2018">Mầm non (dưới 6 tuổi)</option>
                    <option value="2015">Tiểu học (trên 6 tuổi)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1 uppercase">
                  Nội dung bài đọc (Tiếng Anh)
                </label>
                <textarea
                  rows={5}
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  placeholder="Nhập nội dung truyện bằng tiếng Anh..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:border-blue-400 focus:outline-none leading-relaxed"
                />
              </div>

              {manualError && (
                <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-lg">
                  {manualError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowManual(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
              >
                {tc.cancel || "Hủy"}
              </button>
              <button
                type="button"
                onClick={handleManualSave}
                disabled={manualSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-1"
              >
                {manualSaving && <Loader2 size={14} className="animate-spin" />}
                {tc.save || "Lưu truyện"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generate Story Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto overscroll-contain"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg w-full max-w-xl shadow-md border-4 border-purple-100 p-6 space-y-4 my-8">
            <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3">
              <h4 className="font-black text-lg text-purple-800 flex items-center gap-2">
                ✨ {tc.createAiStory || "Tạo truyện bằng AI"}
              </h4>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1 uppercase">
                    Tiêu đề
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="VD: The Magic Dragon"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:border-purple-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1 uppercase">
                    Năm sinh học sinh
                  </label>
                  <input
                    value={yearBorn}
                    onChange={(e) => setYearBorn(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:border-purple-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1 uppercase">
                  Ý tưởng / Gợi ý cho AI (Prompt)
                </label>
                <div className="flex gap-2">
                  <input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="VD: A friendly dragon who loves eating apples..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:border-purple-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateAiStory}
                    disabled={isGenerating || !prompt.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-lg shadow-sm flex items-center gap-1.5 shrink-0"
                  >
                    {isGenerating ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Wand2 size={14} />
                    )}
                    Tạo thử
                  </button>
                </div>
              </div>

              {/* Generated preview */}
              {generatedStory && (
                <div className="space-y-3 p-3 bg-purple-50 rounded-lg border border-purple-200 animate-in fade-in duration-200">
                  <div className="flex gap-3 items-start">
                    {generatedImageUrl && (
                      <img
                        src={generatedImageUrl}
                        alt="AI Generated"
                        className="w-20 h-20 object-cover rounded-lg border border-purple-200 shrink-0"
                      />
                    )}
                    <p className="text-xs text-slate-700 font-medium leading-relaxed max-h-32 overflow-y-auto">
                      {generatedStory}
                    </p>
                  </div>
                </div>
              )}

              {aiError && (
                <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-lg">
                  {aiError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
              >
                {tc.cancel || "Hủy"}
              </button>
              <button
                type="button"
                onClick={handleSaveAiStory}
                disabled={isSaving || !generatedStory}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-1"
              >
                {isSaving && <Loader2 size={14} className="animate-spin" />}
                {tc.save || "Lưu câu chuyện"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteStoryTarget && (
        <DeleteConfirmModal
          title={tc.deleteStoryConfirm || "Xác nhận xóa câu chuyện"}
          description={deleteStoryTarget.title}
          onConfirm={confirmDeleteStory}
          onCancel={() => setDeleteStoryTarget(null)}
        />
      )}
    </div>
  );
}
