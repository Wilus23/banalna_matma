'use client';

import { Download, RotateCcw, Trophy, Upload } from 'lucide-react';
import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { CelebrationBurst } from '@/components/celebration-burst';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogClose,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { formatDateTime, formatMs, formatPercent } from '@/lib/format';
import { getBestForSettings, getLeaderboardEntries } from '@/lib/leaderboard';
import { exportLogs } from '@/lib/storage';
import type { QuizLog, QuizSettings } from '@/types/quiz';

type SortKey = 'date' | 'time' | 'accuracy';
type SortDirection = 'asc' | 'desc';

interface ResultsScreenProps {
  settings: QuizSettings;
  latestLog: QuizLog;
  logs: QuizLog[];
  onPlayAgain: () => void;
  onNewSetup: () => void;
  onImport: (json: string) => void;
  onClearAll: () => void;
}

const difficultyLabel = (difficulty: QuizLog['difficulty']): string => {
  if (difficulty === 'easy') {
    return 'ŁATWY';
  }
  if (difficulty === 'medium') {
    return 'ŚREDNI';
  }
  return 'TRUDNY';
};

const opDisplay = (ops: string[]): string =>
  [...ops]
    .map((op) => {
      if (op === '*') {
        return '×';
      }

      if (op === '/') {
        return '÷';
      }

      return op;
    })
    .join(' ');

const sortLogs = (logs: QuizLog[], sortKey: SortKey, direction: SortDirection): QuizLog[] => {
  const multiplier = direction === 'asc' ? 1 : -1;

  return [...logs].sort((a, b) => {
    if (sortKey === 'date') {
      return a.createdAt.localeCompare(b.createdAt) * multiplier;
    }

    if (sortKey === 'time') {
      return (a.elapsedMs - b.elapsedMs) * multiplier;
    }

    return (a.accuracy - b.accuracy) * multiplier;
  });
};

