'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SetupScreen } from '@/components/screens/setup-screen';
import { QuizScreen } from '@/components/screens/quiz-screen';
import { ResultsScreen } from '@/components/screens/results-screen';
import { DEFAULT_SETTINGS } from '@/lib/constants';
import { generateQuestion } from '@/lib/question-generator';
import { createSeededRng, type RNG } from '@/lib/rng';
import { addLog, generateLogId, getLogs, clearLogs, importLogs } from '@/lib/storage';
import { playSuccessDing } from '@/lib/sound';
import { isAnswerCorrect } from '@/lib/utils';
import type { GeneratedQuestion, QuestionAttempt, QuizLog, QuizSettings } from '@/types/quiz';

type Screen = 'setup' | 'quiz' | 'results';
type FeedbackState = 'correct' | 'incorrect' | null;

const screenVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 }
};

export const MathQuizApp = () => {
  const prefersReducedMotion = useReducedMotion();

  const [screen, setScreen] = useState<Screen>('setup');
  const [settings, setSettings] = useState<QuizSettings>(DEFAULT_SETTINGS);

  const [currentQuestion, setCurrentQuestion] = useState<GeneratedQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answerInput, setAnswerInput] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [revealedAnswer, setRevealedAnswer] = useState<number | string | null>(null);

  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [attempts, setAttempts] = useState<QuestionAttempt[]>([]);

  const [elapsedMs, setElapsedMs] = useState(0);
  const [latestLog, setLatestLog] = useState<QuizLog | null>(null);
  const [logs, setLogs] = useState<QuizLog[]>([]);

  const quizStartRef = useRef(0);
  const questionStartRef = useRef(0);
  const rngRef = useRef<RNG>(Math.random);

  useEffect(() => {
    setLogs(getLogs());
  }, []);

  useEffect(() => {
    if (screen !== 'quiz') {
      return;
    }

    let raf = 0;

    const tick = () => {
      // requestAnimationFrame + performance.now keeps the timer smooth and precise.
      if (quizStartRef.current > 0) {
        setElapsedMs(performance.now() - quizStartRef.current);
      }
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [screen]);

  const averageAnswerMs = useMemo(() => {
    if (attempts.length === 0) {
      return 0;
    }

    return attempts.reduce((sum, item) => sum + item.timeMs, 0) / attempts.length;
  }, [attempts]);

  const startQuiz = (nextSettings: QuizSettings) => {
    const quizSeed = Date.now();
    rngRef.current = createSeededRng(quizSeed);

    const firstQuestion = generateQuestion({
      grade: nextSettings.grade,
      difficulty: nextSettings.difficulty,
      ops: nextSettings.operations,
      rng: rngRef.current,
      decimalsMode: nextSettings.decimalsMode,
      allowNegatives: nextSettings.allowNegatives,
      biasHarder: 0
    });

    setSettings(nextSettings);
    setCurrentQuestion(firstQuestion);
    setQuestionIndex(0);
    setAnswerInput('');
    setFeedback(null);
    setRevealedAnswer(null);
    setCorrect(0);
    setIncorrect(0);
    setStreak(0);
    setBestStreak(0);
    setAttempts([]);
    setElapsedMs(0);
    setLatestLog(null);

    const now = performance.now();
    quizStartRef.current = now;
    questionStartRef.current = now;

    setScreen('quiz');
  };

  const submitAnswer = () => {
    if (!currentQuestion || feedback) {
      return;
    }

    const answerText = answerInput.trim();
    if (!answerText) {
      return;
    }

    const answerIsCorrect = isAnswerCorrect(
      currentQuestion.answer,
      answerText,
      settings.decimalsMode ? 0.01 : 0.0001
    );

    const now = performance.now();
    const timeMs = Math.max(0, now - questionStartRef.current);

    const nextAttempt: QuestionAttempt = {
      prompt: currentQuestion.prompt,
      answer: currentQuestion.answer,
      studentAnswer: answerInput,
      isCorrect: answerIsCorrect,
      timeMs
    };

    const nextAttempts = [...attempts, nextAttempt];
    const nextCorrect = correct + (answerIsCorrect ? 1 : 0);
    const nextIncorrect = incorrect + (answerIsCorrect ? 0 : 1);
    const nextStreak = answerIsCorrect ? streak + 1 : 0;
    const nextBestStreak = Math.max(bestStreak, nextStreak);

    setAttempts(nextAttempts);
    setCorrect(nextCorrect);
    setIncorrect(nextIncorrect);
    setStreak(nextStreak);
    setBestStreak(nextBestStreak);

    if (answerIsCorrect && settings.soundEnabled) {
      playSuccessDing();
    }

    setFeedback(answerIsCorrect ? 'correct' : 'incorrect');
    setRevealedAnswer(answerIsCorrect ? null : currentQuestion.answer);

    const delayMs = answerIsCorrect ? 320 : 900;
    const transitionDelay = prefersReducedMotion ? 120 : delayMs;

    window.setTimeout(() => {
      setCorrect(nextCorrect);
      setIncorrect(nextIncorrect);
      setStreak(nextStreak);
      setBestStreak(nextBestStreak);
      setAttempts(nextAttempts);

      if (questionIndex + 1 >= settings.questionCount) {
        const finishedElapsed = performance.now() - quizStartRef.current;
        const accuracy = nextCorrect / settings.questionCount;
        const avgAnswer =
          nextAttempts.length > 0
            ? nextAttempts.reduce((sum, item) => sum + item.timeMs, 0) / nextAttempts.length
            : 0;

        const log: QuizLog = {
          id: generateLogId(),
          createdAt: new Date().toISOString(),
          studentName: settings.studentName.trim(),
          grade: settings.grade,
          difficulty: settings.difficulty,
          operations: [...settings.operations],
          questionCount: settings.questionCount,
          elapsedMs: finishedElapsed,
          correct: nextCorrect,
          incorrect: nextIncorrect,
          accuracy,
          bestStreak: nextBestStreak,
          avgAnswerMs: avgAnswer,
          questions: nextAttempts
        };

        addLog(log);
        setLatestLog(log);
        setLogs(getLogs());
        setElapsedMs(finishedElapsed);
        setScreen('results');
        return;
      }

      const biasHarder = nextStreak >= 7 ? 0.7 : nextStreak >= 4 ? 0.4 : 0;
      const nextQuestion = generateQuestion({
        grade: settings.grade,
        difficulty: settings.difficulty,
        ops: settings.operations,
        rng: rngRef.current,
        decimalsMode: settings.decimalsMode,
        allowNegatives: settings.allowNegatives,
        biasHarder
      });

      setCurrentQuestion(nextQuestion);
      setQuestionIndex((prev) => prev + 1);
      setAnswerInput('');
      setFeedback(null);
      setRevealedAnswer(null);
      questionStartRef.current = performance.now();
    }, transitionDelay);
  };

  const handlePlayAgain = () => {
    startQuiz(settings);
  };

  const handleNewSetup = () => {
    setScreen('setup');
    setCurrentQuestion(null);
    setQuestionIndex(0);
    setAnswerInput('');
    setFeedback(null);
    setRevealedAnswer(null);
    setCorrect(0);
    setIncorrect(0);
    setStreak(0);
    setBestStreak(0);
    setAttempts([]);
    setElapsedMs(0);
  };

  const handleImport = (json: string) => {
    importLogs(json);
    setLogs(getLogs());
  };

  const handleClearAll = () => {
    clearLogs();
    setLogs([]);
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 md:px-8">
      <AnimatePresence mode="wait">
        <motion.section
          key={screen}
          variants={screenVariants}
          initial={prefersReducedMotion ? false : 'hidden'}
          animate="visible"
          exit={prefersReducedMotion ? undefined : 'exit'}
          transition={{ duration: prefersReducedMotion ? 0 : 0.32, ease: 'easeOut' }}
        >
          {screen === 'setup' && <SetupScreen settings={settings} onStart={startQuiz} />}

          {screen === 'quiz' && currentQuestion && (
            <QuizScreen
              settings={settings}
              question={currentQuestion}
              questionIndex={questionIndex}
              elapsedMs={elapsedMs}
              answerInput={answerInput}
              onAnswerInputChange={setAnswerInput}
              onSubmit={submitAnswer}
              feedback={feedback}
              revealedAnswer={revealedAnswer}
              correct={correct}
              incorrect={incorrect}
              streak={streak}
              avgAnswerMs={averageAnswerMs}
            />
          )}

          {screen === 'results' && latestLog && (
            <ResultsScreen
              settings={settings}
              latestLog={latestLog}
              logs={logs}
              onPlayAgain={handlePlayAgain}
              onNewSetup={handleNewSetup}
              onImport={handleImport}
              onClearAll={handleClearAll}
            />
          )}
        </motion.section>
      </AnimatePresence>
    </main>
  );
};
