import { createSeededRng, toSafeSeed, type RNG } from '@/lib/rng';
import { clamp } from '@/lib/utils';
import type {
  Difficulty,
  GenerateQuestionParams,
  GenerateQuizSetParams,
  GeneratedQuestion,
  GeneratorGrade,
  Operation
} from '@/types/quiz';

interface GradeProfileNote {
  summary: string;
  operations: Record<Operation, string>;
}

interface RawQuestion {
  a: number;
  b: number;
  answer: number;
  pattern: string;
}

const MAX_SAFE = Number.MAX_SAFE_INTEGER;

export const GRADE_PROFILES: Record<GeneratorGrade, Record<Difficulty, GradeProfileNote>> = {
  3: {
    easy: {
      summary: 'Foundations: non-negative arithmetic and table facts',
      operations: {
        '+': 'a,b in [0..30], a+b <= 60',
        '-': 'a in [0..60], b in [0..a]',
        '*': 'facts up to 10×10, result <= 100',
        '/': 'exact (k*m)/k with k [2..10], m [1..10]'
      }
    },
    medium: {
      summary: 'Larger non-negative numbers with friendly patterns',
      operations: {
        '+': 'a,b in [0..200], a+b <= 300; includes +10/+20/+30',
        '-': 'a in [0..300], b in [0..a]; includes crossing tens',
        '*': '2-digit×1-digit only when result <= 100, else table facts',
        '/': 'exact division; dividend <= 100'
      }
    },
    hard: {
      summary: 'Non-negative extended range with borrowing and scaling',
      operations: {
        '+': 'a,b in [0..500], a+b <= 1000; includes multiples of 10/100',
        '-': 'a in [0..1000], b in [0..a]; includes borrowing across hundreds',
        '*': 'includes ×10 facts when result <= 100 and 10×n facts',
        '/': 'exact division, includes ÷10 when divisible, child-friendly values'
      }
    }
  },
  4: {
    easy: {
      summary: 'Bridge grade, still non-negative arithmetic only',
      operations: {
        '+': 'non-negative numbers, sum capped to child-friendly range',
        '-': 'non-negative subtraction only (a >= b)',
        '*': 'table facts and simple scaling',
        '/': 'exact friendly division only'
      }
    },
    medium: {
      summary: 'Expanded non-negative arithmetic with exact division',
      operations: {
        '+': 'non-negative, medium range',
        '-': 'non-negative, medium range',
        '*': 'small multidigit and table-based',
        '/': 'exact division by construction'
      }
    },
    hard: {
      summary: 'Larger non-negative values and scaling patterns',
      operations: {
        '+': 'non-negative higher range',
        '-': 'non-negative higher range',
        '*': 'includes powers of ten patterns',
        '/': 'exact division by construction'
      }
    }
  },
  5: {
    easy: {
      summary: 'Integer fluency with non-negative defaults',
      operations: {
        '+': 'within [0..5,000]',
        '-': 'within [0..5,000], non-negative results',
        '*': 'up to 2-digit × 1-digit plus table facts',
        '/': 'exact within [0..1000], mostly 1-digit divisors'
      }
    },
    medium: {
      summary: 'Bigger integers and moderate multidigit multiplication/division',
      operations: {
        '+': 'within [0..100,000]',
        '-': 'within [0..100,000], non-negative results',
        '*': '2-digit × 2-digit with ×10/×100 patterns',
        '/': '3-4 digit ÷ 1-2 digit, exact by construction'
      }
    },
    hard: {
      summary: 'Large integers with zero-rich multiplication/division patterns',
      operations: {
        '+': 'within [0..1,000,000]',
        '-': 'within [0..1,000,000], non-negative results',
        '*': 'includes 1300×100 and 450×20 style patterns',
        '/': 'larger exact divisions by construction'
      }
    }
  },
  6: {
    easy: {
      summary: 'Large integer operations with scaling by powers of ten',
      operations: {
        '+': 'within [0..250,000]',
        '-': 'within [0..250,000], non-negative by default',
        '*': 'includes ×10, ×100, ×1000',
        '/': 'exact division by construction'
      }
    },
    medium: {
      summary: 'Optional decimal mode or multidigit integer mode',
      operations: {
        '+': 'integers or 1-2dp decimals when decimals mode is on',
        '-': 'integers or 1-2dp decimals when decimals mode is on',
        '*': '2-3 digit × 2-digit, or decimal shift patterns',
        '/': 'exact integer division, or decimal shifts when enabled'
      }
    },
    hard: {
      summary: 'Mental arithmetic stress with scaling and zero-rich values',
      operations: {
        '+': 'larger ranges and scaled values',
        '-': 'larger ranges and scaled values',
        '*': 'zero-heavy multiplication patterns',
        '/': 'exact divisions with larger and scaled values'
      }
    }
  },
  7: {
    easy: {
      summary: 'Signed integer arithmetic with exact multiplicative/division facts',
      operations: {
        '+': '[-6,000..6,000] when negatives enabled',
        '-': '[-6,000..6,000] when negatives enabled',
        '*': 'exact integer multiplication with optional signs',
        '/': 'exact integer division with optional signs'
      }
    },
    medium: {
      summary: 'Larger signed integers and powers-of-ten scaling',
      operations: {
        '+': 'larger signed ranges',
        '-': 'larger signed ranges',
        '*': 'signed scaling by powers of ten',
        '/': 'signed exact division by construction'
      }
    },
    hard: {
      summary: 'Sign handling and large zero-rich arithmetic',
      operations: {
        '+': 'high magnitude signed values',
        '-': 'high magnitude signed values',
        '*': 'many zeros and signed stress tests',
        '/': 'exact signed division with larger values'
      }
    }
  },
  8: {
    easy: {
      summary: 'Broader signed integer arithmetic',
      operations: {
        '+': 'broader signed range (easy: around ±30,000)',
        '-': 'broader signed range (easy: around ±30,000)',
        '*': 'exact integer multiplication',
        '/': 'exact integer division'
      }
    },
    medium: {
      summary: 'Scaling tasks like 300000×10 and 45000÷100',
      operations: {
        '+': 'large signed values',
        '-': 'large signed values',
        '*': 'scientific-style scaling without notation',
        '/': 'scientific-style exact scaling division'
      }
    },
    hard: {
      summary: 'Tough arithmetic with optional decimals mode',
      operations: {
        '+': 'large signed values, optional decimals',
        '-': 'large signed values, optional decimals',
        '*': 'zero-rich and optional decimal scaling',
        '/': 'exact division with optional decimals mode'
      }
    }
  }
};

