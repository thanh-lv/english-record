import { useState } from 'react';
import { AlertCircle, Check, Loader2, Plus, Search, Sparkles, X } from 'lucide-react';
import { useLanguage, interpolate } from '../../../i18n/LanguageContext';
import { AIQuestionParserModal } from './AIQuestionParserModal';
import { DeleteConfirmModal } from '../shared/DeleteConfirmModal';
import { useTopics } from './useTopics';
import { TopicItem } from './TopicItem';
import { QuestionModal } from './QuestionModal';
function getPaginationItems(currentPage: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

export function TopicsManager() {
  const { t } = useLanguage();
  const tm = t.teacherModal;
  const tc = t.common;

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
    filterGrade,
    setFilterGrade,
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
    editTopicGrades,
    setEditTopicGrades,
    addingTopic,
    setAddingTopic,
    newTopicTitle,
    setNewTopicTitle,
    newTopicGrades,
    setNewTopicGrades,
    addTopicError,
    setAddTopicError,
    saving,
    deleteTarget,
    setDeleteTarget,
    deleteSaving,
    deleteError,
    setDeleteError,
    fetchTopics,
    toggleTopicActive,
    saveTopic,
    addTopic,
    confirmDelete,
    createQuestion,
    updateQuestion,
    addParsedQuestions,
  } = useTopics();

  const [aiParserTopicId, setAiParserTopicId] = useState<string | null>(null);
  const [questionModal, setQuestionModal] = useState<{
    mode: 'add' | 'edit';
    topicId: string;
    topicType: string;
    question?: any;
  } | null>(null);

  const PAGE_SIZE = 20;

  return (
    <div className="space-y-4">
      {/* Type tabs (Standard vs Bông Bé) */}
      <div className="flex bg-white/95 backdrop-blur-sm rounded-2xl p-1.5 border border-slate-100 shadow-sm gap-2">
        <button
          type="button"
          onClick={() => {
            setActiveType('standard');
            setPage(0);
          }}
          className={`flex-1 sm:flex-none px-5 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all ${
            activeType === 'standard'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          {tm.tabStandard || 'Chủ đề thường'} ({topics.filter(t => t.type === 'standard').length})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveType('bongbe');
            setPage(0);
          }}
          className={`flex-1 sm:flex-none px-5 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeType === 'bongbe'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Sparkles size={14} />
          {tm.tabBongBe || 'Chủ đề Bông Bé'} ({topics.filter(t => t.type === 'bongbe').length})
        </button>
      </div>

      {/* Unified Toolbar */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm p-3.5">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search input */}
          <div className="relative flex-1 min-w-[160px]">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              value={filterText}
              onChange={e => {
                setFilterText(e.target.value);
                setPage(0);
              }}
              placeholder={tm.searchTopics || tc.search || 'Tìm kiếm chủ đề...'}
              className="w-full pl-9 pr-9 py-2 bg-slate-50/80 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
            />
            {filterText && (
              <button
                type="button"
                onClick={() => setFilterText('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status filter dropdown */}
          <select
            value={filterStatus}
            onChange={e => {
              setFilterStatus(e.target.value as any);
              setPage(0);
            }}
            className="px-3 py-2 bg-slate-50/80 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
          >
            <option value="all">
              {tm.filterTopicStatusAll || tm.filterStoryStatusAll || 'Tất cả'}
            </option>
            <option value="active">
              {tm.filterTopicStatusActive || tm.topicStatusActive || 'Đang hiện'}
            </option>
            <option value="hidden">
              {tm.filterTopicStatusHidden || tm.topicStatusHidden || 'Đã ẩn'}
            </option>
          </select>

          {/* Grade filter dropdown */}
          <select
            value={filterGrade}
            onChange={e => {
              setFilterGrade(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 bg-slate-50/80 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
          >
            <option value="all">{tm.allGradesOption || 'Tất cả các khối'}</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
              <option key={g} value={g.toString()}>
                {interpolate(tc.gradeLabel || 'Lớp {grade}', { grade: g })}
              </option>
            ))}
            <option value="unassigned">{tm.allGradesOption || 'Tất cả các khối'} (Mặc định)</option>
          </select>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Add topic button */}
          {addingTopic !== activeType && (
            <button
              type="button"
              onClick={() => {
                setAddingTopic(activeType);
                setNewTopicTitle('');
                setNewTopicGrades([]);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <Plus size={15} /> {tc.addTopic}
            </button>
          )}
        </div>
      </div>

      {/* Add new topic form */}
      {addingTopic === activeType && (
        <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-2xl animate-in fade-in duration-200 space-y-3">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newTopicTitle}
              maxLength={100}
              onChange={e => {
                setNewTopicTitle(e.target.value);
                setAddTopicError('');
              }}
              onKeyDown={e => e.key === 'Enter' && addTopic()}
              placeholder={
                tc.topicTitlePlaceholder || tc.newTopicPlaceholder || 'Nhập tên chủ đề...'
              }
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-blue-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
            />
            <button
              type="button"
              onClick={addTopic}
              disabled={saving || newTopicTitle.trim().length < 2}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 shrink-0 transition-all active:scale-95"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {tc.save}
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingTopic(null);
                setNewTopicGrades([]);
                setAddTopicError('');
              }}
              className="p-2.5 bg-white text-slate-500 rounded-xl hover:bg-slate-100 border border-slate-200 shrink-0 transition-all active:scale-95"
            >
              <X size={14} />
            </button>
          </div>

          {addTopicError && (
            <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              <AlertCircle size={14} className="shrink-0" /> {addTopicError}
            </div>
          )}

          {/* Grade selection pills for new topic */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[11px] font-black text-slate-500 mr-1">
              {tm.targetGrades || 'Khối / Lớp áp dụng'}:
            </span>
            <button
              type="button"
              onClick={() => setNewTopicGrades([])}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-black border transition-all ${
                newTopicGrades.length === 0
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
              }`}
            >
              {tm.allGradesOption || 'Tất cả các khối'}
            </button>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(g => {
              const isSelected = newTopicGrades.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    setNewTopicGrades(prev =>
                      isSelected ? prev.filter(x => x !== g) : [...prev, g].sort((a, b) => a - b)
                    );
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-black border transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  {interpolate(tc.gradeLabel || 'Lớp {grade}', { grade: g })}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Topics List / Loading / Error */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
            <Loader2 size={22} className="animate-spin text-blue-500" />
          </div>
          <p className="text-xs font-bold text-slate-400">Đang tải chủ đề...</p>
        </div>
      ) : loadError ? (
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto">
            <AlertCircle size={24} className="text-rose-500" />
          </div>
          <p className="font-bold text-rose-700 text-sm">
            {tc.loadTopicsError || 'Không thể tải danh sách chủ đề'}
          </p>
          <button
            type="button"
            onClick={fetchTopics}
            className="px-5 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-rose-700 transition-all active:scale-95"
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
              editTopicGrades={editTopicGrades}
              saving={saving}
              onToggleExpand={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
              onToggleActive={toggleTopicActive}
              onStartEdit={(id, title, grades) => {
                setEditingTopic(id);
                setEditTopicTitle(title);
                setEditTopicGrades(Array.isArray(grades) ? grades : []);
              }}
              onSaveEdit={saveTopic}
              onCancelEdit={() => setEditingTopic(null)}
              onDeleteTopic={(id, title) => setDeleteTarget({ type: 'topic', id, label: title })}
              onEditTopicTitleChange={setEditTopicTitle}
              onEditTopicGradesChange={setEditTopicGrades}
              onOpenAddQuestion={(topicId, topicType) =>
                setQuestionModal({ mode: 'add', topicId, topicType })
              }
              onOpenEditQuestion={(topicId, topicType, q) =>
                setQuestionModal({
                  mode: 'edit',
                  topicId,
                  topicType,
                  question: q,
                })
              }
              onDeleteQuestion={(id, text) =>
                setDeleteTarget({ type: 'question', id, label: text })
              }
              onOpenAiParser={topicId => setAiParserTopicId(topicId)}
            />
          ))}

          {/* Empty state */}
          {pagedTopics.length === 0 && (
            <div className="py-16 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                <Search size={20} className="text-slate-400" />
              </div>
              <p className="font-bold text-slate-500 text-sm">
                {filterText || filterStatus !== 'all'
                  ? tm.noTopicsFound || 'Không tìm thấy chủ đề'
                  : tm.noTopicsYet || 'Chưa có chủ đề nào'}
              </p>
              <p className="text-xs text-slate-400">
                {filterText || filterStatus !== 'all'
                  ? 'Thử thay đổi bộ lọc tìm kiếm'
                  : 'Nhấn "Thêm chủ đề" để bắt đầu'}
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 mt-2">
              <span className="text-xs font-bold text-slate-400">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, topics.length)} /{' '}
                {topics.length} {t.teacherNav.topics}
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-xs font-black rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  {tm.paginationPrev || 'Trước'}
                </button>
                {getPaginationItems(page + 1, totalPages).map((item, idx) => {
                  if (item === '...') {
                    return (
                      <span
                        key={`ellipsis-${idx}`}
                        className="w-7 h-7 flex items-center justify-center text-slate-400 text-xs font-black select-none"
                      >
                        ...
                      </span>
                    );
                  }
                  const pageIndex = (item as number) - 1;
                  const isCurrent = page === pageIndex;
                  return (
                    <button
                      key={`page-${item}`}
                      type="button"
                      onClick={() => setPage(pageIndex)}
                      className={`w-7 h-7 text-xs font-black rounded-xl transition-all ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 text-xs font-black rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  {tm.paginationNext || 'Sau'}
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
          onSave={async values => {
            if (questionModal.mode === 'add') {
              await createQuestion(questionModal.topicId, values);
            } else if (questionModal.question) {
              await updateQuestion(questionModal.question.id, values);
            }
          }}
        />
      )}

      {/* AI Question Parser Modal */}
      {aiParserTopicId && (
        <AIQuestionParserModal
          onAddAll={async parsed => addParsedQuestions(aiParserTopicId, parsed)}
          onClose={() => setAiParserTopicId(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          title={
            deleteTarget.type === 'topic'
              ? t.common.deleteTopicConfirm || 'Xác nhận xóa chủ đề'
              : t.common.deleteQuestionConfirm || 'Xác nhận xóa câu hỏi'
          }
          description={deleteTarget.label}
          saving={deleteSaving}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteError('');
          }}
        />
      )}
    </div>
  );
}
