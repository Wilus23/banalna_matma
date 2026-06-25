import type { Difficulty, Operation, SelectableGrade } from '@/types/quiz';

export const GRADE_OPTIONS: SelectableGrade[] = [3, 5, 6, 7, 8];
export const DIFFICULTY_OPTIONS: Difficulty[] = ['easy', 'medium', 'hard'];
export const OPERATION_OPTIONS: Operation[] = ['+', '-', '*', '/'];
export const QUESTION_COUNT_OPTIONS: Array<5 | 10 | 20> = [5, 10, 20];

export const DEFAULT_SETTINGS = {
  studentName: '',
  grade: 3 as SelectableGrade,
  difficulty: 'easy' as Difficulty,
  operations: ['+', '-'] as Operation[],
  questionCount: 10 as 5 | 10 | 20,
  soundEnabled: true,
  focusMode: false,
  decimalsMode: false,
  allowNegatives: false
};
