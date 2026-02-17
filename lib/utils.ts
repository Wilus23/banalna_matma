import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const normalizeNumericInput = (value: string): string => {
  return value.replace(',', '.').trim();
};

export const parseStudentNumber = (value: string): number | null => {
  const normalized = normalizeNumericInput(value);

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const isAnswerCorrect = (
  expected: string | number,
  studentAnswer: string,
  tolerance = 0.0001
): boolean => {
  if (typeof expected === 'string') {
    return studentAnswer.trim() === expected.trim();
  }

  const parsed = parseStudentNumber(studentAnswer);
  if (parsed === null) {
    return false;
  }

  return Math.abs(parsed - expected) <= tolerance;
};

export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};
