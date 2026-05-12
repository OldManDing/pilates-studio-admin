import { BadRequestException } from '@nestjs/common';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const BUSINESS_TIME_ZONE = 'Asia/Shanghai';
const BUSINESS_TIME_ZONE_OFFSET_MINUTES = 8 * 60;

const parseDateOnlyParts = (value: string, fieldName: string) => {
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  const normalized = new Date(Date.UTC(year, month - 1, day));
  const isValid =
    normalized.getUTCFullYear() === year &&
    normalized.getUTCMonth() === month - 1 &&
    normalized.getUTCDate() === day;

  if (!isValid) {
    throw new BadRequestException(`Invalid ${fieldName} date value: ${value}`);
  }

  return { year, month, day };
};

const parseBusinessDateOnly = (
  value: string,
  endOfDay: boolean,
  fieldName: string,
): Date => {
  const { year, month, day } = parseDateOnlyParts(value, fieldName);
  const utcTime = Date.UTC(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );

  return new Date(utcTime - BUSINESS_TIME_ZONE_OFFSET_MINUTES * 60 * 1000);
};

export const getBusinessDateParam = (date = new Date()): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new BadRequestException('Invalid business date value');
  }

  return `${year}-${month}-${day}`;
};

export const parseDateValue = (
  value: string,
  endOfDay: boolean,
  fieldName: string,
): Date => {
  if (DATE_ONLY_PATTERN.test(value)) {
    return parseBusinessDateOnly(value, endOfDay, fieldName);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`Invalid ${fieldName} date value: ${value}`);
  }

  return parsed;
};

export const buildDateRange = (
  from?: string,
  to?: string,
  fieldName = 'date',
): { gte?: Date; lte?: Date } | undefined => {
  if (!from && !to) {
    return undefined;
  }

  const range: { gte?: Date; lte?: Date } = {};

  if (from) {
    range.gte = parseDateValue(from, false, `${fieldName}.from`);
  }

  if (to) {
    range.lte = parseDateValue(to, true, `${fieldName}.to`);
  }

  if (range.gte && range.lte && range.gte > range.lte) {
    throw new BadRequestException(`Invalid ${fieldName} range: from must be earlier than to`);
  }

  return range;
};