const randomInt = (min: number, max: number, rng: RNG): number => {
  if (max < min) {
    throw new Error(`Invalid range: ${min}..${max}`);
  }

  return Math.floor(rng() * (max - min + 1)) + min;
};

const pick = <T>(items: readonly T[], rng: RNG): T => {
  if (items.length === 0) {
    throw new Error('Cannot pick from empty list');
  }

  return items[randomInt(0, items.length - 1, rng)];
};

const chance = (value: number, rng: RNG): boolean => {
  return rng() < clamp(value, 0, 1);
};

const withRetries = <T>(
  fn: () => T,
  validate: (value: T) => boolean,
  fallback: () => T,
  attempts = 50
): T => {
  // Retries keep edge-case generators valid while still producing wide random variety.
  for (let index = 0; index < attempts; index += 1) {
    const value = fn();
    if (validate(value)) {
      return value;
    }
  }

  return fallback();
};

const asDecimal = (value: number): number => {
  return Number(value.toFixed(2));
};

const operandToString = (value: number): string => {
  const display = Number.isInteger(value) ? `${value}` : value.toFixed(2).replace(/\.?0+$/, '');
  return value < 0 ? `(${display})` : display;
};

const makePrompt = (a: number, b: number, op: Operation): string => {
  const symbol = op === '*' ? '×' : op === '/' ? '÷' : op;
  return `${operandToString(a)} ${symbol} ${operandToString(b)} =`;
};

const createExactDivision = (
  divisorMin: number,
  divisorMax: number,
  quotientMin: number,
  quotientMax: number,
  rng: RNG
): { divisor: number; quotient: number; dividend: number } => {
  const divisor = randomInt(divisorMin, divisorMax, rng);
  const quotient = randomInt(quotientMin, quotientMax, rng);
  return {
    divisor,
    quotient,
    dividend: divisor * quotient
  };
};

const maybeSigned = (value: number, allowNegatives: boolean, rng: RNG): number => {
  if (!allowNegatives) {
    return Math.abs(value);
  }

  return chance(0.5, rng) ? value : -value;
};

const signedRangeValue = (maxAbs: number, allowNegatives: boolean, rng: RNG): number => {
  const absValue = randomInt(0, maxAbs, rng);
  return maybeSigned(absValue, allowNegatives, rng);
};

const generateGrade3EasyAddition = (rng: RNG): RawQuestion => {
  const pattern = pick(
    ['basic-small', 'make-ten', 'double', 'tens-and-ones', 'near-double'] as const,
    rng
  );

  if (pattern === 'make-ten') {
    const a = randomInt(0, 10, rng);
    const b = 10 - a;
    return { a, b, answer: a + b, pattern: 'g3-easy-add-make-ten' };
  }

  if (pattern === 'double') {
    const a = randomInt(0, 10, rng);
    return { a, b: a, answer: a * 2, pattern: 'g3-easy-add-double' };
  }

  if (pattern === 'tens-and-ones') {
    const a = pick([10, 20, 30], rng);
    const b = randomInt(0, Math.min(9, 60 - a), rng);
    return { a, b, answer: a + b, pattern: 'g3-easy-add-tens-and-ones' };
  }

  if (pattern === 'near-double') {
    const a = randomInt(1, 10, rng);
    const b = a + 1;
    return { a, b, answer: a + b, pattern: 'g3-easy-add-near-double' };
  }

  const a = randomInt(0, 30, rng);
  const b = randomInt(0, Math.min(30, 60 - a), rng);
  return { a, b, answer: a + b, pattern: 'g3-easy-add-basic' };
};

