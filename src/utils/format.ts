export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0,
  }).format(value);

export const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const toneColorMap: Record<string, { solid: string; soft: string; text: string; border: string }> =
  {
    mint: {
      solid: 'var(--mint)',
      soft: 'var(--mint-soft)',
      text: 'var(--text-mint)',
      border: 'color-mix(in srgb, var(--mint) 18%, transparent)',
    },
    violet: {
      solid: 'var(--violet)',
      soft: 'var(--violet-soft)',
      text: 'var(--text-violet)',
      border: 'color-mix(in srgb, var(--violet) 18%, transparent)',
    },
    orange: {
      solid: 'var(--orange)',
      soft: 'var(--orange-soft)',
      text: 'var(--text-orange)',
      border: 'color-mix(in srgb, var(--orange) 18%, transparent)',
    },
    pink: {
      solid: 'var(--pink)',
      soft: 'var(--pink-soft)',
      text: 'var(--text-pink)',
      border: 'color-mix(in srgb, var(--pink) 18%, transparent)',
    },
  };

export const getToneColor = (tone: string = 'mint') => {
  return toneColorMap[tone] ?? toneColorMap.mint;
};
