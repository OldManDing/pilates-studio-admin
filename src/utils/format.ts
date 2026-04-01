export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0
  }).format(value);

export const formatPercent = (value: number) => `${value.toFixed(1)}%`;

export const getToneColor = (tone: string = 'mint') => {
  const map: Record<string, { solid: string; soft: string }> = {
    mint: { solid: '#43c7ab', soft: '#e8fbf5' },
    violet: { solid: '#8b7cff', soft: '#efedff' },
    orange: { solid: '#ffb760', soft: '#fff4e5' },
    pink: { solid: '#ff8da8', soft: '#fff0f4' },
    blue: { solid: '#73a7ff', soft: '#eef5ff' }
  };

  return map[tone] ?? map.mint;
};
