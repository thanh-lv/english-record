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
import { useLanguage } from "../../i18n/LanguageContext";

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
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto overscroll-contain"
      style={{ marginTop: "0px !important" }}
    >
      <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl border-4 border-violet-100 my-4 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b-2 border-slate-100 px-6 pt-6 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-2xl bg-violet-50 border-2 border-violet-200 text-violet-600 flex items-center justify-center">
              <Sparkles size={18} />
            </span>
            <div>
              <h4 className="font-black text-lg text-slate-800">
                {t.aiParser.title}
              </h4>
              <p className="text-xs text-slate-400 font-medium">
                {t.aiParser.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-4 overflow-y-auto overscroll-contain">
          {/* Mode tabs */}
          <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setMode("text")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors ${mode === "text" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              <Type size={14} /> {t.aiParser.tabText}
            </button>
            <button
              type="button"
              onClick={() => setMode("image")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors ${mode === "image" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
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
                className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-mono focus:outline-none focus:border-violet-400 resize-y"
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
                    className="w-full max-h-64 object-contain rounded-xl border-2 border-slate-200 bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleSelectImage(null)}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white text-rose-500 rounded-full shadow-md transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-8 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-violet-400 hover:text-violet-500 transition-colors"
                >
                  <ImageIcon size={28} />
                  <span className="text-sm font-bold">
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
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-sm transition-colors shadow-md border-b-4 border-violet-900"
          >
            {parsing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
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
              <div className="space-y-2 max-h-80 overflow-y-auto overscroll-contain pr-1">
                {questions.map((q, idx) => (
                  <div
                    key={idx}
                    className="flex gap-2 items-start bg-slate-50 border-2 border-slate-100 rounded-xl p-3"
                  >
                    <span className="w-6 h-6 mt-1 shrink-0 rounded-lg bg-violet-100 text-violet-700 text-xs font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="flex-1 space-y-1.5">
                      <input
                        value={q.text}
                        onChange={(e) =>
                          updateQuestion(idx, "text", e.target.value)
                        }
                        placeholder={t.aiParser.questionPlaceholder}
                        className="w-full px-3 py-2 rounded-lg border-2 border-blue-200 text-sm font-bold focus:outline-none focus:border-blue-400"
                      />
                      <input
                        value={q.sample_answer}
                        onChange={(e) =>
                          updateQuestion(idx, "sample_answer", e.target.value)
                        }
                        placeholder={t.aiParser.answerPlaceholder}
                        className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeQuestion(idx)}
                      className="p-2 mt-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 py-4 border-t-2 border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-full text-sm transition-colors border border-slate-200"
          >
            {t.aiParser.cancel}
          </button>
          <button
            type="button"
            onClick={handleAddAll}
            disabled={
              adding || questions.filter((q) => q.text.trim()).length === 0
            }
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-full text-sm transition-colors shadow-md border-b-4 border-emerald-900 flex items-center justify-center gap-2"
          >
            {adding ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Check size={15} />
            )}
            {t.aiParser.addAll}
          </button>
        </div>
      </div>
    </div>
  );
}
