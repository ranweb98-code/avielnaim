const COMMON_FIRST_NAMES: Record<string, string> = {
  amit: "עמית",
  david: "דוד",
  yuval: "יובל",
  daniel: "דניאל",
  uri: "אורי",
  or: "אור",
  ron: "רון",
  tom: "תום",
  tomer: "תומר",
  noam: "נועם",
  yonatan: "יונתן",
  yehonatan: "יהונתן",
  avi: "אבי",
  alon: "אלון",
  nir: "ניר",
  amir: "אמיר",
  shai: "שי",
  roi: "רועי",
  roey: "רועי",
  ido: "עידו",
  idan: "עידן",
  nadav: "נדב",
  yosef: "יוסף",
  yitzhak: "יצחק",
  israel: "ישראל",
  sharon: "שרון",
  michael: "מיכאל",
  shimon: "שמעון",
  yehuda: "יהודה",
  netanel: "נתנאל",
  itamar: "איתמר",
  elia: "אליה",
  eliyahu: "אליהו",
  harel: "הראל",
  shimi: "שימי",
  shlomi: "שלומי",
};

const COMMON_LAST_NAMES: Record<string, string> = {
  pepper: "פפר",
  cohen: "כהן",
  levy: "לוי",
  david: "דוד",
  hadad: "חדד",
  sabag: "סבאג",
};

const CHAR_MAP: Record<string, string> = {
  a: "א",
  b: "ב",
  c: "ק",
  d: "ד",
  e: "ה",
  f: "פ",
  g: "ג",
  h: "ה",
  i: "י",
  j: "ג'",
  k: "ק",
  l: "ל",
  m: "מ",
  n: "נ",
  o: "ו",
  p: "פ",
  q: "ק",
  r: "ר",
  s: "ס",
  t: "ט",
  u: "ו",
  v: "ב",
  w: "ו",
  x: "קס",
  y: "י",
  z: "ז",
  "'": "",
  "-": " ",
};

export function isEnglishName(name: string): boolean {
  return /^[A-Za-z\s\-'.]+$/.test(name.trim());
}

function transliterateWord(word: string): string {
  const lower = word.toLowerCase();
  if (COMMON_LAST_NAMES[lower]) return COMMON_LAST_NAMES[lower];
  if (COMMON_FIRST_NAMES[lower]) return COMMON_FIRST_NAMES[lower];

  let result = "";
  for (const char of lower) {
    result += CHAR_MAP[char] ?? "";
  }
  return result.trim();
}

export function transliterateNameToHebrew(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || !isEnglishName(trimmed)) return trimmed;

  return trimmed
    .split(/\s+/)
    .map((part) => {
      const lower = part.toLowerCase();
      return (
        COMMON_FIRST_NAMES[lower] ??
        COMMON_LAST_NAMES[lower] ??
        transliterateWord(part)
      );
    })
    .filter(Boolean)
    .join(" ");
}

export function pickPreferredName(a: string, b: string): string {
  const aHebrew = !isEnglishName(a);
  const bHebrew = !isEnglishName(b);
  if (aHebrew && !bHebrew) return a.trim();
  if (bHebrew && !aHebrew) return b.trim();
  return a.trim().length >= b.trim().length ? a.trim() : b.trim();
}
