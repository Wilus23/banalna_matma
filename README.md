# Math Speed Quiz (Next.js + TypeScript)

A polished, kid-friendly math speed quiz game for primary students.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Accessible UI components (Radix Dialog + custom accessible controls)
- Framer Motion animations
- localStorage persistence via a storage abstraction (`math-quiz-logs-v1`)
- Vitest unit tests (question generator)
- ESLint + Prettier

## Run Locally

```bash
npm install
npm run dev
```

Open: `http://localhost:3000`

## Test + Quality

```bash
npm run test
npm run lint
npm run build
```

## Project Structure

- `/app` — App Router pages and global styling
- `/components` — UI and screen components
- `/lib` — question generator, storage, utilities, formatting, leaderboard
- `/types` — TypeScript domain types
- `/tests` — unit tests

## Key Files

- Grade ranges and generation patterns: `lib/question-generator.ts`
- Local persistence and schema validation: `lib/storage.ts`
- Theme tokens (colors/glass styles): `app/globals.css`
- Setup/Quiz/Results screens:
  - `components/screens/setup-screen.tsx`
  - `components/screens/quiz-screen.tsx`
  - `components/screens/results-screen.tsx`

## Notes

- Grade 3 constraints are explicitly enforced and tested.
- Developer-only 100-question preview is available on Setup in non-production builds.
- Focus mode hides history/leaderboard on the results screen.
