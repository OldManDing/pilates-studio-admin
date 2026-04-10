import { BadRequestException } from '@nestjs/common';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const parseDateValue = (
  value: string,
  endOfDay: boolean,
  fieldName: string,
): Date => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`Invalid ${fieldName} date value: ${value}`);
  }

  if (DATE_ONLY_PATTERN.test(value) && endOfDay) {
    parsed.setHours(23, 59, 59, 999);
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
