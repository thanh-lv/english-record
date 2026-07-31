import { Loader2, Plus, Search, Wand2, X } from "lucide-react";
import { useLanguage } from "../../../i18n/LanguageContext";
import { useEscapeToClose } from "../../../hooks/useEscapeToClose";
import { DeleteConfirmModal } from "../shared/DeleteConfirmModal";
import { useStories } from "./useStories";
import { StoryCard } from "./StoryCard";
import { StoryCreateModal } from "./StoryCreateModal";
import { StoryManualModal } from "./StoryManualModal";
import { StoryEditModal } from "./StoryEditModal";

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
        <StoryEditModal
          t={t}
          editingStory={editingStory}
          editTitle={editTitle}
          editEmoji={editEmoji}
          editContent={editContent}
          editError={editError}
          editSaving={editSaving}
          onTitleChange={setEditTitle}
          onEmojiChange={setEditEmoji}
          onContentChange={setEditContent}
          onSave={saveEditStory}
          onClose={() => setEditingStory(null)}
        />
      )}

      {/* Manual Create Modal */}
      {showManual && (
        <StoryManualModal
          t={t}
          manualTitle={manualTitle}
          manualContent={manualContent}
          manualEmoji={manualEmoji}
          manualType={manualType}
          manualYearBorn={manualYearBorn}
          manualSaving={manualSaving}
          manualError={manualError}
          onTitleChange={setManualTitle}
          onEmojiChange={setManualEmoji}
          onTypeChange={setManualType}
          onYearBornChange={setManualYearBorn}
          onContentChange={setManualContent}
          onSave={handleManualSave}
          onClose={() => setShowManual(false)}
        />
      )}

      {/* AI Generate Story Modal */}
      {showCreate && (
        <StoryCreateModal
          t={t}
          title={title}
          yearBorn={yearBorn}
          prompt={prompt}
          isGenerating={isGenerating}
          generatedStory={generatedStory}
          generatedImageUrl={generatedImageUrl}
          isSaving={isSaving}
          aiError={aiError}
          onTitleChange={setTitle}
          onYearBornChange={setYearBorn}
          onPromptChange={setPrompt}
          onGenerate={handleGenerateAiStory}
          onSave={handleSaveAiStory}
          onClose={() => setShowCreate(false)}
        />
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
