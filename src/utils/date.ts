const padDatePart = (value: number) => String(value).padStart(2, '0');

export const formatLocalDateParam = (date: Date): string =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
