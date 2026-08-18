import {
  BookOpen,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
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
  const tm = t.teacherModal;
  const tc = t.common;

  const {
    loading,
    filterText,
    setFilterText,
    filterStatus,
    setFilterStatus,
    filterGrade,
    setFilterGrade,
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
    editGrades,
    setEditGrades,
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
    manualGrades,
    setManualGrades,
    manualSaving,
    manualError,
    title,
    setTitle,
    aiGrades,
    setAiGrades,
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
    <div className="space-y-6">
      {/* Header and Filter Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/95 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <BookOpen size={22} />
            </span>
            {tc.storyManagerTitle || "Quản Lý Truyện Tiếng Anh"}
          </h3>
          <p className="text-xs text-slate-400 font-bold mt-1">
            {filteredStories.length} câu chuyện tiếng Anh
          </p>
        </div>

        {/* Toolbar Controls */}
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
              placeholder={tm.searchStories || "Tìm truyện theo tiêu đề..."}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-purple-400 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all shadow-2xs"
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
            className="px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-purple-400 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all shadow-2xs cursor-pointer"
          >
            <option value="all">
              {t.teacherModal?.allGradesOption || "Tất cả các khối"}
            </option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
              <option key={g} value={g.toString()}>
                {t.common?.gradeLabel
                  ? t.common.gradeLabel.replace("{grade}", g.toString())
                  : `Khối ${g}`}
              </option>
            ))}
            <option value="unassigned">
              {t.teacherModal?.allGradesOption || "Tất cả các khối"} (Mặc định)
            </option>
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-purple-400 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all shadow-2xs cursor-pointer"
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

          {/* Manual Create Button */}
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl transition-all flex items-center gap-1.5 border border-slate-200/80 shadow-2xs active:scale-95 shrink-0"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">
              {tc.createManualStory || "Viết truyện tay"}
            </span>
          </button>

          {/* AI Create Button */}
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95 shrink-0"
          >
            <Sparkles size={15} />
            <span>{tc.createAiStory || "Tạo bằng AI"}</span>
          </button>
        </div>
      </div>

      {/* Stories Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={32} className="animate-spin text-purple-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5">
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
            <div className="col-span-full py-16 text-center text-slate-400 font-bold bg-white rounded-2xl border border-slate-200/80">
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
          editGrades={editGrades}
          editContent={editContent}
          editError={editError}
          editSaving={editSaving}
          onTitleChange={setEditTitle}
          onEmojiChange={setEditEmoji}
          onGradesChange={setEditGrades}
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
          manualGrades={manualGrades}
          manualSaving={manualSaving}
          manualError={manualError}
          onTitleChange={setManualTitle}
          onEmojiChange={setManualEmoji}
          onTypeChange={setManualType}
          onManualGradesChange={setManualGrades}
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
          aiGrades={aiGrades}
          prompt={prompt}
          isGenerating={isGenerating}
          generatedStory={generatedStory}
          generatedImageUrl={generatedImageUrl}
          isSaving={isSaving}
          aiError={aiError}
          onTitleChange={setTitle}
          onAiGradesChange={setAiGrades}
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
