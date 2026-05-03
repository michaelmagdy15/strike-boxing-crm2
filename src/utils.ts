export function cleanData(data: any): any {
  if (data === null || data === undefined) return undefined;
  if (Array.isArray(data)) return data.map(cleanData).filter((v: any) => v !== undefined);
  if (typeof data === 'object' && !(data instanceof Date)) {
    const clean: any = {};
    Object.keys(data).forEach(key => {
      const val = cleanData(data[key]);
      if (val !== undefined) {
        clean[key] = val;
      }
    });
    return clean;
  }
  return data;
}

/**
 * Convert UTC date to Egypt time (GMT+2)
 * @param dateString ISO date string in UTC
 * @returns Date object adjusted to Egypt timezone
 */
export function toEgyptTime(dateString: string): Date {
  const utcDate = new Date(dateString);
  // Egypt is GMT+2 (UTC+2)
  const egyptDate = new Date(utcDate.getTime() + (2 * 60 * 60 * 1000));
  return egyptDate;
}