const generateGrade3EasySubtraction = (rng: RNG): RawQuestion => {
  const pattern = pick(
    ['basic-small', 'fact-family', 'subtract-small', 'subtract-tens', 'to-zero'] as const,
    rng
  );

  if (pattern === 'fact-family') {
    const partA = randomInt(0, 15, rng);
    const partB = randomInt(0, 15, rng);
    const total = partA + partB;
    return chance(0.5, rng)
      ? { a: total, b: partA, answer: partB, pattern: 'g3-easy-sub-fact-family-a' }
      : { a: total, b: partB, answer: partA, pattern: 'g3-easy-sub-fact-family-b' };
  }

  if (pattern === 'subtract-small') {
    const a = randomInt(5, 30, rng);
    const b = randomInt(0, Math.min(10, a), rng);
    return { a, b, answer: a - b, pattern: 'g3-easy-sub-small' };
  }

  if (pattern === 'subtract-tens') {
    const a = pick([10, 20, 30, 40, 50, 60], rng);
    const b = Math.min(a, pick([0, 10, 20, 30], rng));
    return { a, b, answer: a - b, pattern: 'g3-easy-sub-tens' };
  }

  if (pattern === 'to-zero') {
    const a = randomInt(0, 20, rng);
    return { a, b: a, answer: 0, pattern: 'g3-easy-sub-to-zero' };
  }

  const a = randomInt(0, 60, rng);
  const b = randomInt(0, a, rng);
  return { a, b, answer: a - b, pattern: 'g3-easy-sub-basic' };
};

const generateGrade3 = (
  op: Operation,
  difficulty: Difficulty,
  rng: RNG,
  biasHarder: number
): RawQuestion => {
  if (difficulty === 'easy') {
    if (op === '+') {
      return generateGrade3EasyAddition(rng);
    }

    if (op === '-') {
      return generateGrade3EasySubtraction(rng);
    }

    if (op === '*') {
      const a = randomInt(0, 10, rng);
      const b = randomInt(0, 10, rng);
      return { a, b, answer: a * b, pattern: 'g3-easy-mul-table' };
    }

    const { divisor, dividend, quotient } = createExactDivision(2, 10, 1, 10, rng);
    return { a: dividend, b: divisor, answer: quotient, pattern: 'g3-easy-div-facts' };
  }

  if (difficulty === 'medium') {
    if (op === '+') {
      const pattern = pick(['step', 'friendly-tens', 'range'] as const, rng);
      if (pattern === 'step') {
        const b = pick([10, 20, 30] as const, rng);
        const a = randomInt(0, Math.min(200, 300 - b), rng);
        return { a, b, answer: a + b, pattern: 'g3-medium-add-steps' };
      }

      if (pattern === 'friendly-tens') {
        const a = pick([20, 30, 40, 50, 60, 70, 80, 90], rng);
        const b = Math.min(300 - a, pick([10, 20, 30, 40, 50, 60, 70, 80], rng));
        return { a, b, answer: a + b, pattern: 'g3-medium-add-friendly-tens' };
      }

      const a = randomInt(0, 200, rng);
      const b = randomInt(0, Math.min(200, 300 - a), rng);
      return { a, b, answer: a + b, pattern: 'g3-medium-add-range' };
    }

    if (op === '-') {
      const pattern = pick(['cross-tens', 'friendly-tens', 'range'] as const, rng);
      if (pattern === 'cross-tens') {
        return withRetries(
          () => {
            const a = randomInt(20, 300, rng);
            const b = randomInt(1, a, rng);
            return { a, b, answer: a - b, pattern: 'g3-medium-sub-cross-tens' };
          },
          (q) => q.a % 10 < q.b % 10,
          () => {
            const a = randomInt(20, 300, rng);
            const b = randomInt(0, a, rng);
            return { a, b, answer: a - b, pattern: 'g3-medium-sub-fallback' };
          }
        );
      }

      if (pattern === 'friendly-tens') {
        const a = randomInt(20, 300, rng);
        const b = Math.min(a, pick([10, 20, 30, 40, 50, 60, 70, 80, 90], rng));
        return { a, b, answer: a - b, pattern: 'g3-medium-sub-friendly-tens' };
      }

      const a = randomInt(0, 300, rng);
      const b = randomInt(0, a, rng);
      return { a, b, answer: a - b, pattern: 'g3-medium-sub-range' };
    }

    if (op === '*') {
      const tryTwoDigit = chance(0.45 + biasHarder * 0.2, rng);
      if (tryTwoDigit) {
        return withRetries(
          () => {
            const a = randomInt(10, 99, rng);
            const b = randomInt(2, 9, rng);
            return { a, b, answer: a * b, pattern: 'g3-medium-mul-2x1' };
          },
          (q) => q.answer <= 100,
          () => {
            const a = randomInt(0, 10, rng);
            const b = randomInt(0, 10, rng);
            return { a, b, answer: a * b, pattern: 'g3-medium-mul-table-fallback' };
          }
        );
      }

      const a = randomInt(0, 10, rng);
      const b = randomInt(0, 10, rng);
      return { a, b, answer: a * b, pattern: 'g3-medium-mul-table' };
    }

    const divisor = randomInt(2, 10, rng);
    const quotient = randomInt(1, Math.floor(100 / divisor), rng);
    return {
      a: divisor * quotient,
      b: divisor,
      answer: quotient,
      pattern: 'g3-medium-div-exact-under-100'
    };
  }

  if (op === '+') {
    const pattern = pick(['scaled', 'bridge-hundred', 'range'] as const, rng);
    if (pattern === 'scaled') {
      const b = chance(0.6, rng) ? randomInt(1, 50, rng) * 10 : randomInt(1, 5, rng) * 100;
      const a = randomInt(0, Math.min(500, 1000 - b), rng);
      return { a, b, answer: a + b, pattern: 'g3-hard-add-multiples' };
    }

    if (pattern === 'bridge-hundred') {
      const a = pick([90, 180, 190, 280, 290, 390, 490], rng);
      const b = Math.min(1000 - a, pick([10, 20, 30, 40, 50, 100, 200], rng));
      return { a, b, answer: a + b, pattern: 'g3-hard-add-bridge-hundred' };
    }

    const a = randomInt(0, 500, rng);
    const b = randomInt(0, Math.min(500, 1000 - a), rng);
    return { a, b, answer: a + b, pattern: 'g3-hard-add-range' };
  }

  if (op === '-') {
    const pattern = pick(['borrow-hundreds', 'round-hundreds', 'range'] as const, rng);
    if (pattern === 'borrow-hundreds') {
      return withRetries(
        () => {
          const a = randomInt(100, 1000, rng);
          const b = randomInt(1, a, rng);
          return { a, b, answer: a - b, pattern: 'g3-hard-sub-borrow-hundreds' };
        },
        (q) => q.a % 100 < q.b % 100,
        () => {
          const a = randomInt(0, 1000, rng);
          const b = randomInt(0, a, rng);
          return { a, b, answer: a - b, pattern: 'g3-hard-sub-fallback' };
        }
      );
    }

    if (pattern === 'round-hundreds') {
      const a = randomInt(200, 1000, rng);
      const b = Math.min(a, pick([100, 200, 300, 400, 500], rng));
      return { a, b, answer: a - b, pattern: 'g3-hard-sub-round-hundreds' };
    }

    const a = randomInt(0, 1000, rng);
    const b = randomInt(0, a, rng);
    return { a, b, answer: a - b, pattern: 'g3-hard-sub-range' };
  }

  if (op === '*') {
    const tenFact = chance(0.55 + biasHarder * 0.2, rng);
    if (tenFact) {
      const n = randomInt(0, 10, rng);
      return chance(0.5, rng)
        ? { a: n, b: 10, answer: n * 10, pattern: 'g3-hard-mul-n-times-10' }
        : { a: 10, b: n, answer: n * 10, pattern: 'g3-hard-mul-10-times-n' };
    }

    const a = randomInt(0, 10, rng);
    const b = randomInt(0, 10, rng);
    return { a, b, answer: a * b, pattern: 'g3-hard-mul-table' };
  }

  const divideByTen = chance(0.4 + biasHarder * 0.2, rng);
  if (divideByTen) {
    const quotient = randomInt(1, 20, rng);
    return { a: quotient * 10, b: 10, answer: quotient, pattern: 'g3-hard-div-by-10' };
  }

  const divisor = randomInt(2, 10, rng);
  const quotient = randomInt(1, Math.floor(200 / divisor), rng);
  return {
    a: divisor * quotient,
    b: divisor,
    answer: quotient,
    pattern: 'g3-hard-div-exact-friendly'
  };
};

