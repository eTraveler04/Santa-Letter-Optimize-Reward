// Przy dużych sumach Mikołaj nie musi widzieć całej kwoty: pokazujemy jej początek i żart.
const LIMIT_CENTS = 1500 * 100;

const LINES = [
  "ekhm, w święta nie liczy się, ile się wydaje, tylko ile radości się daje.",
  "ekhm, a zresztą kto by to liczył. Renifery na pewno nie.",
  "i w tym miejscu elfowi z księgowości skończył się atrament.",
  "dalej Mikołaj nie doczytał, bo zaparowały mu okulary.",
  "resztę cyfr zjadł Rudolf. Twierdzi, że smakowały piernikiem.",
  "ciii, o pieniądzach przy choince się nie rozmawia.",
  "reszta kwoty utknęła w kominie. Wyciągniemy ją po świętach.",
  "ekhm, uśmiech obdarowanej osoby jest przecież bezcenny.",
];

/**
 * Dla sum powyżej 1500 zł zwraca początek kwoty i żartobliwe dokończenie,
 * np. { shown: "36…", line: "ekhm, …" }. Dla mniejszych zwraca null.
 */
export function shyTotal(cents: number): { shown: string; line: string } | null {
  if (cents <= LIMIT_CENTS) return null;
  const zl = String(Math.floor(cents / 100));
  return { shown: `${zl.slice(0, 2)}…`, line: LINES[Math.floor(cents / 100) % LINES.length] };
}
