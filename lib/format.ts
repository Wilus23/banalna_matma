export const formatMs = (ms: number): string => {
  if (!Number.isFinite(ms) || ms < 0) {
    return '0.00 s';
  }

  return `${(ms / 1000).toFixed(2)} s`;
};

export const formatPercent = (value: number): string => {
  const clamped = Math.min(1, Math.max(0, value));
  return `${(clamped * 100).toFixed(1)}%`;
};

export const formatDateTime = (isoDate: string): string => {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return 'Nieprawidłowa data';
  }

  return new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};