const generateGrade4 = (
  op: Operation,
  difficulty: Difficulty,
  rng: RNG,
  biasHarder: number
): RawQuestion => {
  const baseline = generateGrade3(op, difficulty, rng, biasHarder);

  if (op === '+' || op === '-') {
    if (difficulty === 'easy') {
      return baseline;
    }

    const max = difficulty === 'medium' ? 600 : 1400;
    if (op === '+') {
      const a = randomInt(0, Math.floor(max / 2), rng);
      const b = randomInt(0, max - a, rng);
      return { a, b, answer: a + b, pattern: `g4-${difficulty}-add-expanded` };
    }

    const a = randomInt(0, max, rng);
    const b = randomInt(0, a, rng);
    return { a, b, answer: a - b, pattern: `g4-${difficulty}-sub-expanded` };
  }

  if (op === '*') {
    if (difficulty === 'hard' && chance(0.5, rng)) {
      const a = randomInt(5, 40, rng) * 10;
      const b = pick([2, 5, 10], rng);
      return { a, b, answer: a * b, pattern: 'g4-hard-mul-scaled' };
    }

    return baseline;
  }

  if (difficulty === 'hard' && chance(0.4, rng)) {
    const quotient = randomInt(1, 50, rng);
    const divisor = pick([2, 4, 5, 10], rng);
    return { a: quotient * divisor, b: divisor, answer: quotient, pattern: 'g4-hard-div-scaled' };
  }

  return baseline;
};

