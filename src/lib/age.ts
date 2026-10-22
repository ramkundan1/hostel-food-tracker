// The youngest age allowed to use e-tracker.
export const MIN_AGE = 16;
export const MAX_AGE = 120;

// Whole years old today, or null when the date isn't a real calendar date.
// Takes an English (AD) date written as YYYY-MM-DD.
export function ageFrom(dateOfBirth: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const probe = new Date(Date.UTC(year, month - 1, day));

  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }

  const now = new Date();
  let age = now.getUTCFullYear() - year;

  const hadBirthday =
    now.getUTCMonth() + 1 > month ||
    (now.getUTCMonth() + 1 === month && now.getUTCDate() >= day);

  if (!hadBirthday) age -= 1;

  return age;
}
