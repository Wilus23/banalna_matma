import type { QuizLog, QuizSettings } from '@/types/quiz';

const operationsKey = (operations: string[]): string => {
  return [...operations].sort().join('|');
};

export const settingsSignature = (settings: {
  grade: number;
  difficulty: string;
  operations: string[];
  questionCount: number;
}): string => {
  return [settings.grade, settings.difficulty, operationsKey(settings.operations), settings.questionCount].join('::');
};

export const getLeaderboardEntries = (logs: QuizLog[]) => {
  const bestBySignature = new Map<string, QuizLog>();

  logs.forEach((log) => {
    const signature = settingsSignature(log);
    const existing = bestBySignature.get(signature);

    if (!existing || log.elapsedMs < existing.elapsedMs) {
      bestBySignature.set(signature, log);
    }
  });

  return [...bestBySignature.values()].sort((a, b) => a.elapsedMs - b.elapsedMs);
};

export const getBestForSettings = (logs: QuizLog[], settings: QuizSettings): QuizLog | null => {
  const signature = settingsSignature(settings);

  const matches = logs.filter((log) => settingsSignature(log) === signature);
  if (matches.length === 0) {
    return null;
  }

  return matches.reduce((best, current) => {
    return current.elapsedMs < best.elapsedMs ? current : best;
  });
};
