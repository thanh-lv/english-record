import {
  AlertCircle,
  Check,
  CheckCircle,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Play,
  Plus,
  Search,
  Trash2,
  Youtube,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { useLanguage, interpolate } from '../../../i18n/LanguageContext';
import { DeleteConfirmModal } from '../shared/DeleteConfirmModal';
import { useShadowingManager } from './useShadowingManager';
import { extractYoutubeId, formatSecondsToTime } from '../../../services/shadowingService';

export function ShadowingManager() {
  const { t } = useLanguage();

  const {
    filteredVideos,
    loading,
    searchQuery: searchText,
    setSearchQuery: setSearchText,
    filterGrade,
    setFilterGrade,
    showCreate,
    setShowCreate,
    editingVideo,
    title,
    setTitle,
    youtubeUrl,
    setYoutubeUrl,
    previewStart,
    setPreviewStart,
    previewEnd,
    setPreviewEnd,
    recordStart,
    setRecordStart,
    recordEnd,
    setRecordEnd,
    selectedGrades,
    setSelectedGrades,
    isSaving,
    error,
    deleteTarget,
    setDeleteTarget,
    deleteSaving,
    deleteError,
    copiedId,
    openCreateModal,
    openEditModal,
    handleSave,
    handleToggleActive: toggleActive,
    handleDelete: confirmDelete,
    handleCopyLink,
  } = useShadowingManager(t);

  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'hidden'>('all');

  if (loading)
    return (
      <div className="p-12 text-center">
        <Loader2 className="animate-spin mx-auto text-indigo-500" size={32} />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Top Header & Search/Filter Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/95 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <Youtube size={22} />
            </span>
            {t.teacherModal.manageShadowing}
          </h3>
          <p className="text-xs text-slate-400 font-bold mt-1">
            {filteredVideos.length} {t.teacherNav.shadowing.toLowerCase()}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search bar */}
          <div className="relative min-w-[180px] sm:min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder={t.teacherModal.searchShadowingPlaceholder || 'Tìm kiếm video...'}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-400 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all shadow-2xs"
            />
            {searchText && (
              <button
                type="button"
                onClick={() => setSearchText('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Grade filter */}
          <select
            value={filterGrade}
            onChange={e => setFilterGrade(e.target.value)}
            className="px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-400 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all shadow-2xs cursor-pointer"
          >
            <option value="all">{t.teacherModal.allGradesOption}</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
              <option key={g} value={g.toString()}>
                {interpolate(t.common.gradeLabel, { grade: g })}
              </option>
            ))}
            <option value="unassigned">{t.teacherModal.allGradesOption} (Mặc định)</option>
          </select>

          {/* Add video button */}
          <button
            onClick={openCreateModal}
            className="bg-[#1E88E5] hover:bg-[#1565C0] text-white px-4 py-2 rounded-xl font-black flex items-center gap-2 transition-all shadow-xs text-xs active:scale-95 shrink-0"
          >
            <Plus size={16} /> {t.teacherModal.addVideoTitle}
          </button>
        </div>
      </div>

      {/* Video Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {filteredVideos.map(video => {
          const ytId = extractYoutubeId(video.youtube_url);
          const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : '';
          const isActive = video.is_active ?? true;

          return (
            <div
              key={video.id}
              className="bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-300 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col group"
            >
              {/* Thumbnail Container */}
              <div className="aspect-video bg-slate-900 relative overflow-hidden">
                {thumb ? (
                  <img
                    src={thumb}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                    <Youtube size={48} />
                  </div>
                )}

                {/* Top Scrim Gradient Overlay for Badges readability */}
                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/85 via-black/45 to-transparent pointer-events-none z-0" />

                {/* Center Hover Play Icon */}
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/25 transition-colors flex items-center justify-center pointer-events-none z-0">
                  <div className="w-10 h-10 rounded-full bg-white/95 text-slate-800 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200">
                    <Play size={16} className="fill-slate-800 ml-0.5 text-slate-800" />
                  </div>
                </div>

                {/* Grade Badge (Top Left Floating) */}
                <div className="absolute top-2.5 left-2.5 z-10">
                  {Array.isArray(video.grades) && video.grades.length > 0 ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-black bg-indigo-600/90 text-white shadow-xs backdrop-blur-md border border-indigo-400/30">
                      {interpolate(t.common.gradeLabel, {
                        grade: video.grades
                          .slice()
                          .sort((a: number, b: number) => a - b)
                          .join(', '),
                      })}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-black bg-slate-900/75 text-white shadow-xs backdrop-blur-md border border-white/20">
                      {t.teacherModal.allGradesOption}
                    </span>
                  )}
                </div>

                {/* Active / Hidden Quick Toggle (Top Right Floating) */}
                <div className="absolute top-2.5 right-2.5 z-10">
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      toggleActive(video.id, isActive);
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black backdrop-blur-md border shadow-xs transition-all active:scale-95 ${
                      isActive
                        ? 'bg-emerald-500/90 text-white border-emerald-400/50 hover:bg-emerald-600'
                        : 'bg-slate-800/85 text-slate-200 border-slate-700/60 hover:bg-slate-900'
                    }`}
                    title={isActive ? 'Bấm để ẩn video' : 'Bấm để hiện video'}
                  >
                    {isActive ? <Eye size={12} /> : <EyeOff size={12} />}
                    <span>
                      {isActive
                        ? t.teacherModal.filterStoryStatusActive
                        : t.teacherModal.filterStoryStatusHidden}
                    </span>
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex flex-col flex-1 gap-3">
                <h4
                  className="font-black text-slate-800 text-sm line-clamp-2 min-h-[40px] group-hover:text-indigo-600 transition-colors leading-snug"
                  title={video.title}
                >
                  {video.title}
                </h4>

                {/* Time markers info box */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs font-bold text-slate-600 space-y-1 mt-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">👁️ Preview:</span>
                    <span className="text-slate-700 font-black">
                      {formatSecondsToTime(video.preview_start) || '00:00'} -{' '}
                      {formatSecondsToTime(video.preview_end) || t.common.end}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">🎙️ Record:</span>
                    <span className="text-slate-700 font-black">
                      {formatSecondsToTime(video.record_start) || '00:00'} -{' '}
                      {formatSecondsToTime(video.record_end) || t.common.end}
                    </span>
                  </div>
                </div>

                {/* Bottom Action Buttons (Single Unified Row) */}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => openEditModal(video)}
                    className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black rounded-xl transition-all flex justify-center items-center gap-1 border border-indigo-100 shadow-2xs"
                  >
                    {t.common.edit}
                  </button>

                  <button
                    onClick={() => handleCopyLink(video.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 border shadow-2xs ${
                      copiedId === video.id
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                        : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-100'
                    }`}
                    title={t.common.copyLink}
                  >
                    {copiedId === video.id ? (
                      <>
                        <Check size={13} className="text-emerald-600" />
                        <span className="hidden sm:inline">{t.common.linkCopied}</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span className="hidden sm:inline">{t.common.copyLink}</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setDeleteTarget(video)}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-black rounded-xl transition-all border border-rose-100 shadow-2xs"
                    title={t.common.delete}
                    aria-label={t.common.delete}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredVideos.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 font-bold bg-white rounded-2xl border border-slate-200/80">
            {t.shadowing.empty}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="!m-0 fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] overscroll-contain">
          <div className="bg-white rounded-lg w-full max-w-md shadow-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-black text-xl text-slate-800 flex items-center gap-2">
                <Youtube className="text-rose-600" />{' '}
                {editingVideo ? t.teacherModal.editVideoTitle : t.teacherModal.addVideoTitle}
              </h4>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                  {t.teacherModal.videoTitle}
                </label>
                <input
                  value={title}
                  maxLength={150}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-bold focus:border-rose-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                  {t.teacherModal.videoUrl}
                </label>
                <input
                  value={youtubeUrl}
                  maxLength={300}
                  onChange={e => setYoutubeUrl(e.target.value)}
                  placeholder={t.teacherModal.videoUrlPlaceholder}
                  className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-bold focus:border-rose-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    {t.teacherModal.previewStart}
                  </label>
                  <input
                    type="text"
                    placeholder="00:00"
                    value={previewStart}
                    onChange={e => setPreviewStart(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-bold focus:border-rose-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    {t.teacherModal.previewEnd}
                  </label>
                  <input
                    type="text"
                    placeholder="00:00"
                    value={previewEnd}
                    onChange={e => setPreviewEnd(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-bold focus:border-rose-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    {t.teacherModal.recordStart}
                  </label>
                  <input
                    type="text"
                    placeholder="00:00"
                    value={recordStart}
                    onChange={e => setRecordStart(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-bold focus:border-rose-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                    {t.teacherModal.recordEnd}
                  </label>
                  <input
                    type="text"
                    placeholder="00:00"
                    value={recordEnd}
                    onChange={e => setRecordEnd(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-bold focus:border-rose-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase">
                  {t.teacherModal.targetGrades}
                </label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedGrades([])}
                    className={`px-3 py-1 rounded-lg text-xs font-black border transition-all ${
                      selectedGrades.length === 0
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                    }`}
                  >
                    {t.teacherModal.allGradesOption}
                  </button>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(g => {
                    const isSelected = selectedGrades.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          setSelectedGrades(prev =>
                            isSelected
                              ? prev.filter(x => x !== g)
                              : [...prev, g].sort((a, b) => a - b)
                          );
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black border transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                        }`}
                      >
                        {interpolate(t.common.gradeLabel, { grade: g })}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  {t.teacherModal.gradesHint}
                </p>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg flex items-center gap-2">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs shadow-md flex items-center gap-1.5"
              >
                {isSaving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle size={14} />
                )}
                {t.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          title={t.common.deleteVideoConfirm || 'Xác nhận xóa video?'}
          description={`"${deleteTarget.title}"`}
          saving={deleteSaving}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
export default ShadowingManager;
