import { describe, expect, it } from 'vitest';
import { generateQuestion, generateQuizSet } from '@/lib/question-generator';
import { createSeededRng } from '@/lib/rng';
import type { Difficulty, Operation } from '@/types/quiz';

const grade3Difficulties: Difficulty[] = ['easy', 'medium', 'hard'];

describe('question generator - grade 3 safety and constraints', () => {
  it('keeps grade 3 easy addition within [0..30], sum <= 60', () => {
    const rng = createSeededRng(123);

    for (let index = 0; index < 1000; index += 1) {
      const question = generateQuestion({
        grade: 3,
        difficulty: 'easy',
        ops: ['+'],
        rng
      });

      expect(question.meta.a).toBeGreaterThanOrEqual(0);
      expect(question.meta.a).toBeLessThanOrEqual(30);
      expect(question.meta.b).toBeGreaterThanOrEqual(0);
      expect(question.meta.b).toBeLessThanOrEqual(30);
      expect(question.meta.a + question.meta.b).toBeLessThanOrEqual(60);
      expect(question.answer).toBe(question.meta.a + question.meta.b);
    }
  });

  it('keeps grade 3 subtraction non-negative and a >= b', () => {
    const rng = createSeededRng(333);

    for (let index = 0; index < 1500; index += 1) {
      const difficulty = grade3Difficulties[index % grade3Difficulties.length];
      const question = generateQuestion({
        grade: 3,
        difficulty,
        ops: ['-'],
        rng
      });

      expect(question.meta.a).toBeGreaterThanOrEqual(question.meta.b);
      expect(question.answer).toBe(question.meta.a - question.meta.b);
      expect(Number(question.answer)).toBeGreaterThanOrEqual(0);

      if (difficulty === 'easy') {
        expect(question.meta.a).toBeLessThanOrEqual(60);
      }

      if (difficulty === 'medium') {
        expect(question.meta.a).toBeLessThanOrEqual(300);
      }

      if (difficulty === 'hard') {
        expect(question.meta.a).toBeLessThanOrEqual(1000);
      }
    }
  });

  it('keeps grade 3 division exact and within expected dividend ranges', () => {
    const rng = createSeededRng(98765);

    for (let index = 0; index < 1200; index += 1) {
      const difficulty = grade3Difficulties[index % grade3Difficulties.length];
      const question = generateQuestion({
        grade: 3,
        difficulty,
        ops: ['/'],
        rng
      });

      const dividend = question.meta.a;
      const divisor = question.meta.b;
      const answer = Number(question.answer);

      expect(divisor).not.toBe(0);
      expect(dividend % divisor).toBe(0);
      expect(answer).toBe(dividend / divisor);
      expect(answer).toBeGreaterThanOrEqual(0);

      if (difficulty === 'easy') {
        expect(divisor).toBeGreaterThanOrEqual(2);
        expect(divisor).toBeLessThanOrEqual(10);
        expect(answer).toBeLessThanOrEqual(10);
      }

      if (difficulty === 'medium') {
        expect(dividend).toBeLessThanOrEqual(100);
      }

      if (difficulty === 'hard') {
        expect(dividend).toBeLessThanOrEqual(200);
      }
    }
  });

  it('keeps grade 3 medium multiplication at result <= 100', () => {
    const rng = createSeededRng(4567);

    for (let index = 0; index < 1000; index += 1) {
      const question = generateQuestion({
        grade: 3,
        difficulty: 'medium',
        ops: ['*'],
        rng
      });

      expect(question.meta.a * question.meta.b).toBeLessThanOrEqual(100);
      expect(question.answer).toBe(question.meta.a * question.meta.b);
    }
  });

  it('never adds leading or trailing spaces in prompts', () => {
    const rng = createSeededRng(1001);
    const ops: Operation[] = ['+', '-', '*', '/'];

    for (let index = 0; index < 200; index += 1) {
      const question = generateQuestion({
        grade: 3,
        difficulty: grade3Difficulties[index % grade3Difficulties.length],
        ops,
        rng
      });

      expect(question.prompt).toBe(question.prompt.trim());
      expect(question.prompt.endsWith('=')).toBe(true);
    }
  });
});

describe('question generator - global safety and determinism', () => {
  it('never divides by zero across grades and difficulties', () => {
    const rng = createSeededRng(456789);

    const grades = [3, 5, 6, 7, 8] as const;
    const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];

    grades.forEach((grade) => {
      difficulties.forEach((difficulty) => {
        for (let index = 0; index < 100; index += 1) {
          const question = generateQuestion({
            grade,
            difficulty,
            ops: ['/'],
            rng,
            decimalsMode: grade >= 6 && difficulty !== 'easy',
            allowNegatives: grade >= 7
          });

          expect(question.meta.b).not.toBe(0);
          expect(Number.isFinite(Number(question.answer))).toBe(true);
        }
      });
    });
  });

  it('creates deterministic sets with the same seed', () => {
    const first = generateQuizSet({
      grade: 5,
      difficulty: 'medium',
      ops: ['+', '-', '*', '/'],
      count: 50,
      seed: 42
    });

    const second = generateQuizSet({
      grade: 5,
      difficulty: 'medium',
      ops: ['+', '-', '*', '/'],
      count: 50,
      seed: 42
    });

    expect(first).toEqual(second);
  });

  it('produces many unique prompts in a 50-question sample', () => {
    const sample = generateQuizSet({
      grade: 6,
      difficulty: 'hard',
      ops: ['+', '-', '*', '/'],
      count: 50,
      seed: 2025,
      decimalsMode: true
    });

    const uniquePrompts = new Set(sample.map((item) => item.prompt));
    expect(uniquePrompts.size).toBeGreaterThanOrEqual(45);
  });
});
