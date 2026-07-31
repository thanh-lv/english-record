import { useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useLanguage } from "../../../i18n/LanguageContext";
import { supabase } from "../../../lib/supabase";
import { AIQuestionParserModal } from "./AIQuestionParserModal";
import { DeleteConfirmModal } from "../shared/DeleteConfirmModal";
import { useTopics } from "./useTopics";
import { TopicItem } from "./TopicItem";
import { QuestionModal } from "./QuestionModal";

export function TopicsManager() {
  const { t } = useLanguage();
  const tm = (t as any).teacherModal || {};
  const tc = (t as any).common || {};

  const {
    topics,
    loading,
    loadError,
    activeType,
    setActiveType,
    filterText,
    setFilterText,
    filterStatus,
    setFilterStatus,
    page,
    setPage,
    totalPages,
    pagedTopics,
    expandedTopic,
    setExpandedTopic,
    editingTopic,
    setEditingTopic,
    editTopicTitle,
    setEditTopicTitle,
    addingTopic,
    setAddingTopic,
    newTopicTitle,
    setNewTopicTitle,
    saving,
    deleteTarget,
    setDeleteTarget,
    fetchTopics,
    toggleTopicActive,
    saveTopic,
    addTopic,
    confirmDelete,
    addParsedQuestions,
  } = useTopics();

  const [aiParserTopicId, setAiParserTopicId] = useState<string | null>(null);
  const [questionModal, setQuestionModal] = useState<{
    mode: "add" | "edit";
    topicId: string;
    topicType: string;
    question?: any;
  } | null>(null);

  const PAGE_SIZE = 20;

  return (
    <div className="space-y-4">
      {/* Type tabs (Standard vs Bông Bé) */}
      <div className="flex bg-white rounded-lg p-1.5 border border-slate-100 shadow-sm gap-2">
        <button
          type="button"
          onClick={() => {
            setActiveType("standard");
            setPage(0);
          }}
          className={`flex-1 sm:flex-none px-4 py-2 text-xs sm:text-sm font-black rounded-lg transition-all ${
            activeType === "standard"
              ? "bg-[#1E88E5] text-white shadow-md"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          {tm.tabStandard || "Chủ đề thường"} (
          {topics.filter((t) => t.type === "standard").length})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveType("bongbe");
            setPage(0);
          }}
          className={`flex-1 sm:flex-none px-4 py-2 text-xs sm:text-sm font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeType === "bongbe"
              ? "bg-purple-600 text-white shadow-md"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Sparkles size={14} />
          {tm.tabBongBe || "Chủ đề Bông Bé"} (
          {topics.filter((t) => t.type === "bongbe").length})
        </button>
      </div>

      {/* Header controls: Search, Filter, Add Topic */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[200px]">
          {/* Search input */}
          <div className="relative flex-1 min-w-[150px]">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={filterText}
              onChange={(e) => {
                setFilterText(e.target.value);
                setPage(0);
              }}
              placeholder={tm.searchTopics || tc.search || "Tìm kiếm chủ đề..."}
              className="w-full pl-9 pr-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-bold focus:outline-none focus:border-blue-400"
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

          {/* Status filter dropdown */}
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as any);
              setPage(0);
            }}
            className="px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-600 focus:outline-none"
          >
            <option value="all">
              {tm.filterTopicStatusAll || tm.filterStoryStatusAll || "Tất cả"}
            </option>
            <option value="active">
              {tm.filterTopicStatusActive ||
                tm.topicStatusActive ||
                "Đang hiện"}
            </option>
            <option value="hidden">
              {tm.filterTopicStatusHidden || tm.topicStatusHidden || "Đã ẩn"}
            </option>
          </select>
        </div>

        {/* Add topic button */}
        {addingTopic !== activeType && (
          <button
            type="button"
            onClick={() => {
              setAddingTopic(activeType);
              setNewTopicTitle("");
            }}
            className="px-4 py-2 bg-[#1E88E5] hover:bg-blue-600 text-white font-extrabold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5"
          >
            <Plus size={16} /> {tc.addTopic}
          </button>
        )}
      </div>

      {/* Add new topic form */}
      {addingTopic === activeType && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg animate-in fade-in duration-200">
          <input
            autoFocus
            value={newTopicTitle}
            onChange={(e) => setNewTopicTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTopic()}
            placeholder={
              tc.topicTitlePlaceholder ||
              tc.newTopicPlaceholder ||
              "Nhập tên chủ đề..."
            }
            className="flex-1 px-3 py-2 rounded-lg border border-blue-300 text-sm font-bold focus:outline-none bg-white"
          />
          <button
            type="button"
            onClick={addTopic}
            disabled={saving || newTopicTitle.trim().length < 2}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-1 shrink-0"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            {tc.save}
          </button>
          <button
            type="button"
            onClick={() => setAddingTopic(null)}
            className="p-2 bg-white text-slate-500 rounded-lg hover:bg-slate-100 border border-slate-200 shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Topics List / Loading / Error */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      ) : loadError ? (
        <div className="p-6 bg-rose-50 border-2 border-rose-200 rounded-lg text-center space-y-3">
          <AlertCircle size={32} className="text-rose-500 mx-auto" />
          <p className="font-bold text-rose-700 text-sm">
            {tc.loadTopicsError || "Không thể tải danh sách chủ đề"}
          </p>
          <button
            type="button"
            onClick={fetchTopics}
            className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-rose-700"
          >
            {tc.retry}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {pagedTopics.map((topic, idx) => (
            <TopicItem
              key={topic.id}
              t={t}
              topic={topic}
              idx={page * PAGE_SIZE + idx}
              isExpanded={expandedTopic === topic.id}
              isEditing={editingTopic === topic.id}
              editTopicTitle={editTopicTitle}
              saving={saving}
              onToggleExpand={() =>
                setExpandedTopic(expandedTopic === topic.id ? null : topic.id)
              }
              onToggleActive={toggleTopicActive}
              onStartEdit={(id, title) => {
                setEditingTopic(id);
                setEditTopicTitle(title);
              }}
              onSaveEdit={saveTopic}
              onCancelEdit={() => setEditingTopic(null)}
              onDeleteTopic={(id, title) =>
                setDeleteTarget({ type: "topic", id, label: title })
              }
              onEditTopicTitleChange={setEditTopicTitle}
              onOpenAddQuestion={(topicId, topicType) =>
                setQuestionModal({ mode: "add", topicId, topicType })
              }
              onOpenEditQuestion={(topicId, topicType, q) =>
                setQuestionModal({
                  mode: "edit",
                  topicId,
                  topicType,
                  question: q,
                })
              }
              onDeleteQuestion={(id, text) =>
                setDeleteTarget({ type: "question", id, label: text })
              }
              onOpenAiParser={(topicId) => setAiParserTopicId(topicId)}
            />
          ))}

          {/* Empty state */}
          {pagedTopics.length === 0 && (
            <div className="py-12 text-center text-slate-400 font-bold bg-white rounded-lg border-2 border-dashed border-slate-200">
              {filterText || filterStatus !== "all"
                ? tm.noTopicsFound || "Không tìm thấy chủ đề"
                : tm.noTopicsYet || "Chưa có chủ đề nào"}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-bold text-slate-400">
                {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, topics.length)} /{" "}
                {topics.length} topics
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-xs font-black rounded-lg border border-slate-200 bg-[#1E88E5]/10 hover:bg-slate-50 disabled:opacity-40"
                >
                  {tm.paginationPrev || "Trước"}
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPage(i)}
                    className={`w-7 h-7 text-xs font-black rounded-lg transition-colors ${
                      page === i
                        ? "bg-[#1E88E5] text-white"
                        : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 text-xs font-black rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
                >
                  {tm.paginationNext || "Sau"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Question modal */}
      {questionModal && (
        <QuestionModal
          t={t}
          modalData={questionModal}
          onClose={() => setQuestionModal(null)}
          onSave={async (values) => {
            if (questionModal.mode === "add") {
              const topic = topics.find((t) => t.id === questionModal.topicId);
              const maxOrder = topic?.questions?.length || 0;
              await supabase.from("questions").insert({
                topic_id: questionModal.topicId,
                text: values.text,
                translation: values.translation || null,
                sample_answer: values.sample_answer || null,
                target: values.target || null,
                image_url: values.image_url || null,
                order_index: maxOrder,
              });
            } else if (questionModal.question) {
              await supabase
                .from("questions")
                .update({
                  text: values.text,
                  translation: values.translation || null,
                  sample_answer: values.sample_answer || null,
                  target: values.target || null,
                  image_url: values.image_url || null,
                })
                .eq("id", questionModal.question.id);
            }
            fetchTopics();
          }}
        />
      )}

      {/* AI Question Parser Modal */}
      {aiParserTopicId && (
        <AIQuestionParserModal
          onAddAll={async (parsed) =>
            addParsedQuestions(aiParserTopicId, parsed)
          }
          onClose={() => setAiParserTopicId(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          title={
            deleteTarget.type === "topic"
              ? t.common.deleteTopicConfirm
              : t.common.deleteQuestionConfirm
          }
          description={deleteTarget.label}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