export const ResultsScreen = ({
  settings,
  latestLog,
  logs,
  onPlayAgain,
  onNewSetup,
  onImport,
  onClearAll
}: ResultsScreenProps) => {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sortedLogs = useMemo(() => sortLogs(logs, sortKey, sortDirection), [logs, sortDirection, sortKey]);
  const leaderboard = useMemo(() => getLeaderboardEntries(logs).slice(0, 5), [logs]);
  const bestForSettings = useMemo(() => getBestForSettings(logs, settings), [logs, settings]);

  const handleSortToggle = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection(key === 'date' ? 'desc' : 'asc');
  };

  const handleExport = () => {
    const json = exportLogs();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'dziennik-quizu-matematycznego.json';
    anchor.click();

    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setImportError(null);

    try {
      const json = await file.text();
      onImport(json);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się zaimportować danych';
      setImportError(message);
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <Card className="relative overflow-hidden p-6 md:p-8">
        <CelebrationBurst active />
        <div className="relative flex flex-col gap-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
            <Trophy className="h-4 w-4" />
            Quiz ukończony
          </div>
          <CardTitle className="text-3xl md:text-4xl">Świetna robota, {latestLog.studentName}!</CardTitle>
          <CardDescription className="text-base text-slate-200">
            Klasa {latestLog.grade} · {difficultyLabel(latestLog.difficulty)} · {opDisplay(latestLog.operations)}
          </CardDescription>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <Card className="space-y-5">
          <h3 className="text-2xl font-bold">Podsumowanie sesji</h3>

          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-xl border border-slate-500/30 bg-slate-950/40 p-3">
              <p className="text-slate-300">Łączny czas</p>
              <p className="text-2xl font-bold text-cyan-100">{formatMs(latestLog.elapsedMs)}</p>
            </div>
            <div className="rounded-xl border border-slate-500/30 bg-slate-950/40 p-3">
              <p className="text-slate-300">Skuteczność</p>
              <p className="text-2xl font-bold text-emerald-200">{formatPercent(latestLog.accuracy)}</p>
            </div>
            <div className="rounded-xl border border-slate-500/30 bg-slate-950/40 p-3">
              <p className="text-slate-300">Poprawne</p>
              <p className="text-2xl font-bold text-slate-100">
                {latestLog.correct}/{latestLog.questionCount}
              </p>
            </div>
            <div className="rounded-xl border border-slate-500/30 bg-slate-950/40 p-3">
              <p className="text-slate-300">Najlepsza seria</p>
              <p className="text-2xl font-bold text-yellow-200">{latestLog.bestStreak}</p>
            </div>
            <div className="rounded-xl border border-slate-500/30 bg-slate-950/40 p-3">
              <p className="text-slate-300">Śr. czas odpowiedzi</p>
              <p className="text-2xl font-bold text-slate-100">{formatMs(latestLog.avgAnswerMs)}</p>
            </div>
            <div className="rounded-xl border border-slate-500/30 bg-slate-950/40 p-3">
              <p className="text-slate-300">Data</p>
              <p className="text-sm font-bold text-slate-100">{formatDateTime(latestLog.createdAt)}</p>
            </div>
          </div>

          {bestForSettings && (
            <div className="rounded-xl border border-cyan-200/30 bg-cyan-400/10 p-4 text-sm">
              <p className="font-semibold text-cyan-100">Najlepszy wynik dla tych ustawień</p>
              <p className="text-cyan-50">{formatMs(bestForSettings.elapsedMs)}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button className="h-12" onClick={onPlayAgain} aria-label="Zagraj ponownie z tymi samymi ustawieniami">
              <RotateCcw className="mr-2 h-4 w-4" />
              Zagraj ponownie
            </Button>
            <Button className="h-12" variant="secondary" onClick={onNewSetup} aria-label="Utwórz nową konfigurację quizu">
              Nowa konfiguracja
            </Button>
          </div>
        </Card>

        <Card className="space-y-4">
          <h3 className="text-2xl font-bold">Narzędzia danych</h3>
          <p className="text-sm text-slate-300">Eksportuj, importuj lub wyczyść zapisane podejścia.</p>

          <div className="flex flex-col gap-3">
            <Button className="h-12" variant="secondary" onClick={handleExport} aria-label="Eksportuj dziennik quizu do JSON">
              <Download className="mr-2 h-4 w-4" />
              Eksportuj JSON
            </Button>

            <Button className="h-12" variant="secondary" onClick={handleImportClick} aria-label="Importuj dziennik quizu z JSON">
              <Upload className="mr-2 h-4 w-4" />
              Importuj JSON
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportFile}
              aria-label="Plik do importu dziennika quizu"
            />

            <Dialog>
              <DialogTrigger asChild>
                <Button className="h-12" variant="danger" aria-label="Wyczyść cały dziennik quizu">
                  Wyczyść wszystkie dane
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Wyczyścić wszystkie wpisy?</DialogTitle>
                  <DialogDescription>
                    Ta operacja trwale usunie wszystkie zapisane próby z localStorage.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="secondary">Anuluj</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button variant="danger" onClick={onClearAll}>
                      Wyczyść dane
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {importError && <p className="text-sm font-semibold text-rose-300">{importError}</p>}
        </Card>
      </div>

      {!settings.focusMode && (
        <div className="grid gap-6 xl:grid-cols-[1fr_0.7fr]">
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-2xl font-bold">Ostatnie podejścia</h3>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleSortToggle('date')}>
                  Data
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleSortToggle('time')}>
                  Czas
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleSortToggle('accuracy')}>
                  Skuteczność
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-500/30">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-900/70 text-slate-200">
                  <tr>
                    <th className="px-3 py-2">Uczeń</th>
                    <th className="px-3 py-2">Klasa</th>
                    <th className="px-3 py-2">Trudność</th>
                    <th className="px-3 py-2">Działania</th>
                    <th className="px-3 py-2">Czas</th>
                    <th className="px-3 py-2">Skuteczność</th>
                    <th className="px-3 py-2">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLogs.slice(0, 20).map((log) => (
                    <tr key={log.id} className="border-t border-slate-700/50">
                      <td className="px-3 py-2 font-semibold text-slate-100">{log.studentName}</td>
                      <td className="px-3 py-2">{log.grade}</td>
                      <td className="px-3 py-2">{difficultyLabel(log.difficulty)}</td>
                      <td className="px-3 py-2">{opDisplay(log.operations)}</td>
                      <td className="px-3 py-2">{formatMs(log.elapsedMs)}</td>
                      <td className="px-3 py-2">{formatPercent(log.accuracy)}</td>
                      <td className="px-3 py-2">{formatDateTime(log.createdAt)}</td>
                    </tr>
                  ))}
                  {sortedLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-slate-300">
                        Brak zapisanych wyników.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="space-y-4">
            <h3 className="text-2xl font-bold">Ranking</h3>
            <p className="text-sm text-slate-300">Najlepszy czas dla każdego zestawu ustawień.</p>

            <div className="space-y-2">
              {leaderboard.map((entry, index) => (
                <div
                  key={`leader-${entry.id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-500/30 bg-slate-950/40 px-3 py-2"
                >
                  <div>
                    <p className="font-semibold text-slate-100">
                      #{index + 1} {entry.studentName}
                    </p>
                    <p className="text-xs text-slate-300">
                      Klasa {entry.grade} · {difficultyLabel(entry.difficulty)} · {opDisplay(entry.operations)}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-cyan-100">{formatMs(entry.elapsedMs)}</p>
                </div>
              ))}

              {leaderboard.length === 0 && <p className="text-sm text-slate-300">Brak wpisów.</p>}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
