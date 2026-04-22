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
