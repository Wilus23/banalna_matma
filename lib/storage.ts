import type { Difficulty, Operation, QuestionAttempt, QuizLog, SelectableGrade } from '@/types/quiz';

export const LOGS_STORAGE_KEY = 'math-quiz-logs-v1';

interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const inMemoryStore = new Map<string, string>();

const memoryAdapter: StorageAdapter = {
  getItem: (key) => inMemoryStore.get(key) ?? null,
  setItem: (key, value) => {
    inMemoryStore.set(key, value);
  },
  removeItem: (key) => {
    inMemoryStore.delete(key);
  }
};

const getAdapter = (): StorageAdapter => {
  if (typeof window === 'undefined') {
    return memoryAdapter;
  }

  try {
    // Fallback keeps the app usable even if localStorage is blocked by browser policy.
    const storage = window.localStorage;
    storage.getItem(LOGS_STORAGE_KEY);
    return storage;
  } catch {
    return memoryAdapter;
  }
};

const OPERATIONS: Operation[] = ['+', '-', '*', '/'];
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const GRADES: SelectableGrade[] = [3, 5, 6, 7, 8];

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isOperationArray = (value: unknown): value is Operation[] => {
  return Array.isArray(value) && value.length > 0 && value.every((item) => OPERATIONS.includes(item as Operation));
};

const isQuestionAttempt = (value: unknown): value is QuestionAttempt => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.prompt === 'string' &&
    (typeof value.answer === 'string' || typeof value.answer === 'number') &&
    typeof value.studentAnswer === 'string' &&
    typeof value.isCorrect === 'boolean' &&
    typeof value.timeMs === 'number' &&
    value.timeMs >= 0
  );
};

const isQuizLog = (value: unknown): value is QuizLog => {
  if (!isObject(value)) {
    return false;
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.createdAt !== 'string' ||
    typeof value.studentName !== 'string' ||
    !GRADES.includes(value.grade as SelectableGrade) ||
    !DIFFICULTIES.includes(value.difficulty as Difficulty) ||
    !isOperationArray(value.operations) ||
    typeof value.questionCount !== 'number' ||
    value.questionCount <= 0 ||
    typeof value.elapsedMs !== 'number' ||
    value.elapsedMs < 0 ||
    typeof value.correct !== 'number' ||
    value.correct < 0 ||
    typeof value.incorrect !== 'number' ||
    value.incorrect < 0 ||
    typeof value.accuracy !== 'number' ||
    value.accuracy < 0 ||
    value.accuracy > 1 ||
    typeof value.bestStreak !== 'number' ||
    value.bestStreak < 0 ||
    typeof value.avgAnswerMs !== 'number' ||
    value.avgAnswerMs < 0 ||
    !Array.isArray(value.questions)
  ) {
    return false;
  }

  if (!value.questions.every((question) => isQuestionAttempt(question))) {
    return false;
  }

  const createdDate = new Date(value.createdAt);
  return !Number.isNaN(createdDate.getTime());
};

const normalizeLog = (log: QuizLog): QuizLog => {
  const sortedOps = [...new Set(log.operations)].sort();

  return {
    ...log,
    studentName: log.studentName.trim(),
    operations: sortedOps,
    accuracy: Math.min(1, Math.max(0, log.accuracy))
  };
};

const readLogs = (): QuizLog[] => {
  const raw = getAdapter().getItem(LOGS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item) => isQuizLog(item)).map((item) => normalizeLog(item));
  } catch {
    return [];
  }
};

const writeLogs = (logs: QuizLog[]): void => {
  const adapter = getAdapter();
  adapter.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
};

export const generateLogId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `log_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
};

export const getLogs = (): QuizLog[] => {
  return readLogs().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const addLog = (log: QuizLog): void => {
  if (!isQuizLog(log)) {
    throw new Error('Nieprawidłowy format wpisu quizu');
  }

  const logs = readLogs();
  logs.push(normalizeLog(log));
  writeLogs(logs);
};

export const clearLogs = (): void => {
  getAdapter().removeItem(LOGS_STORAGE_KEY);
};

export const exportLogs = (): string => {
  return JSON.stringify(getLogs(), null, 2);
};

export const importLogs = (json: string): void => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Nieprawidłowy plik JSON');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Oczekiwano tablicy wpisów quizu');
  }

  const validLogs = parsed.filter((item) => isQuizLog(item)).map((item) => normalizeLog(item));

  if (validLogs.length !== parsed.length) {
    throw new Error('Import zawiera nieprawidłowe wpisy quizu');
  }

  const existing = readLogs();
  const map = new Map<string, QuizLog>();

  existing.forEach((entry) => map.set(entry.id, normalizeLog(entry)));
  validLogs.forEach((entry) => map.set(entry.id, normalizeLog(entry)));

  writeLogs([...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
};
