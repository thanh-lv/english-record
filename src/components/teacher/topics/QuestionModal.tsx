import React, { useState } from "react";
import { X, ImagePlus, Loader2, AlertCircle } from "lucide-react";
import { uploadToStorage } from "../../../services/uploadService";
import { useEscapeToClose } from "../../../hooks/useEscapeToClose";
import {
  validateQuestion,
  validateImageFile,
  sanitizeText,
} from "../../../utils/validators";

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
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileVal = validateImageFile(file, 5, {
      typeInvalid: t.common.imageTypeInvalid,
      sizeTooLarge: t.common.imageSizeLimit,
    });
    if (!fileVal.isValid) {
      setImageUploadError(fileVal.error || t.common.uploadImageError);
      e.target.value = "";
      return;
    }

    setUploadingImage(true);
    setImageUploadError("");
    try {
      const url = await uploadToStorage(file, "question_images");
      setImageUrl(url);
    } catch (err: any) {
      console.error("Lỗi upload ảnh:", err);
      setImageUploadError(err.message || t.common.uploadImageError);
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = sanitizeText(text);
    const cleanTranslation = sanitizeText(translation);
    const cleanSampleAnswer = sanitizeText(sampleAnswer);
    const cleanTarget = sanitizeText(target);

    const qVal = validateQuestion(
      {
        text: cleanText,
        translation: cleanTranslation,
        sample_answer: cleanSampleAnswer,
        target: cleanTarget,
      },
      {
        textRequired: t.common.questionMin,
        textMin: t.common.questionMin,
        textMax: t.common.questionMax,
        translationMax: t.common.translationMax,
        sampleAnswerMax: t.common.sampleAnswerMax,
        targetMax: t.common.targetMax,
      },
    );

    if (!qVal.isValid) {
      setError(qVal.error || t.common.questionMin);
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave({
        text: cleanText,
        translation: cleanTranslation,
        sample_answer: cleanSampleAnswer,
        target: cleanTarget,
        image_url: imageUrl,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Lỗi lưu câu hỏi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="!m-0 fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="question-modal-title"
    >
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 p-6 space-y-4 my-8 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
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
            className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form fields */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-black text-slate-600 uppercase mb-1.5 block">
              {t.common.questionLabel.replace(":", "")}
            </label>
            <input
              autoFocus
              value={text}
              maxLength={500}
              onChange={(e) => {
                setText(e.target.value);
                setError("");
              }}
              placeholder={t.common.questionPlaceholder}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-400 bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-black text-slate-600 uppercase mb-1.5 block">
              {t.common.translationLabel.replace(":", "")}
            </label>
            <input
              value={translation}
              maxLength={500}
              onChange={(e) => {
                setTranslation(e.target.value);
                setError("");
              }}
              placeholder={t.common.translationPlaceholder}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-400 bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-black text-slate-600 uppercase mb-1.5 block">
              {t.common.sampleAnswerLabel.replace(":", "")}
            </label>
            <input
              value={sampleAnswer}
              maxLength={1000}
              onChange={(e) => {
                setSampleAnswer(e.target.value);
                setError("");
              }}
              placeholder={t.common.sampleAnswerPlaceholder}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-400 bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          {modalData.topicType === "bongbe" && (
            <div>
              <label className="text-xs font-black text-slate-600 uppercase mb-1.5 block">
                {t.common.targetPlaceholder}
              </label>
              <input
                value={target}
                maxLength={200}
                onChange={(e) => {
                  setTarget(e.target.value);
                  setError("");
                }}
                placeholder={t.common.targetPlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-400 bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-black text-slate-600 uppercase mb-1.5 block">
              {t.common.imageOptional.replace(":", "")}
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center justify-center w-10 h-10 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl cursor-pointer border border-slate-200 transition-all active:scale-95 shadow-2xs">
                {uploadingImage ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ImagePlus size={16} />
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
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
                    className="h-10 w-10 object-cover rounded-xl border border-slate-200 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-0.5 shadow-md hover:bg-rose-600 transition-transform active:scale-90"
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

          {error && (
            <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-xs transition-all"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={text.trim().length < 2 || saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
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