const generateGrade5 = (
  op: Operation,
  difficulty: Difficulty,
  rng: RNG,
  biasHarder: number
): RawQuestion => {
  if (difficulty === 'easy') {
    if (op === '+') {
      const a = randomInt(0, 5_000, rng);
      const b = randomInt(0, 5_000, rng);
      return { a, b, answer: a + b, pattern: 'g5-easy-add-range' };
    }

    if (op === '-') {
      const a = randomInt(0, 5_000, rng);
      const b = randomInt(0, a, rng);
      return { a, b, answer: a - b, pattern: 'g5-easy-sub-range' };
    }

    if (op === '*') {
      if (chance(0.35, rng)) {
        const a = randomInt(0, 12, rng);
        const b = randomInt(0, 12, rng);
        return { a, b, answer: a * b, pattern: 'g5-easy-mul-table' };
      }

      const a = randomInt(10, 99, rng);
      const b = randomInt(2, 9, rng);
      return { a, b, answer: a * b, pattern: 'g5-easy-mul-2x1' };
    }

    const divisor = randomInt(2, 9, rng);
    const quotient = randomInt(1, Math.floor(1000 / divisor), rng);
    return {
      a: divisor * quotient,
      b: divisor,
      answer: quotient,
      pattern: 'g5-easy-div-exact'
    };
  }

  if (difficulty === 'medium') {
    if (op === '+') {
      const a = randomInt(0, 100_000, rng);
      const b = randomInt(0, 100_000, rng);
      return { a, b, answer: a + b, pattern: 'g5-medium-add-range' };
    }

    if (op === '-') {
      const a = randomInt(0, 100_000, rng);
      const b = randomInt(0, a, rng);
      return { a, b, answer: a - b, pattern: 'g5-medium-sub-range' };
    }

    if (op === '*') {
      if (chance(0.4 + biasHarder * 0.2, rng)) {
        const a = randomInt(2, 999, rng);
        const b = pick([10, 100], rng);
        return { a, b, answer: a * b, pattern: 'g5-medium-mul-scale' };
      }

      const a = randomInt(10, 99, rng);
      const b = randomInt(10, 99, rng);
      return { a, b, answer: a * b, pattern: 'g5-medium-mul-2x2' };
    }

    return withRetries(
      () => {
        const divisor = randomInt(2, 99, rng);
        const quotient = randomInt(10, 999, rng);
        const dividend = divisor * quotient;
        return {
          a: dividend,
          b: divisor,
          answer: quotient,
          pattern: 'g5-medium-div-3to4-digit'
        };
      },
      (q) => q.a >= 100 && q.a <= 9999,
      () => {
        const divisor = randomInt(2, 99, rng);
        const quotient = randomInt(1, 99, rng);
        return {
          a: divisor * quotient,
          b: divisor,
          answer: quotient,
          pattern: 'g5-medium-div-fallback'
        };
      }
    );
  }

  if (op === '+') {
    const a = randomInt(0, 1_000_000, rng);
    const b = randomInt(0, 1_000_000, rng);
    return { a, b, answer: a + b, pattern: 'g5-hard-add-range' };
  }

  if (op === '-') {
    const a = randomInt(0, 1_000_000, rng);
    const b = randomInt(0, a, rng);
    return { a, b, answer: a - b, pattern: 'g5-hard-sub-range' };
  }

  if (op === '*') {
    const zeroRich = chance(0.7 + biasHarder * 0.2, rng);
    if (zeroRich) {
      const aBase = randomInt(13, 500, rng);
      const a = aBase * pick([10, 100], rng);
      const b = pick([10, 20, 50, 100], rng);
      return { a, b, answer: a * b, pattern: 'g5-hard-mul-zero-rich' };
    }

    const a = randomInt(100, 999, rng);
    const b = randomInt(10, 99, rng);
    return { a, b, answer: a * b, pattern: 'g5-hard-mul-3x2' };
  }

  const divisor = randomInt(2, 300, rng);
  const quotient = randomInt(20, 5000, rng);
  return {
    a: divisor * quotient,
    b: divisor,
    answer: quotient,
    pattern: 'g5-hard-div-exact-large'
  };
};

const generateGrade6Decimal = (
  op: Operation,
  difficulty: Difficulty,
  rng: RNG,
  biasHarder: number
): RawQuestion => {
  if (op === '+') {
    const scaleA = pick([10, 100], rng);
    const scaleB = pick([10, 100], rng);
    const a = asDecimal(randomInt(0, 50_000, rng) / scaleA);
    const b = asDecimal(randomInt(0, 50_000, rng) / scaleB);
    return { a, b, answer: asDecimal(a + b), pattern: `g6-${difficulty}-dec-add` };
  }

  if (op === '-') {
    const scaleA = pick([10, 100], rng);
    const scaleB = pick([10, 100], rng);
    const a = asDecimal(randomInt(0, 60_000, rng) / scaleA);
    const rawB = asDecimal(randomInt(0, 60_000, rng) / scaleB);
    const b = Math.min(rawB, a);
    return { a, b, answer: asDecimal(a - b), pattern: `g6-${difficulty}-dec-sub` };
  }

  if (op === '*') {
    if (chance(0.65 + biasHarder * 0.1, rng)) {
      const factor = pick([10, 100], rng);
      const a = asDecimal(randomInt(10, 9999, rng) / 100);
      return { a, b: factor, answer: asDecimal(a * factor), pattern: `g6-${difficulty}-dec-mul-shift` };
    }

    const a = asDecimal(randomInt(10, 999, rng) / 10);
    const b = asDecimal(randomInt(10, 999, rng) / 10);
    return { a, b, answer: asDecimal(a * b), pattern: `g6-${difficulty}-dec-mul-general` };
  }

  const divisor = pick([10, 100], rng);
  const quotient = asDecimal(randomInt(10, 9999, rng) / 100);
  return {
    a: asDecimal(quotient * divisor),
    b: divisor,
    answer: quotient,
    pattern: `g6-${difficulty}-dec-div-shift`
  };
};

