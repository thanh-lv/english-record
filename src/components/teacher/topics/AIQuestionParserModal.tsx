import {
  AlertCircle,
  Check,
  ImageIcon,
  Loader2,
  Sparkles,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { useLanguage } from "../../../i18n/LanguageContext";
import { useEscapeToClose } from "../../../hooks/useEscapeToClose";

const WORKER_URL =
  "https://free-image-generation-api.levanthanh29111999.workers.dev/";

interface ParsedQuestion {
  text: string;
  sample_answer: string;
}

interface AIQuestionParserModalProps {
  onAddAll: (questions: ParsedQuestion[]) => Promise<void>;
  onClose: () => void;
}

export function AIQuestionParserModal({
  onAddAll,
  onClose,
}: AIQuestionParserModalProps) {
  const { t } = useLanguage();
  useEscapeToClose(onClose);
  const [mode, setMode] = useState<"text" | "image">("text");
  const [rawText, setRawText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [adding, setAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectImage = (file: File | null) => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : "");
    setError("");
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] || "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const applyParsedQuestions = (data: any) => {
    if (!data.questions || data.questions.length === 0) {
      console.warn("AI parse raw response:", data.raw, data.error);
      setError(t.aiParser.errorNoQuestions);
      return;
    }
    setQuestions(
      data.questions.map((q: any) => ({
        text: q.text || "",
        sample_answer: q.sample_answer || "",
      })),
    );
  };

  const handleParse = async () => {
    const apiKey = import.meta.env.VITE_AI_API_KEY;
    if (!apiKey) {
      setError(t.aiParser.errorMissingApiKey);
      return;
    }

    if (mode === "text") {
      const text = rawText.trim();
      if (!text) return;
      setParsing(true);
      setError("");
      setQuestions([]);
      try {
        const res = await fetch(WORKER_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ type: "parse_questions", prompt: text }),
        });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        applyParsedQuestions(data);
      } catch {
        setError(t.aiParser.errorConnection);
      } finally {
        setParsing(false);
      }
      return;
    }

    if (!imageFile) return;
    setParsing(true);
    setError("");
    setQuestions([]);
    try {
      const base64 = await fileToBase64(imageFile);
      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          type: "read_exam",
          image: base64,
          prompt:
            'Read this exam question sheet and extract every question along with its sample/expected answer if present. Return ONLY a JSON array, no explanation, no markdown fences, in this exact shape: [{"text": "question text", "sample_answer": "answer text or empty string"}]',
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      applyParsedQuestions(data);
    } catch {
      setError(t.aiParser.errorConnection);
    } finally {
      setParsing(false);
    }
  };

  const updateQuestion = (
    idx: number,
    field: keyof ParsedQuestion,
    value: string,
  ) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)),
    );
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddAll = async () => {
    const valid = questions.filter((q) => q.text.trim());
    if (valid.length === 0) return;
    setAdding(true);
    try {
      await onAddAll(valid);
      onClose();
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      className="!m-0 fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-parser-title"
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 my-8 max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
              <Sparkles size={18} />
            </span>
            <div>
              <h4
                id="ai-parser-title"
                className="font-black text-lg text-slate-800"
              >
                {t.aiParser.title}
              </h4>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                {t.aiParser.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t.common.close}
            className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-4 pb-6 overflow-y-auto overscroll-contain">
          {/* Mode tabs */}
          <div className="flex gap-1.5 bg-slate-100/80 p-1 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setMode("text")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${mode === "text" ? "bg-white text-purple-700 shadow-2xs" : "text-slate-500 hover:text-slate-700"}`}
            >
              <Type size={14} /> {t.aiParser.tabText}
            </button>
            <button
              type="button"
              onClick={() => setMode("image")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${mode === "image" ? "bg-white text-purple-700 shadow-2xs" : "text-slate-500 hover:text-slate-700"}`}
            >
              <ImageIcon size={14} /> {t.aiParser.tabImage}
            </button>
          </div>

          {/* Input */}
          {mode === "text" ? (
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-600 uppercase block">
                {t.aiParser.textLabel}
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={t.aiParser.textPlaceholder}
                rows={8}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 resize-y transition-all"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-600 uppercase block">
                {t.aiParser.imageLabel}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleSelectImage(e.target.files?.[0] || null)}
              />
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt={t.aiParser.imageAlt}
                    className="w-full max-h-64 object-contain rounded-xl border border-slate-200 bg-slate-50 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleSelectImage(null)}
                    aria-label={t.common.delete}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white text-rose-500 rounded-xl shadow-xs transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-8 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-slate-400 hover:border-purple-400 hover:text-purple-600 transition-all cursor-pointer"
                >
                  <ImageIcon size={28} />
                  <span className="text-xs font-black">
                    {t.aiParser.imagePickPrompt}
                  </span>
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleParse}
            disabled={
              parsing || (mode === "text" ? !rawText.trim() : !imageFile)
            }
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-black rounded-xl text-xs transition-all shadow-xs active:scale-95"
          >
            {parsing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            {parsing ? t.aiParser.parsing : t.aiParser.parseButton}
          </button>

          {error && (
            <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}

          {/* Preview & edit */}
          {questions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-600 uppercase">
                  {t.aiParser.previewLabel} ({questions.length})
                </label>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto overscroll-contain pr-1 pb-1">
                {questions.map((q, idx) => (
                  <div
                    key={idx}
                    className="flex gap-2 items-start bg-slate-50/80 border border-slate-200/80 rounded-xl p-3"
                  >
                    <span className="w-6 h-6 mt-1 shrink-0 rounded-lg bg-purple-100 text-purple-700 text-xs font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="flex-1 space-y-1.5">
                      <input
                        value={q.text}
                        onChange={(e) =>
                          updateQuestion(idx, "text", e.target.value)
                        }
                        placeholder={t.aiParser.questionPlaceholder}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-purple-400 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all"
                      />
                      <input
                        value={q.sample_answer}
                        onChange={(e) =>
                          updateQuestion(idx, "sample_answer", e.target.value)
                        }
                        placeholder={t.aiParser.answerPlaceholder}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-purple-400 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeQuestion(idx)}
                      aria-label={t.common.delete}
                      className="p-1.5 mt-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors active:scale-95"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-xs transition-all"
          >
            {t.aiParser.cancel}
          </button>
          <button
            type="button"
            onClick={handleAddAll}
            disabled={
              adding || questions.filter((q) => q.text.trim()).length === 0
            }
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
          >
            {adding ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            {t.aiParser.addAll}
          </button>
        </div>
      </div>
    </div>
  );
}
