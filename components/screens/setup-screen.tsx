'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ToggleChip } from '@/components/ui/toggle-chip';
import {
  DEFAULT_SETTINGS,
  DIFFICULTY_OPTIONS,
  GRADE_OPTIONS,
  OPERATION_OPTIONS,
  QUESTION_COUNT_OPTIONS
} from '@/lib/constants';
import { generateQuizSet } from '@/lib/question-generator';
import type { Operation, QuizSettings } from '@/types/quiz';

interface SetupScreenProps {
  settings: QuizSettings;
  onStart: (settings: QuizSettings) => void;
}

const difficultyLabel: Record<QuizSettings['difficulty'], string> = {
  easy: 'Łatwy',
  medium: 'Średni',
  hard: 'Trudny'
};

const operationLabel: Record<Operation, string> = {
  '+': 'Dodawanie',
  '-': 'Odejmowanie',
  '*': 'Mnożenie',
  '/': 'Dzielenie'
};

const operationSymbol: Record<Operation, string> = {
  '+': '+',
  '-': '-',
  '*': '×',
  '/': '÷'
};

const createUpdatedForGrade = (current: QuizSettings, grade: QuizSettings['grade']): QuizSettings => {
  const nextOperations =
    current.operations.length > 0
      ? current.operations
      : grade === 3
        ? (['+', '-'] as Operation[])
        : DEFAULT_SETTINGS.operations;

  return {
    ...current,
    grade,
    operations: nextOperations,
    decimalsMode: grade >= 6 ? current.decimalsMode : false,
    allowNegatives: grade >= 7 ? (current.grade >= 7 ? current.allowNegatives : true) : false
  };
};

const buildSamples = (settings: QuizSettings) => {
  try {
    return generateQuizSet({
      count: 100,
      grade: settings.grade,
      difficulty: settings.difficulty,
      ops: settings.operations,
      decimalsMode: settings.decimalsMode,
      allowNegatives: settings.allowNegatives
    });
  } catch {
    return [];
  }
};

