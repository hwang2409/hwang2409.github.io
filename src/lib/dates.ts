const monthNumbers = new Map([
  ['january', '01'],
  ['february', '02'],
  ['march', '03'],
  ['april', '04'],
  ['may', '05'],
  ['june', '06'],
  ['july', '07'],
  ['august', '08'],
  ['september', '09'],
  ['october', '10'],
  ['november', '11'],
  ['december', '12'],
]);

export function formatDate(value: string): string {
  const date = value.trim();
  const slashDate = /^(\d{2})\/(\d{2})\/(\d{4})$/u.exec(date);
  if (slashDate) {
    return `${slashDate[3]}-${slashDate[1]}-${slashDate[2]}`;
  }

  const monthDate = /^([a-z]+)\s+(\d{1,2}),\s*(\d{4})$/iu.exec(date);
  if (monthDate) {
    const month = monthNumbers.get(monthDate[1].toLowerCase());
    if (month) {
      return `${monthDate[3]}-${month}-${monthDate[2].padStart(2, '0')}`;
    }
  }

  return date;
}