const generateGrade6 = (
  op: Operation,
  difficulty: Difficulty,
  rng: RNG,
  decimalsMode: boolean,
  biasHarder: number
): RawQuestion => {
  if (difficulty === 'easy') {
    if (op === '+') {
      const a = randomInt(0, 250_000, rng);
      const b = randomInt(0, 250_000, rng);
      return { a, b, answer: a + b, pattern: 'g6-easy-add-range' };
    }

    if (op === '-') {
      const a = randomInt(0, 250_000, rng);
      const b = randomInt(0, a, rng);
      return { a, b, answer: a - b, pattern: 'g6-easy-sub-range' };
    }

    if (op === '*') {
      if (chance(0.55 + biasHarder * 0.2, rng)) {
        const a = randomInt(2, 5_000, rng);
        const b = pick([10, 100, 1000], rng);
        return { a, b, answer: a * b, pattern: 'g6-easy-mul-scale' };
      }

      const a = randomInt(10, 999, rng);
      const b = randomInt(2, 99, rng);
      return { a, b, answer: a * b, pattern: 'g6-easy-mul-range' };
    }

    const divisor = randomInt(2, 100, rng);
    const quotient = randomInt(10, 10_000, rng);
    return {
      a: divisor * quotient,
      b: divisor,
      answer: quotient,
      pattern: 'g6-easy-div-exact'
    };
  }

  if (difficulty === 'medium' && decimalsMode) {
    return generateGrade6Decimal(op, difficulty, rng, biasHarder);
  }

  if (difficulty === 'medium') {
    if (op === '+') {
      const a = randomInt(0, 1_000_000, rng);
      const b = randomInt(0, 1_000_000, rng);
      return { a, b, answer: a + b, pattern: 'g6-medium-add-int' };
    }

    if (op === '-') {
      const a = randomInt(0, 1_000_000, rng);
      const b = randomInt(0, a, rng);
      return { a, b, answer: a - b, pattern: 'g6-medium-sub-int' };
    }

    if (op === '*') {
      const a = randomInt(100, 999, rng);
      const b = randomInt(10, 99, rng);
      return { a, b, answer: a * b, pattern: 'g6-medium-mul-3x2' };
    }

    const divisor = randomInt(2, 99, rng);
    const quotient = randomInt(10, 999, rng);
    return {
      a: divisor * quotient,
      b: divisor,
      answer: quotient,
      pattern: 'g6-medium-div-exact'
    };
  }

  if (decimalsMode && chance(0.35, rng)) {
    return generateGrade6Decimal(op, difficulty, rng, biasHarder);
  }

  if (op === '+') {
    const a = randomInt(10_000, 2_000_000, rng);
    const b = pick([10, 100, 1000], rng) * randomInt(1, 900, rng);
    return { a, b, answer: a + b, pattern: 'g6-hard-add-scaled' };
  }

  if (op === '-') {
    const a = randomInt(50_000, 2_000_000, rng);
    const b = randomInt(0, a, rng);
    return { a, b, answer: a - b, pattern: 'g6-hard-sub-scaled' };
  }

  if (op === '*') {
    if (chance(0.6 + biasHarder * 0.2, rng)) {
      const a = pick([120, 240, 450, 900, 1300, 2500], rng);
      const b = pick([20, 40, 50, 100, 200, 500], rng);
      return { a, b, answer: a * b, pattern: 'g6-hard-mul-zero-rich' };
    }

    const a = randomInt(100, 9999, rng);
    const b = randomInt(10, 999, rng);
    return { a, b, answer: a * b, pattern: 'g6-hard-mul-range' };
  }

  const divisor = pick([4, 5, 8, 10, 20, 25, 40, 50, 100], rng);
  const quotient = randomInt(20, 20_000, rng);
  return { a: divisor * quotient, b: divisor, answer: quotient, pattern: 'g6-hard-div-scaled' };
};

