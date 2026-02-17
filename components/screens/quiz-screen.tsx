'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Timer } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatMs, formatPercent } from '@/lib/format';
import type { GeneratedQuestion, QuizSettings } from '@/types/quiz';

interface QuizScreenProps {
  settings: QuizSettings;
  question: GeneratedQuestion;
  questionIndex: number;
  elapsedMs: number;
  answerInput: string;
  onAnswerInputChange: (value: string) => void;
  onSubmit: () => void;
  feedback: 'correct' | 'incorrect' | null;
  revealedAnswer: string | number | null;
  correct: number;
  incorrect: number;
  streak: number;
  avgAnswerMs: number;
}

const keypadValues = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'];

export const QuizScreen = ({
  settings,
  question,
  questionIndex,
  elapsedMs,
  answerInput,
  onAnswerInputChange,
  onSubmit,
  feedback,
  revealedAnswer,
  correct,
  incorrect,
  streak,
  avgAnswerMs
}: QuizScreenProps) => {
  const reduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (feedback !== null) {
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [questionIndex, feedback]);

  const accuracy = useMemo(() => {
    const total = correct + incorrect;
    return total === 0 ? 0 : correct / total;
  }, [correct, incorrect]);

  const progress = ((questionIndex + 1) / settings.questionCount) * 100;

  const handleKeypadPress = (value: string) => {
    if (feedback) {
      return;
    }

    if (value === '⌫') {
      onAnswerInputChange(answerInput.slice(0, -1));
      return;
    }

    if (value === '.' && (!settings.decimalsMode || answerInput.includes('.'))) {
      return;
    }

    if (value === '-' && (!settings.allowNegatives || answerInput.includes('-') || answerInput.length > 0)) {
      return;
    }

    if (value === '.' && answerInput.length === 0) {
      onAnswerInputChange('0.');
      return;
    }

    onAnswerInputChange(`${answerInput}${value}`);
  };

  const feedbackClass =
    feedback === 'correct'
      ? 'ring-2 ring-emerald-300/80 shadow-[0_0_35px_rgba(72,216,145,0.45)]'
      : feedback === 'incorrect'
        ? 'ring-2 ring-rose-300/80 shadow-[0_0_35px_rgba(255,88,116,0.4)]'
        : '';

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.45fr]">
      <Card className="space-y-6 md:space-y-8">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-cyan-100">
            <span>
              Pytanie {questionIndex + 1}/{settings.questionCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <Timer className="h-4 w-4" />
              {formatMs(elapsedMs)}
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-800/80">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-300"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: reduceMotion ? 0 : 0.35, ease: 'easeOut' }}
            />
          </div>
        </div>

        <motion.div
          className={`rounded-2xl border border-slate-500/30 bg-slate-950/35 px-4 py-10 text-center sm:px-8 ${feedbackClass}`}
          animate={
            reduceMotion
              ? undefined
              : feedback === 'incorrect'
                ? { x: [0, -8, 8, -6, 6, -3, 3, 0] }
                : feedback === 'correct'
                  ? { scale: [1, 1.02, 1] }
                  : { x: 0, scale: 1 }
          }
          transition={{ duration: 0.35 }}
          aria-live="polite"
        >
          <p className="text-[2.1rem] font-extrabold leading-tight tracking-tight text-slate-50 sm:text-6xl md:text-7xl">
            {question.prompt}
          </p>
          {feedback === 'incorrect' && revealedAnswer !== null && (
            <p className="mt-4 text-lg font-semibold text-rose-200">Poprawna odpowiedź: {revealedAnswer}</p>
          )}
        </motion.div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-100" htmlFor="answer-input">
            Twoja odpowiedź
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              ref={inputRef}
              id="answer-input"
              type="text"
              inputMode={settings.decimalsMode ? 'decimal' : 'numeric'}
              value={answerInput}
              onChange={(event) => onAnswerInputChange(event.target.value)}
              placeholder="Wpisz odpowiedź"
              aria-label="Pole odpowiedzi numerycznej"
              autoFocus
              disabled={feedback !== null}
              className="h-14 text-xl"
            />
            <Button type="submit" size="lg" className="h-14 min-w-32 text-lg" disabled={feedback !== null}>
              Zatwierdź
            </Button>
          </div>
        </form>

        <div className="grid grid-cols-4 gap-2 sm:hidden">
          {(settings.allowNegatives ? ['-', ...keypadValues] : keypadValues).map((value) => (
            <Button
              key={value}
              type="button"
              variant="secondary"
              className="h-12 rounded-lg text-lg"
              aria-label={value === '⌫' ? 'Usuń znak' : `Klawisz ${value}`}
              onClick={() => handleKeypadPress(value)}
            >
              {value}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <h3 className="text-2xl font-bold text-slate-100">Statystyki na żywo</h3>

        <div className="space-y-3 rounded-xl border border-slate-500/30 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">Poprawne</span>
            <span className="text-lg font-bold text-emerald-300">{correct}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">Błędne</span>
            <span className="text-lg font-bold text-rose-300">{incorrect}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">Skuteczność</span>
            <span className="text-lg font-bold text-cyan-100">{formatPercent(accuracy)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">Seria</span>
            <span className="text-lg font-bold text-yellow-200">{streak}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">Śr. czas odpowiedzi</span>
            <span className="text-lg font-bold text-slate-100">{formatMs(avgAnswerMs)}</span>
          </div>
        </div>

        <p className="text-sm text-slate-300">
          Wskazówka: naciśnij <span className="rounded bg-slate-800 px-1.5 py-0.5 font-semibold">Enter</span>, aby szybko zatwierdzić.
        </p>
      </Card>
    </div>
  );
};
