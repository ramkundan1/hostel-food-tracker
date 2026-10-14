// Shared by the profile form (instant feedback) and /api/profile (the real
// check). A blocklist can never be complete, so this is a first line of
// defence against obviously inappropriate names, not a guarantee.

export type NameCheck =
  | {
      ok: true;
      firstName: string;
      middleName: string;
      lastName: string;
      fullName: string;
    }
  | { ok: false; error: string };

// Letters (any language) with optional single hyphens or apostrophes inside,
// e.g. "Anne-Marie", "O'Brien". No digits, spaces, symbols or emoji.
const NAME_PATTERN = new RegExp(
  String.raw`^[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*$`,
  "u"
);

// Matched against a whole name part, so real names that merely contain these
// letters (Shital, Dickson, Slutsky...) are not blocked. Also stops people
// impersonating the app on the leaderboard.
const BLOCKED_WORDS = new Set([
  "ass",
  "arse",
  "sex",
  "dick",
  "cock",
  "cum",
  "tit",
  "tits",
  "slut",
  "sluts",
  "fag",
  "porn",
  "porno",
  "pedo",
  "nazi",
  "nazis",
  "penis",
  "vagina",
  "anus",
  "xxx",
  "shit",
  "shitty",
  "admin",
  "administrator",
  "moderator",
  "support",
  "staff",
  "official",
  "eatrack",
  "etracker",
]);

// Matched anywhere inside the letters-only name (parts joined together, so
// splitting a word across fields doesn't get around it).
const BLOCKED_FRAGMENTS = [
  "fuck",
  "bitch",
  "cunt",
  "whore",
  "bastard",
  "asshole",
  "pussy",
  "blowjob",
  "handjob",
  "cumshot",
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "rapist",
  "hitler",
  "terrorist",
  "masturbat",
  "hentai",
  "dildo",
  "chutiya",
  "madarchod",
  "behenchod",
  "bhenchod",
  "bhosd",
  "gandu",
  "machikne",
];

// Start of each word segment, built from a string so older TypeScript targets
// don't complain about Unicode property escapes.
const WORD_START = new RegExp(String.raw`(^|['’-])(\p{L})`, "gu");

function tidy(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

// "ram" / "RAM" -> "Ram"; mixed case such as "McDonald" is left as typed.
function capitalise(part: string): string {
  if (part !== part.toLowerCase() && part !== part.toUpperCase()) return part;

  return part
    .toLowerCase()
    .replace(WORD_START, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

function looksLikeAName(word: string): boolean {
  return NAME_PATTERN.test(word);
}

// Four or more of the same letter in a row ("Aaaaa") isn't a real name.
function isGibberish(word: string): boolean {
  return /(.)\1{3,}/iu.test(word);
}

export function checkName(input: {
  firstName?: unknown;
  middleName?: unknown;
  lastName?: unknown;
}): NameCheck {
  const first = tidy(input.firstName);
  const middle = tidy(input.middleName);
  const last = tidy(input.lastName);

  if (!first) return { ok: false, error: "Enter your first name." };
  if (!last) return { ok: false, error: "Enter your last name." };

  if (first.length < 2 || first.length > 30) {
    return { ok: false, error: "First name must be 2 to 30 letters." };
  }

  if (last.length < 2 || last.length > 30) {
    return { ok: false, error: "Last name must be 2 to 30 letters." };
  }

  if (middle.length > 30) {
    return { ok: false, error: "Middle name must be 30 letters or fewer." };
  }

  if (!looksLikeAName(first) || !looksLikeAName(last)) {
    return {
      ok: false,
      error:
        "Names can only contain letters, hyphens and apostrophes — no spaces, numbers or symbols.",
    };
  }

  // Middle names may be several words ("Kumar Prasad"), each checked on its own.
  const middleWords = middle ? middle.split(" ") : [];

  if (middleWords.some((word) => !looksLikeAName(word))) {
    return {
      ok: false,
      error:
        "Middle name can only contain letters, hyphens and apostrophes.",
    };
  }

  if ([first, ...middleWords, last].some(isGibberish)) {
    return { ok: false, error: "That doesn't look like a real name." };
  }

  const words = [first, ...middleWords, last].map((w) => w.toLowerCase());
  const lettersOnly = words.join("").replace(/[^a-z]/g, "");

  const blocked =
    words.some((w) => BLOCKED_WORDS.has(w.replace(/[^a-z]/g, ""))) ||
    BLOCKED_FRAGMENTS.some((fragment) => lettersOnly.includes(fragment));

  if (blocked) {
    return {
      ok: false,
      error: "Please use your real name — that one isn't allowed.",
    };
  }

  const firstName = capitalise(first);
  const middleName = middleWords.map(capitalise).join(" ");
  const lastName = capitalise(last);

  return {
    ok: true,
    firstName,
    middleName,
    lastName,
    fullName: [firstName, middleName, lastName].filter(Boolean).join(" "),
  };
}