const generateGrade7 = (
  op: Operation,
  difficulty: Difficulty,
  rng: RNG,
  allowNegatives: boolean,
  biasHarder: number
): RawQuestion => {
  const easyMax = 6_000;
  const mediumMax = 250_000;
  const hardMax = 1_500_000;

  const pickMagnitude = (): number => {
    if (difficulty === 'easy') {
      return easyMax;
    }

    if (difficulty === 'medium') {
      return mediumMax;
    }

    return hardMax;
  };

  if (op === '+' || op === '-') {
    const maxAbs = pickMagnitude();
    const a = signedRangeValue(maxAbs, allowNegatives, rng);
    const bRaw = signedRangeValue(maxAbs, allowNegatives, rng);

    if (!allowNegatives && op === '-') {
      const top = Math.max(a, bRaw);
      const bottom = Math.min(a, bRaw);
      return {
        a: top,
        b: bottom,
        answer: top - bottom,
        pattern: `g7-${difficulty}-sub-nonnegative`
      };
    }

    return {
      a,
      b: bRaw,
      answer: op === '+' ? a + bRaw : a - bRaw,
      pattern: `g7-${difficulty}-${op === '+' ? 'add' : 'sub'}-signed`
    };
  }

  if (op === '*') {
    if (difficulty !== 'easy' && chance(0.55 + biasHarder * 0.2, rng)) {
      const a = maybeSigned(randomInt(10, 5000, rng) * pick([10, 100], rng), allowNegatives, rng);
      const b = maybeSigned(pick([10, 20, 50, 100], rng), allowNegatives, rng);
      return { a, b, answer: a * b, pattern: `g7-${difficulty}-mul-scale` };
    }

    const a = maybeSigned(randomInt(2, difficulty === 'easy' ? 99 : 999, rng), allowNegatives, rng);
    const b = maybeSigned(randomInt(2, difficulty === 'hard' ? 999 : 99, rng), allowNegatives, rng);
    return { a, b, answer: a * b, pattern: `g7-${difficulty}-mul-signed` };
  }

  const divisorMagnitude = difficulty === 'easy' ? randomInt(2, 25, rng) : randomInt(2, 200, rng);
  const quotientMagnitude =
    difficulty === 'easy' ? randomInt(2, 500, rng) : difficulty === 'medium' ? randomInt(10, 5000, rng) : randomInt(50, 20_000, rng);

  const divisor = maybeSigned(divisorMagnitude, allowNegatives, rng);
  const quotient = maybeSigned(quotientMagnitude, allowNegatives, rng);
  const dividend = divisor * quotient;

  return {
    a: dividend,
    b: divisor,
    answer: quotient,
    pattern: `g7-${difficulty}-div-exact-signed`
  };
};

const generateGrade8Decimal = (
  op: Operation,
  difficulty: Difficulty,
  rng: RNG,
  allowNegatives: boolean
): RawQuestion => {
  if (op === '+' || op === '-') {
    const a = asDecimal(maybeSigned(randomInt(0, 250_000, rng), allowNegatives, rng) / 100);
    const b = asDecimal(maybeSigned(randomInt(0, 250_000, rng), allowNegatives, rng) / 100);

    if (!allowNegatives && op === '-') {
      const top = Math.max(a, b);
      const bottom = Math.min(a, b);
      return { a: top, b: bottom, answer: asDecimal(top - bottom), pattern: `g8-${difficulty}-dec-sub-clamped` };
    }

    return {
      a,
      b,
      answer: asDecimal(op === '+' ? a + b : a - b),
      pattern: `g8-${difficulty}-dec-${op === '+' ? 'add' : 'sub'}`
    };
  }

  if (op === '*') {
    const a = asDecimal(maybeSigned(randomInt(10, 9999, rng), allowNegatives, rng) / 100);
    const b = pick([10, 100, 1000], rng);
    return { a, b, answer: asDecimal(a * b), pattern: `g8-${difficulty}-dec-mul-shift` };
  }

  const divisor = pick([10, 100, 1000], rng);
  const quotient = asDecimal(maybeSigned(randomInt(20, 99999, rng), allowNegatives, rng) / 100);
  return { a: asDecimal(quotient * divisor), b: divisor, answer: quotient, pattern: `g8-${difficulty}-dec-div-shift` };
};

const generateGrade8 = (
  op: Operation,
  difficulty: Difficulty,
  rng: RNG,
  allowNegatives: boolean,
  decimalsMode: boolean,
  biasHarder: number
): RawQuestion => {
  if (decimalsMode && difficulty === 'hard' && chance(0.4 + biasHarder * 0.1, rng)) {
    return generateGrade8Decimal(op, difficulty, rng, allowNegatives);
  }

  if (op === '+' || op === '-') {
    const maxAbs = difficulty === 'easy' ? 30_000 : difficulty === 'medium' ? 3_000_000 : 25_000_000;
    const a = signedRangeValue(maxAbs, allowNegatives, rng);
    const b = signedRangeValue(maxAbs, allowNegatives, rng);

    if (!allowNegatives && op === '-') {
      const top = Math.max(a, b);
      const bottom = Math.min(a, b);
      return { a: top, b: bottom, answer: top - bottom, pattern: `g8-${difficulty}-sub-nonnegative` };
    }

    return {
      a,
      b,
      answer: op === '+' ? a + b : a - b,
      pattern: `g8-${difficulty}-${op === '+' ? 'add' : 'sub'}-signed`
    };
  }

  if (op === '*') {
    if (difficulty !== 'easy' && chance(0.55 + biasHarder * 0.2, rng)) {
      const a = maybeSigned(pick([30_000, 45_000, 120_000, 300_000, 1_300], rng), allowNegatives, rng);
      const b = maybeSigned(pick([10, 20, 50, 100, 1000], rng), allowNegatives, rng);
      return { a, b, answer: a * b, pattern: `g8-${difficulty}-mul-scientific-style` };
    }

    const a = maybeSigned(randomInt(20, difficulty === 'easy' ? 500 : 20_000, rng), allowNegatives, rng);
    const b = maybeSigned(randomInt(2, difficulty === 'hard' ? 9000 : 999, rng), allowNegatives, rng);
    return { a, b, answer: a * b, pattern: `g8-${difficulty}-mul-general` };
  }

  if (difficulty !== 'easy' && chance(0.6 + biasHarder * 0.2, rng)) {
    const divisor = maybeSigned(pick([10, 20, 25, 50, 100, 1000], rng), allowNegatives, rng);
    const quotient = maybeSigned(randomInt(20, 250_000, rng), allowNegatives, rng);
    return {
      a: divisor * quotient,
      b: divisor,
      answer: quotient,
      pattern: `g8-${difficulty}-div-scientific-style`
    };
  }

  const divisor = maybeSigned(randomInt(2, difficulty === 'easy' ? 100 : 2000, rng), allowNegatives, rng);
  const quotient = maybeSigned(randomInt(2, difficulty === 'easy' ? 5000 : 200_000, rng), allowNegatives, rng);
  return {
    a: divisor * quotient,
    b: divisor,
    answer: quotient,
    pattern: `g8-${difficulty}-div-exact-general`
  };
};

