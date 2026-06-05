import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../lib/supabase";
import {
  Volume2,
  X,
  CheckCircle2,
  XCircle,
  Trophy,
  RefreshCw,
  Gamepad2,
  Zap,
} from "lucide-react";

interface VocabCard {
  id: string;
  front: string;
  back: string;
  image_url: string | null;
}

interface VocabSet {
  id: string;
  title: string;
  emoji: string;
}

// ─── MATCHING GAME ───────────────────────────────────────────────
interface MatchTile {
  id: string;
  type: "word" | "meaning";
  text: string;
  image_url?: string | null;
  pairId: string;
  matched: boolean;
  flipped: boolean;
}

function MatchingGame({
  cards,
  onClose,
}: {
  cards: VocabCard[];
  onClose: () => void;
}) {
  const [tiles, setTiles] = useState<MatchTile[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [wrongPair, setWrongPair] = useState<[string, string] | null>(null);
  const [moves, setMoves] = useState(0);
  const [finished, setFinished] = useState(false);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  const buildTiles = (cards: VocabCard[]) => {
    const pool = cards.slice(0, 6);
    const wordTiles: MatchTile[] = pool.map((c) => ({
      id: `w-${c.id}`,
      type: "word",
      text: c.front,
      image_url: c.image_url,
      pairId: c.id,
      matched: false,
      flipped: false,
    }));
    const meaningTiles: MatchTile[] = pool.map((c) => ({
      id: `m-${c.id}`,
      type: "meaning",
      text: c.back,
      pairId: c.id,
      matched: false,
      flipped: false,
    }));
    return [...wordTiles, ...meaningTiles].sort(() => Math.random() - 0.5);
  };

  useEffect(() => {
    setTiles(buildTiles(cards));
  }, [cards]);

  useEffect(() => {
    if (finished) return;
    const t = setInterval(
      () => setElapsed(Math.floor((Date.now() - startTime) / 1000)),
      500,
    );
    return () => clearInterval(t);
  }, [finished, startTime]);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  };

  const handleTileClick = (tileId: string) => {
    const tile = tiles.find((t) => t.id === tileId);
    if (!tile || tile.matched || tile.flipped) return;
    if (wrongPair) return;

    if (tile.type === "word") speak(tile.text);

    if (!selected) {
      setSelected(tileId);
      setTiles((prev) =>
        prev.map((t) => (t.id === tileId ? { ...t, flipped: true } : t)),
      );
      return;
    }

    const selTile = tiles.find((t) => t.id === selected)!;
    setMoves((m) => m + 1);

    if (selTile.pairId === tile.pairId && selTile.type !== tile.type) {
      // Match!
      setTiles((prev) =>
        prev.map((t) =>
          t.pairId === tile.pairId ? { ...t, matched: true, flipped: true } : t,
        ),
      );
      setSelected(null);
      setTimeout(() => {
        setTiles((prev) => {
          const allDone = prev.every((t) => t.matched);
          if (allDone) setFinished(true);
          return prev;
        });
      }, 300);
    } else {
      // Wrong
      setTiles((prev) =>
        prev.map((t) => (t.id === tileId ? { ...t, flipped: true } : t)),
      );
      setWrongPair([selected, tileId]);
      setTimeout(() => {
        setTiles((prev) =>
          prev.map((t) =>
            t.id === selected || t.id === tileId ? { ...t, flipped: false } : t,
          ),
        );
        setSelected(null);
        setWrongPair(null);
      }, 900);
    }
  };

  const restart = () => {
    setTiles(buildTiles(cards));
    setSelected(null);
    setWrongPair(null);
    setMoves(0);
    setFinished(false);
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4">
          <div>
            <h3 className="font-black text-slate-800 text-2xl">
              🃏 Matching Game
            </h3>
            <p className="text-sm font-bold text-slate-400 mt-0.5">
              {moves} moves · {fmt(elapsed)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={restart}
              className="p-2.5 hover:bg-slate-100 rounded-full text-slate-400"
            >
              <RefreshCw size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-slate-100 rounded-full text-slate-400"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="px-6 pb-8">
          {finished ? (
            <div className="py-12 flex flex-col items-center gap-4">
              <div className="text-8xl animate-bounce">🏆</div>
              <p className="font-black text-3xl text-amber-600">Well done!</p>
              <p className="text-slate-500 font-bold">
                {moves} moves · {fmt(elapsed)}
              </p>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={restart}
                  className="px-8 py-4 bg-[#1E88E5] text-white font-black text-lg rounded-2xl shadow-md border-b-4 border-blue-900 active:scale-95 transition-all"
                >
                  Play again 🔄
                </button>
                <button
                  onClick={onClose}
                  className="px-8 py-4 bg-slate-100 text-slate-700 font-black text-lg rounded-2xl active:scale-95 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {tiles.map((tile) => {
                const isSelected = selected === tile.id;
                const isWrong = wrongPair?.includes(tile.id);
                return (
                  <button
                    key={tile.id}
                    onClick={() => handleTileClick(tile.id)}
                    disabled={tile.matched}
                    className={`
                      h-28 rounded-2xl font-extrabold text-sm transition-all duration-300 flex flex-col items-center justify-center gap-2 p-3 border-3 select-none
                      ${
                        tile.matched
                          ? "bg-emerald-100 border-emerald-300 text-emerald-700 scale-95 opacity-60"
                          : tile.flipped
                            ? isWrong
                              ? "bg-rose-100 border-rose-300 text-rose-700 scale-95"
                              : isSelected
                                ? "bg-blue-100 border-[#1E88E5] text-[#1E88E5] scale-105 shadow-md"
                                : "bg-blue-50 border-blue-200 text-slate-700"
                            : "bg-gradient-to-br from-[#1E88E5] to-[#42A5F5] border-blue-700 text-white hover:scale-105 hover:shadow-md active:scale-95"
                      }
                    `}
                  >
                    {tile.flipped || tile.matched ? (
                      <>
                        {tile.type === "word" && tile.image_url && (
                          <img
                            src={tile.image_url}
                            alt=""
                            className="w-12 h-12 object-cover rounded-xl"
                          />
                        )}
                        <span className="text-center text-sm leading-tight line-clamp-2 font-black">
                          {tile.text}
                        </span>
                      </>
                    ) : (
                      <span className="text-4xl">?</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── QUIZ GAME ───────────────────────────────────────────────────
function QuizGame({
  cards,
  onClose,
}: {
  cards: VocabCard[];
  onClose: () => void;
}) {
  const TOTAL = Math.min(10, cards.length);
  const [questions] = useState(() =>
    cards.sort(() => Math.random() - 0.5).slice(0, TOTAL),
  );
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState<VocabCard[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [streak, setStreak] = useState(0);

  const current = questions[index];

  const buildChoices = (idx: number) => {
    const correct = questions[idx];
    const pool = cards
      .filter((c) => c.id !== correct.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    return [...pool, correct].sort(() => Math.random() - 0.5);
  };

  useEffect(() => {
    setChoices(buildChoices(index));
    setSelected(null);
    setTimeLeft(10);
  }, [index]);

  useEffect(() => {
    if (selected || finished) return;
    if (timeLeft <= 0) {
      handleAnswer(null);
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, selected, finished]);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  };

  useEffect(() => {
    if (current) speak(current.front);
  }, [index]);

  const handleAnswer = (cardId: string | null) => {
    if (selected) return;
    setSelected(cardId ?? "__timeout__");
    const correct = cardId === current.id;
    if (correct) {
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
    setTimeout(() => {
      if (index + 1 >= TOTAL) setFinished(true);
      else setIndex((i) => i + 1);
    }, 1000);
  };

  const restart = () => {
    setIndex(0);
    setScore(0);
    setStreak(0);
    setSelected(null);
    setFinished(false);
    setTimeLeft(10);
  };

  const pct = Math.round((score / TOTAL) * 100);
  const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : pct >= 30 ? 1 : 0;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-3">
          <div>
            <h3 className="font-black text-slate-800 text-2xl">
              ⚡ Quick Quiz
            </h3>
            {!finished && (
              <p className="text-sm font-bold text-slate-400 mt-0.5">
                {index + 1}/{TOTAL} · Score: {score}
                {streak >= 2 && (
                  <span className="ml-2 text-orange-500">
                    🔥 {streak}x streak!
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-slate-100 rounded-full text-slate-400"
          >
            <X size={22} />
          </button>
        </div>

        <div className="px-6 pb-8">
          {finished ? (
            <div className="py-10 flex flex-col items-center gap-4">
              <div className="text-8xl">
                {stars === 3
                  ? "🏆"
                  : stars === 2
                    ? "🥈"
                    : stars === 1
                      ? "🥉"
                      : "😅"}
              </div>
              <p className="font-black text-3xl text-slate-800">
                {"⭐".repeat(stars)}
                {"☆".repeat(3 - stars)}
              </p>
              <p className="font-black text-2xl text-[#1E88E5]">
                {score}/{TOTAL} correct
              </p>
              <p className="text-slate-400 font-bold">
                {pct >= 90
                  ? "Amazing! You're a star! 🌟"
                  : pct >= 60
                    ? "Good job! Keep it up! 💪"
                    : "Keep practising! You got this! 🥰"}
              </p>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={restart}
                  className="px-8 py-4 bg-[#1E88E5] text-white font-black text-lg rounded-2xl shadow-md border-b-4 border-blue-900 active:scale-95 transition-all"
                >
                  Try again 🔄
                </button>
                <button
                  onClick={onClose}
                  className="px-8 py-4 bg-slate-100 text-slate-700 font-black text-lg rounded-2xl active:scale-95 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Progress bar */}
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#1E88E5] to-[#42A5F5] rounded-full transition-all duration-300"
                  style={{ width: `${(index / TOTAL) * 100}%` }}
                />
              </div>

              {/* Timer */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {Array.from({ length: TOTAL }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2.5 h-2.5 rounded-full ${i < index ? "bg-emerald-400" : i === index ? "bg-[#1E88E5]" : "bg-slate-200"}`}
                    />
                  ))}
                </div>
                <div
                  className={`px-4 py-1.5 rounded-full font-black text-base ${timeLeft <= 3 ? "bg-rose-100 text-rose-600 animate-pulse" : "bg-slate-100 text-slate-600"}`}
                >
                  ⏱ {timeLeft}s
                </div>
              </div>

              {/* Question card */}
              <div className="bg-gradient-to-br from-[#E3F2FD] to-[#BBDEFB] border-4 border-[#90CAF9] rounded-[1.5rem] p-6 flex flex-col items-center gap-4 min-h-[160px] justify-center">
                {current.image_url && (
                  <img
                    src={current.image_url}
                    alt=""
                    className="w-28 h-28 object-cover rounded-2xl shadow-md border-2 border-white"
                  />
                )}
                <p className="text-4xl font-black text-[#1E88E5] text-center">
                  {current.front}
                </p>
                <button
                  onClick={() => speak(current.front)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1E88E5]/10 hover:bg-[#1E88E5]/20 rounded-full transition-colors"
                >
                  <Volume2 size={18} className="text-[#1E88E5]" />
                  <span className="text-sm font-bold text-[#1E88E5]">
                    Listen
                  </span>
                </button>
                <p className="text-sm font-bold text-[#1E88E5]/60">
                  What does this mean?
                </p>
              </div>

              {/* Choices */}
              <div className="grid grid-cols-2 gap-3">
                {choices.map((choice) => {
                  const isCorrect = choice.id === current.id;
                  const isSelected = selected === choice.id;
                  const isTimeout = selected === "__timeout__";
                  let style =
                    "bg-white border-2 border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50";
                  if (selected) {
                    if (isCorrect)
                      style =
                        "bg-emerald-100 border-emerald-400 text-emerald-800";
                    else if (isSelected)
                      style = "bg-rose-100 border-rose-400 text-rose-700";
                    else
                      style =
                        "bg-white border-slate-200 text-slate-400 opacity-50";
                  }
                  return (
                    <button
                      key={choice.id}
                      onClick={() => handleAnswer(choice.id)}
                      disabled={!!selected}
                      className={`h-20 rounded-2xl font-extrabold text-base transition-all active:scale-95 border-3 flex items-center justify-center gap-2 px-4 ${style}`}
                    >
                      {selected && isCorrect && (
                        <CheckCircle2
                          size={20}
                          className="text-emerald-600 shrink-0"
                        />
                      )}
                      {selected && isSelected && !isCorrect && (
                        <XCircle size={20} className="text-rose-500 shrink-0" />
                      )}
                      <span className="line-clamp-2 text-center">
                        {choice.back}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── WORD SCRAMBLE ───────────────────────────────────────────────
function ScrambleGame({
  cards,
  onClose,
}: {
  cards: VocabCard[];
  onClose: () => void;
}) {
  const pool = cards.filter((c) => c.front.length >= 3 && c.front.length <= 10);
  const [index, setIndex] = useState(0);
  const [scrambled, setScrambled] = useState<string[]>([]);
  const [answer, setAnswer] = useState<string[]>([]);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const TOTAL = Math.min(8, pool.length);
  const [questions] = useState(() =>
    pool.sort(() => Math.random() - 0.5).slice(0, TOTAL),
  );

  const current = questions[index];

  const buildScramble = (word: string) => {
    const letters = word.toUpperCase().split("");
    // ensure scramble differs from original
    let shuffled = [...letters].sort(() => Math.random() - 0.5);
    let tries = 0;
    while (shuffled.join("") === letters.join("") && tries < 10) {
      shuffled = [...letters].sort(() => Math.random() - 0.5);
      tries++;
    }
    return shuffled;
  };

  useEffect(() => {
    if (!current) return;
    setScrambled(buildScramble(current.front));
    setAnswer([]);
    setResult(null);
  }, [index]);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  };

  const handlePickLetter = (i: number) => {
    if (result) return;
    const letter = scrambled[i];
    setAnswer((prev) => [...prev, letter]);
    setScrambled((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleRemoveLetter = (i: number) => {
    if (result) return;
    const letter = answer[i];
    setAnswer((prev) => prev.filter((_, idx) => idx !== i));
    setScrambled((prev) => [...prev, letter]);
  };

  const checkAnswer = () => {
    const correct = answer.join("") === current.front.toUpperCase();
    setResult(correct ? "correct" : "wrong");
    if (correct) {
      setScore((s) => s + 1);
      speak(current.front);
    }
    setTimeout(() => {
      if (index + 1 >= TOTAL) setFinished(true);
      else setIndex((i) => i + 1);
    }, 1200);
  };

  const restart = () => {
    setIndex(0);
    setScore(0);
    setAnswer([]);
    setResult(null);
    setFinished(false);
  };

  const pct = Math.round((score / TOTAL) * 100);
  const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : pct >= 30 ? 1 : 0;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl">
        <div className="flex items-center justify-between px-7 pt-6 pb-3">
          <div>
            <h3 className="font-black text-slate-800 text-2xl">
              🔤 Word Scramble
            </h3>
            {!finished && (
              <p className="text-sm font-bold text-slate-400 mt-0.5">
                {index + 1}/{TOTAL} · Score: {score}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-slate-100 rounded-full text-slate-400"
          >
            <X size={22} />
          </button>
        </div>

        <div className="px-6 pb-8">
          {finished ? (
            <div className="py-10 flex flex-col items-center gap-4">
              <div className="text-8xl">
                {stars === 3
                  ? "🏆"
                  : stars === 2
                    ? "🥈"
                    : stars === 1
                      ? "🥉"
                      : "😅"}
              </div>
              <p className="font-black text-3xl text-slate-800">
                {"⭐".repeat(stars)}
                {"☆".repeat(3 - stars)}
              </p>
              <p className="font-black text-2xl text-[#1E88E5]">
                {score}/{TOTAL} correct
              </p>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={restart}
                  className="px-8 py-4 bg-[#1E88E5] text-white font-black text-lg rounded-2xl shadow-md border-b-4 border-blue-900 active:scale-95 transition-all"
                >
                  Try again 🔄
                </button>
                <button
                  onClick={onClose}
                  className="px-8 py-4 bg-slate-100 text-slate-700 font-black text-lg rounded-2xl active:scale-95 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Progress */}
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-300"
                  style={{ width: `${(index / TOTAL) * 100}%` }}
                />
              </div>

              {/* Hint: meaning + image */}
              <div
                className={`border-4 rounded-[1.5rem] p-5 flex flex-col items-center gap-3 min-h-[140px] justify-center transition-colors ${result === "correct" ? "bg-emerald-50 border-emerald-300" : result === "wrong" ? "bg-rose-50 border-rose-300" : "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200"}`}
              >
                {current.image_url && (
                  <img
                    src={current.image_url}
                    alt=""
                    className="w-24 h-24 object-cover rounded-2xl shadow-md border-2 border-white"
                  />
                )}
                <p className="text-2xl font-black text-emerald-700 text-center">
                  {current.back}
                </p>
                <p className="text-sm font-bold text-emerald-500/70">
                  Arrange the letters to spell the English word
                </p>
                {result === "correct" && (
                  <p className="text-emerald-600 font-black text-lg animate-bounce">
                    ✅ Correct!
                  </p>
                )}
                {result === "wrong" && (
                  <p className="text-rose-500 font-black text-lg">
                    ❌ Answer:{" "}
                    <span className="text-rose-700">
                      {current.front.toUpperCase()}
                    </span>
                  </p>
                )}
              </div>

              {/* Answer slots */}
              <div className="flex justify-center gap-2 flex-wrap min-h-[56px]">
                {answer.map((letter, i) => (
                  <button
                    key={i}
                    onClick={() => handleRemoveLetter(i)}
                    disabled={!!result}
                    className="w-12 h-12 rounded-xl bg-[#1E88E5] text-white font-black text-lg shadow-md border-b-4 border-blue-900 active:scale-95 transition-all disabled:opacity-70"
                  >
                    {letter}
                  </button>
                ))}
                {answer.length === 0 && !result && (
                  <p className="text-slate-300 font-bold text-sm self-center">
                    Tap letters below...
                  </p>
                )}
              </div>

              {/* Scrambled letters */}
              <div className="flex justify-center gap-2 flex-wrap min-h-[56px]">
                {scrambled.map((letter, i) => (
                  <button
                    key={i}
                    onClick={() => handlePickLetter(i)}
                    disabled={!!result}
                    className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-lg border-b-4 border-slate-300 active:scale-95 transition-all disabled:opacity-40"
                  >
                    {letter}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setAnswer([]);
                    setScrambled(buildScramble(current.front));
                  }}
                  disabled={!!result}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl text-sm transition-colors disabled:opacity-40"
                >
                  Reset ↺
                </button>
                <button
                  onClick={checkAnswer}
                  disabled={answer.length !== current.front.length || !!result}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl text-sm shadow-md border-b-4 border-emerald-800 active:scale-95 transition-all disabled:opacity-40"
                >
                  Check ✓
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
// ─── GAMES TAB ───────────────────────────────────────────────────
export function GamesTab({ studentAge }: { studentAge: number }) {
  const [sets, setSets] = useState<VocabSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSet, setSelectedSet] = useState<VocabSet | null>(null);
  const [cards, setCards] = useState<VocabCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [activeGame, setActiveGame] = useState<
    "matching" | "quiz" | "scramble" | null
  >(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const ageGroup = studentAge <= 5 ? "kindergarten" : "primary";
      const { data } = await supabase
        .from("vocabulary_sets")
        .select("id, title, emoji, vocabulary_cards(id)")
        .or(`age_group.eq.all,age_group.eq.${ageGroup}`)
        .order("created_at", { ascending: false });
      setSets(
        (data || [])
          .filter((s: any) => (s.vocabulary_cards?.length ?? 0) >= 4)
          .map((s: any) => ({ id: s.id, title: s.title, emoji: s.emoji })),
      );
      setLoading(false);
    };
    fetch();
  }, [studentAge]);

  const handleSelectSet = async (set: VocabSet) => {
    setSelectedSet(set);
    setCardsLoading(true);
    const { data } = await supabase
      .from("vocabulary_cards")
      .select("id, front, back, image_url")
      .eq("set_id", set.id)
      .order("order_index");
    setCards(data || []);
    setCardsLoading(false);
  };

  const GAMES = [
    {
      id: "matching" as const,
      emoji: "🃏",
      name: "Matching Game",
      desc: "Match English words with their meanings",
      color: "from-violet-100 to-purple-100 border-violet-200",
      btn: "bg-violet-500 hover:bg-violet-600 border-violet-800",
      min: 4,
    },
    {
      id: "quiz" as const,
      emoji: "⚡",
      name: "Quick Quiz",
      desc: "10-second challenge — pick the right meaning!",
      color: "from-amber-100 to-orange-100 border-amber-200",
      btn: "bg-amber-500 hover:bg-amber-600 border-amber-800",
      min: 4,
    },
    {
      id: "scramble" as const,
      emoji: "🔤",
      name: "Word Scramble",
      desc: "Rearrange the letters to spell the word!",
      color: "from-emerald-100 to-teal-100 border-emerald-200",
      btn: "bg-emerald-500 hover:bg-emerald-600 border-emerald-800",
      min: 3,
    },
  ];

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[2rem] border-3 border-white shadow-sm animate-pulse">
        <div className="h-6 w-32 bg-slate-100 rounded-xl mb-4" />
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[2rem] border-3 border-white shadow-sm space-y-5">
      <div>
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <Gamepad2 size={22} className="text-violet-500" /> Games
        </h2>
        <p className="text-sm font-bold text-slate-500 mt-1">
          Choose a vocabulary set and play!
        </p>
      </div>

      {sets.length === 0 ? (
        <div className="py-12 text-center text-slate-400 font-bold rounded-2xl border-2 border-dashed border-slate-200">
          No vocabulary sets available yet.
        </div>
      ) : (
        <>
          {/* Set picker */}
          <div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
              Select a set
            </p>
            <div className="flex flex-wrap gap-2">
              {sets.map((set) => (
                <button
                  key={set.id}
                  onClick={() => handleSelectSet(set)}
                  className={`px-4 py-2 rounded-xl border-2 font-extrabold text-sm flex items-center gap-2 transition-all active:scale-95 ${
                    selectedSet?.id === set.id
                      ? "bg-[#E3F2FD] border-[#1E88E5] text-[#1E88E5] shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:border-blue-200"
                  }`}
                >
                  {set.emoji} {set.title}
                </button>
              ))}
            </div>
          </div>

          {/* Game cards */}
          {selectedSet && (
            <div className="space-y-3">
              {cardsLoading ? (
                <div className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
              ) : cards.length < 4 ? (
                <p className="text-sm font-bold text-slate-400 text-center py-4">
                  Need at least 4 cards to play.
                </p>
              ) : (
                GAMES.map((game) => (
                  <div
                    key={game.id}
                    className={`bg-gradient-to-r ${game.color} border-2 rounded-2xl p-4 flex items-center gap-4`}
                  >
                    <span className="text-4xl">{game.emoji}</span>
                    <div className="flex-1">
                      <p className="font-black text-slate-800">{game.name}</p>
                      <p className="text-xs font-bold text-slate-500 mt-0.5">
                        {game.desc}
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveGame(game.id)}
                      className={`shrink-0 px-4 py-2.5 ${game.btn} text-white font-black rounded-xl text-sm border-b-4 active:scale-95 transition-all shadow-md`}
                    >
                      Play!
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {activeGame === "matching" && selectedSet && cards.length >= 4 && (
        <MatchingGame cards={cards} onClose={() => setActiveGame(null)} />
      )}
      {activeGame === "quiz" && selectedSet && cards.length >= 4 && (
        <QuizGame cards={cards} onClose={() => setActiveGame(null)} />
      )}
      {activeGame === "scramble" && selectedSet && cards.length >= 3 && (
        <ScrambleGame cards={cards} onClose={() => setActiveGame(null)} />
      )}
    </div>
  );
}
