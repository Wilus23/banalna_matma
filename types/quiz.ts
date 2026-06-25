export type Difficulty = 'easy' | 'medium' | 'hard';
export type Operation = '+' | '-' | '*' | '/';

export type SelectableGrade = 3 | 5 | 6 | 7 | 8;
export type GeneratorGrade = SelectableGrade | 4;

export interface QuizSettings {
  studentName: string;
  grade: SelectableGrade;
  difficulty: Difficulty;
  operations: Operation[];
  questionCount: 5 | 10 | 20;
  soundEnabled: boolean;
  focusMode: boolean;
  decimalsMode: boolean;
  allowNegatives: boolean;
}

export interface GeneratedQuestion {
  prompt: string;
  answer: number | string;
  meta: {
    op: Operation;
    a: number;
    b: number;
    grade: GeneratorGrade;
    difficulty: Difficulty;
    pattern: string;
  };
}

export interface QuestionAttempt {
  prompt: string;
  answer: string | number;
  studentAnswer: string;
  isCorrect: boolean;
  timeMs: number;
}

export interface QuizLog {
  id: string;
  createdAt: string;
  studentName: string;
  grade: SelectableGrade;
  difficulty: Difficulty;
  operations: Operation[];
  questionCount: number;
  elapsedMs: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  bestStreak: number;
  avgAnswerMs: number;
  questions: QuestionAttempt[];
}

export interface GenerateQuestionParams {
  grade: GeneratorGrade;
  difficulty: Difficulty;
  ops: Operation[];
  rng?: () => number;
  decimalsMode?: boolean;
  allowNegatives?: boolean;
  biasHarder?: number;
}

export interface GenerateQuizSetParams extends GenerateQuestionParams {
  count: number;
  seed?: number;
}