export const SetupScreen = ({ settings, onStart }: SetupScreenProps) => {
  const reduceMotion = useReducedMotion();

  const [draft, setDraft] = useState<QuizSettings>(settings);
  const [showSamples, setShowSamples] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const canStart = draft.studentName.trim().length > 0 && draft.operations.length > 0;
  const samples = useMemo(() => {
    if (!showSamples || process.env.NODE_ENV === 'production') {
      return [];
    }

    return buildSamples(draft);
  }, [draft, showSamples]);

  const updateDraft = (patch: Partial<QuizSettings>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const toggleOperation = (operation: Operation) => {
    setDraft((prev) => {
      const hasOperation = prev.operations.includes(operation);
      const nextOperations = hasOperation
        ? prev.operations.filter((item) => item !== operation)
        : [...prev.operations, operation];

      return {
        ...prev,
        operations: nextOperations
      };
    });
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <Card className="p-6 md:p-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
            <Sparkles className="h-4 w-4" />
            Arena Szybkiej Matematyki
          </div>
          <CardTitle className="text-3xl leading-tight md:text-5xl">Gotowi, start, liczymy.</CardTitle>
          <CardDescription className="max-w-3xl text-base text-slate-200 md:text-lg">
            Wybierz ustawienia ucznia, działania i rozpocznij szybki quiz matematyczny.
          </CardDescription>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="space-y-6">
          <section className="space-y-2">
            <label className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-100" htmlFor="student-name">
              Imię ucznia
            </label>
            <Input
              id="student-name"
              placeholder="Wpisz imię"
              aria-label="Imię ucznia"
              value={draft.studentName}
              onChange={(event) => updateDraft({ studentName: event.target.value })}
              autoComplete="off"
            />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-100">Klasa / Poziom</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {GRADE_OPTIONS.map((grade) => {
                const active = draft.grade === grade;
                return (
                  <motion.button
                    key={grade}
                    type="button"
                    whileHover={reduceMotion ? undefined : { y: -2 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                    className={`rounded-xl border px-4 py-4 text-lg font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                      active
                        ? 'border-cyan-200/70 bg-cyan-400/20 text-cyan-50'
                        : 'border-slate-500/40 bg-slate-900/60 text-slate-200 hover:bg-slate-800/70'
                    }`}
                    aria-pressed={active}
                    aria-label={`Wybierz klasę ${grade}`}
                    onClick={() => setDraft((prev) => createUpdatedForGrade(prev, grade))}
                  >
                    {grade}
                  </motion.button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-100">Poziom trudności</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {DIFFICULTY_OPTIONS.map((difficulty) => {
                const active = draft.difficulty === difficulty;
                return (
                  <ToggleChip
                    key={difficulty}
                    active={active}
                    className="h-14 text-lg"
                    aria-label={`Wybierz poziom ${difficultyLabel[difficulty]}`}
                    onClick={() => updateDraft({ difficulty })}
                  >
                    {difficultyLabel[difficulty]}
                  </ToggleChip>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-100">Działania</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {OPERATION_OPTIONS.map((operation) => {
                const active = draft.operations.includes(operation);

                return (
                  <ToggleChip
                    key={operation}
                    active={active}
                    className="h-16 items-center justify-center text-center"
                    aria-label={`Przełącz ${operationLabel[operation]}`}
                    onClick={() => toggleOperation(operation)}
                  >
                    <span className="block text-xl">{operationSymbol[operation]}</span>
                    <span className="block text-sm font-semibold">{operationLabel[operation]}</span>
                  </ToggleChip>
                );
              })}
            </div>
            {draft.operations.length === 0 && (
              <p className="text-sm font-medium text-rose-300">Wybierz co najmniej jedno działanie.</p>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-100">Liczba pytań</h3>
            <div className="grid grid-cols-3 gap-3">
              {QUESTION_COUNT_OPTIONS.map((questionCount) => {
                const active = draft.questionCount === questionCount;
                return (
                  <ToggleChip
                    key={questionCount}
                    active={active}
                    className="h-14 text-lg"
                    aria-label={`Ustaw ${questionCount} pytań`}
                    onClick={() => updateDraft({ questionCount })}
                  >
                    {questionCount}
                  </ToggleChip>
                );
              })}
            </div>
          </section>
        </Card>

        <Card className="space-y-5">
          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-slate-50">Opcje trybu</h3>
            <p className="text-sm text-slate-300">Dźwięk, tryb skupienia i opcje zależne od klasy.</p>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-500/30 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Dźwięk odpowiedzi</p>
                <p className="text-sm text-slate-300">Krótki dźwięk po poprawnej odpowiedzi.</p>
              </div>
              <Switch
                label="Włącz dźwięk odpowiedzi"
                checked={draft.soundEnabled}
                onCheckedChange={(checked) => updateDraft({ soundEnabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Tryb skupienia</p>
                <p className="text-sm text-slate-300">Ukryj historię i ranking na ekranie wyników.</p>
              </div>
              <Switch
                label="Włącz tryb skupienia"
                checked={draft.focusMode}
                onCheckedChange={(checked) => updateDraft({ focusMode: checked })}
              />
            </div>

            {draft.grade >= 6 && (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Tryb liczb dziesiętnych</p>
                  <p className="text-sm text-slate-300">Włącz pytania z 1-2 miejscami po przecinku.</p>
                </div>
                <Switch
                  label="Włącz tryb liczb dziesiętnych"
                  checked={draft.decimalsMode}
                  onCheckedChange={(checked) => updateDraft({ decimalsMode: checked })}
                />
              </div>
            )}

            {draft.grade >= 7 && (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Liczby ujemne</p>
                  <p className="text-sm text-slate-300">Włącz pytania z liczbami ujemnymi.</p>
                </div>
                <Switch
                  label="Zezwól na liczby ujemne"
                  checked={draft.allowNegatives}
                  onCheckedChange={(checked) => updateDraft({ allowNegatives: checked })}
                />
              </div>
            )}
          </div>

          <Button
            className="h-14 w-full text-lg"
            size="lg"
            disabled={!canStart}
            aria-label="Rozpocznij quiz"
            onClick={() => onStart(draft)}
          >
            Rozpocznij quiz
          </Button>

          {process.env.NODE_ENV !== 'production' && (
            <div className="space-y-3 rounded-xl border border-slate-500/30 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Podgląd deweloperski</p>
                  <p className="text-sm text-slate-300">Losowy podgląd 100 wygenerowanych pytań dla bieżących ustawień.</p>
                </div>
                <Button
                  variant="secondary"
                  aria-label="Przełącz podgląd pytań"
                  onClick={() => setShowSamples((prev) => !prev)}
                >
                  {showSamples ? 'Ukryj' : 'Pokaż'}
                </Button>
              </div>

              {showSamples && (
                <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-500/30 bg-slate-950/50 p-3 text-sm">
                  {samples.map((sample, index) => (
                    <p key={`${sample.prompt}-${index}`} className="font-mono text-slate-200">
                      {index + 1}. {sample.prompt} {sample.answer}
                    </p>
                  ))}
                  {samples.length === 0 && <p className="text-slate-300">Nie udało się wygenerować zestawu podglądu.</p>}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
