import React, { useState } from "react";
import { X, ImagePlus, Loader2 } from "lucide-react";
import { uploadToStorage } from "../../../services/storageService";
import { useEscapeToClose } from "../../../hooks/useEscapeToClose";

interface QuestionModalProps {
  t: any;
  modalData: {
    mode: "add" | "edit";
    topicId: string;
    topicType: string;
    question?: any;
  };
  onClose: () => void;
  onSave: (values: {
    text: string;
    translation: string;
    sample_answer: string;
    target: string;
    image_url: string;
  }) => Promise<void>;
}

export function QuestionModal({
  t,
  modalData,
  onClose,
  onSave,
}: QuestionModalProps) {
  useEscapeToClose(onClose, true);

  const initialQuestion = modalData.question || {};
  const [text, setText] = useState(initialQuestion.text || "");
  const [translation, setTranslation] = useState(
    initialQuestion.translation || "",
  );
  const [sampleAnswer, setSampleAnswer] = useState(
    initialQuestion.sample_answer || "",
  );
  const [target, setTarget] = useState(initialQuestion.target || "");
  const [imageUrl, setImageUrl] = useState(initialQuestion.image_url || "");

  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setImageUploadError("");
    try {
      const url = await uploadToStorage(file, "question_images");
      setImageUrl(url);
    } catch (err) {
      console.error("Lỗi upload ảnh:", err);
      setImageUploadError(t.common.uploadImageError);
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 2) return;
    setSaving(true);
    try {
      await onSave({
        text: text.trim(),
        translation: translation.trim(),
        sample_answer: sampleAnswer.trim(),
        target: target.trim(),
        image_url: imageUrl,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="question-modal-title"
    >
      <div className="bg-white rounded-lg w-full max-w-lg shadow-md border-4 border-blue-100 p-6 space-y-4 my-4">
        <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
          <h4
            id="question-modal-title"
            className="font-black text-lg text-slate-800"
          >
            {modalData.mode === "add"
              ? t.common.addQuestion
              : t.common.edit + " " + t.common.questionLabel.replace(":", "")}
          </h4>
          <button
            onClick={onClose}
            aria-label={t.common.close}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form fields */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-black text-slate-600 uppercase mb-1 block">
              {t.common.questionLabel.replace(":", "")}
            </label>
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.common.questionPlaceholder}
              className="w-full px-3 py-2.5 rounded-lg border-2 border-blue-200 text-sm font-bold focus:outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="text-xs font-black text-slate-600 uppercase mb-1 block">
              {t.common.translationLabel.replace(":", "")}
            </label>
            <input
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder={t.common.translationPlaceholder}
              className="w-full px-3 py-2.5 rounded-lg border-2 border-slate-200 text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-black text-slate-600 uppercase mb-1 block">
              {t.common.sampleAnswerLabel.replace(":", "")}
            </label>
            <input
              value={sampleAnswer}
              onChange={(e) => setSampleAnswer(e.target.value)}
              placeholder={t.common.sampleAnswerPlaceholder}
              className="w-full px-3 py-2.5 rounded-lg border-2 border-slate-200 text-sm focus:outline-none"
            />
          </div>

          {modalData.topicType === "bongbe" && (
            <div>
              <label className="text-xs font-black text-slate-600 uppercase mb-1 block">
                {t.common.targetPlaceholder}
              </label>
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder={t.common.targetPlaceholder}
                className="w-full px-3 py-2.5 rounded-lg border-2 border-slate-200 text-sm focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-black text-slate-600 uppercase mb-1 block">
              {t.common.imageOptional.replace(":", "")}
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center justify-center w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer border-2 border-slate-200 transition-colors">
                {uploadingImage ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ImagePlus size={18} />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
              </label>
              {imageUrl && (
                <div className="relative group">
                  <img
                    src={imageUrl}
                    alt=""
                    className="h-10 w-10 object-cover rounded-lg border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 shadow-md hover:bg-rose-600"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}
            </div>
            {imageUploadError && (
              <p className="text-xs font-bold text-rose-500 mt-1">
                {imageUploadError}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-sm transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={text.trim().length < 2 || saving}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg text-sm shadow-md transition-colors flex items-center justify-center gap-1.5"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                t.common.save
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