const ensureQuestionSafety = (question: RawQuestion, grade: GeneratorGrade): void => {
  const values = [question.a, question.b, question.answer];

  values.forEach((value) => {
    if (!Number.isFinite(value)) {
      throw new Error(`Generated non-finite value: ${value}`);
    }

    if (Math.abs(value) > MAX_SAFE) {
      throw new Error(`Generated unsafe value: ${value}`);
    }
  });

  if ((grade === 3 || grade === 4) && (question.a < 0 || question.b < 0 || question.answer < 0)) {
    throw new Error(`Grade ${grade} cannot contain negative values`);
  }
};

const chooseOperation = (ops: Operation[], rng: RNG): Operation => {
  if (ops.length === 0) {
    throw new Error('At least one operation is required to generate a question');
  }

  return pick(ops, rng);
};

const generateByGrade = (
  grade: GeneratorGrade,
  op: Operation,
  difficulty: Difficulty,
  rng: RNG,
  decimalsMode: boolean,
  allowNegatives: boolean,
  biasHarder: number
): RawQuestion => {
  if (grade === 3) {
    return generateGrade3(op, difficulty, rng, biasHarder);
  }

  if (grade === 4) {
    return generateGrade4(op, difficulty, rng, biasHarder);
  }

  if (grade === 5) {
    return generateGrade5(op, difficulty, rng, biasHarder);
  }

  if (grade === 6) {
    return generateGrade6(op, difficulty, rng, decimalsMode, biasHarder);
  }

  if (grade === 7) {
    return generateGrade7(op, difficulty, rng, allowNegatives, biasHarder);
  }

  return generateGrade8(op, difficulty, rng, allowNegatives, decimalsMode, biasHarder);
};

export const generateQuestion = (params: GenerateQuestionParams): GeneratedQuestion => {
  const rng = params.rng ?? Math.random;
  const decimalsMode = params.decimalsMode ?? false;
  const allowNegatives = params.allowNegatives ?? params.grade >= 7;
  const biasHarder = clamp(params.biasHarder ?? 0, 0, 1);
  const op = chooseOperation(params.ops, rng);

  const rawQuestion = generateByGrade(
    params.grade,
    op,
    params.difficulty,
    rng,
    decimalsMode,
    allowNegatives,
    biasHarder
  );

  ensureQuestionSafety(rawQuestion, params.grade);

  if (op === '/' && rawQuestion.b === 0) {
    throw new Error('Division by zero generated');
  }

  const prompt = makePrompt(rawQuestion.a, rawQuestion.b, op).trim();

  return {
    prompt,
    answer: rawQuestion.answer,
    meta: {
      op,
      a: rawQuestion.a,
      b: rawQuestion.b,
      grade: params.grade,
      difficulty: params.difficulty,
      pattern: rawQuestion.pattern
    }
  };
};

export const generateQuizSet = (params: GenerateQuizSetParams): GeneratedQuestion[] => {
  if (!Number.isInteger(params.count) || params.count <= 0) {
    throw new Error('Quiz count must be a positive integer');
  }

  const seededRng = params.seed !== undefined ? createSeededRng(toSafeSeed(params.seed)) : undefined;
  const activeRng = params.rng ?? seededRng ?? Math.random;
  const quiz: GeneratedQuestion[] = [];
  const seenPrompts = new Set<string>();

  for (let index = 0; index < params.count; index += 1) {
    // Prefer unique prompts so the same session feels fresh for speed practice.
    const question = withRetries(
      () =>
        generateQuestion({
          ...params,
          rng: activeRng
        }),
      (candidate) => !seenPrompts.has(candidate.prompt),
      () =>
        generateQuestion({
          ...params,
          rng: activeRng,
          biasHarder: 1
        }),
      80
    );

    quiz.push(question);
    seenPrompts.add(question.prompt);
  }

  return quiz;
};
