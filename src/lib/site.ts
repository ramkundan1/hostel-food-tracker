// The public address of the site, without a trailing slash. APP_URL is already
// set in Vercel; the fallback keeps local builds working.
export const SITE_URL = (process.env.APP_URL ?? "https://rkundan.com.np").replace(
  /\/$/,
  ""
);

export const SITE_NAME = "e-tracker";

export const SITE_TITLE =
  "e-tracker — Meal and expense tracker for students (Nepali calendar)";

export const SITE_DESCRIPTION =
  "Log lunch and dinner, add every other purchase, and see your full monthly spending in the Nepali calendar. Built for students and hostel residents.";
