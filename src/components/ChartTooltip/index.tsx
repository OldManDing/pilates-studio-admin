import type { ReactNode } from 'react';
import pageCls from '@/styles/page.module.css';

type TooltipValue = number | string | Array<number | string>;

type TooltipEntry = {
  color?: string;
  dataKey?: number | string;
  fill?: string;
  name?: number | string;
  payload?: Record<string, unknown>;
  stroke?: string;
  value?: TooltipValue;
};

type TooltipRendererProps = {
  active?: boolean;
  label?: number | string;
  payload?: TooltipEntry[];
};

type ChartTooltipOptions = {
  itemLabelFormatter?: (entry: TooltipEntry) => ReactNode;
  labelMap?: Record<string, ReactNode>;
  titleFormatter?: (label: TooltipRendererProps['label'], payload: TooltipEntry[]) => ReactNode;
  valueFormatter?: (value: TooltipEntry['value'], entry: TooltipEntry) => ReactNode;
};

type ChartTooltipProps = TooltipRendererProps & ChartTooltipOptions;

function getEntryLookupKey(entry: TooltipEntry) {
  if (typeof entry.dataKey === 'string') {
    return entry.dataKey;
  }

  if (typeof entry.name === 'string') {
    return entry.name;
  }

  return '';
}

function ChartTooltipContent({ active, itemLabelFormatter, label, labelMap = {}, payload = [], titleFormatter, valueFormatter }: ChartTooltipProps) {
  if (!active || payload.length === 0) {
    return null;
  }

  const seenKeys = new Set<string>();
  const items = payload.filter((entry, index) => {
    if (entry.value === undefined || entry.value === null) {
      return false;
    }

    const entryKey = String(entry.dataKey ?? entry.name ?? index);
    if (seenKeys.has(entryKey)) {
      return false;
    }

    seenKeys.add(entryKey);
    return true;
  });

  if (items.length === 0) {
    return null;
  }

  const title = titleFormatter?.(label, items) ?? label ?? items[0]?.name ?? '';

  return (
    <div className={pageCls.chartTooltip}>
      {title ? <div className={pageCls.chartTooltipTitle}>{title}</div> : null}
      <div className={pageCls.chartTooltipList}>
        {items.map((entry, index) => {
          const lookupKey = getEntryLookupKey(entry);
          const itemLabel = itemLabelFormatter?.(entry) ?? (lookupKey ? labelMap[lookupKey] : undefined) ?? entry.name ?? entry.dataKey ?? '数据';
          const itemValue = valueFormatter?.(entry.value, entry) ?? entry.value;
          const itemKey = String(entry.dataKey ?? entry.name ?? index);

          return (
            <div key={itemKey} className={pageCls.chartTooltipItem}>
              <div className={pageCls.chartTooltipLabel}>
                <span
                  className={pageCls.chartTooltipDot}
                  style={{ ['--tooltip-color' as string]: entry.color ?? entry.fill ?? entry.stroke ?? 'var(--text-tertiary)' }}
                />
                {itemLabel}
              </div>
              <span className={pageCls.chartTooltipValue}>{itemValue}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const createChartTooltip = (options: ChartTooltipOptions = {}) => {
  const TooltipRenderer = (props: TooltipRendererProps) => <ChartTooltipContent {...props} {...options} />;
  return TooltipRenderer;
};

export default ChartTooltipContent;
