// Miłe zaczepki: {what} to nazwa prezentu lub kompletu, {amount} to brakująca kwota.
const LINES = [
  "Mikołaju kochany, do {what} brakuje tylko {amount}. Renifery mówią, że masz dobre serce.",
  "Elfy już prawie zapakowały {what}. Zabrakło {amount} i teraz patrzą na Ciebie wielkimi oczami.",
  "Tylko {amount} dzieli kogoś od {what}. A ten ktoś był w tym roku naprawdę grzeczny. No, prawie.",
  "{amount}. Tyle co nic, a {what} śniłoby się komuś aż do Wielkanocy.",
  "Rudolf obiecał, że odda Ci te {amount} w marchewkach. {what} czeka.",
  "Bez {what} pod choinką będzie jakoś pusto. A to tylko {amount} więcej…",
  "Ktoś bardzo po cichu marzy o {what}. Brakuje {amount}. Nie żebyśmy naciskali.",
  "Pani Mikołajowa mówi, że {amount} to żaden wydatek, a {what} to sama radość.",
  "Elf Zenek założył się z reniferami, że dołożysz {amount} na {what}. Nie daj mu przegrać.",
  "W worku jest jeszcze miejsce na {what}. W portfelu trzeba by znaleźć {amount}.",
  "{what} stoi już przy saniach i macha. Bilet kosztuje {amount}.",
  "Gwiazdka z nieba byłaby droższa. {what} to tylko {amount} ponad plan.",
  "Renifery głosowały i wyszło jednogłośnie: {what}. Dopłata {amount}, Rudolf wstrzymał się od głosu.",
  "Podobno prawdziwy Mikołaj nie liczy drobnych. {amount} i {what} jedzie pod choinkę.",
  "Śnieżynka z działu pakowania pyta, czy ma już szykować kokardę na {what}. To {amount} więcej.",
  "Jeszcze {amount} i {what} ląduje w saniach. Sanie udźwigną, sprawdzaliśmy.",
  "Bałwan przed domem nic nie mówi, ale wymownie patrzy na {what}. Brakuje {amount}.",
  "Za {amount} więcej ktoś rozpakuje {what} i będzie się uśmiechać do Trzech Króli.",
  "Elfy liczyły trzy razy i wciąż wychodzi to samo: {what} wymaga dopłaty {amount}. Przepraszają, że pytają.",
  "Mikołaju, to tylko {amount}. A {what} zostaje z kimś na lata.",
];

export function nudgeLine(seed: number, what: string, amount: string): string {
  const line = LINES[Math.abs(seed) % LINES.length]
    .replace("{what}", what)
    .replace("{amount}", amount);
  return line.charAt(0).toUpperCase() + line.slice(1);
}

// Podmiana: {what} wchodzi w miejsce {instead}, po dołożeniu {amount}.
const SWAP_LINES = [
  "Elfy podpowiadają: dołóż {amount}, a zamiast {instead} pod choinkę trafi {what}.",
  "Mała zamiana? {what} w miejsce {instead} to tylko {amount} więcej. Reszta zostaje bez zmian.",
  "Rudolf pyta nieśmiało: a może {what} zamiast {instead}? Różnica to {amount}.",
  "Pani Mikołajowa proponuje roszadę: {what} zamiast {instead}. Kosztuje to {amount} więcej.",
  "Elfy przepakowałyby sanie: {what} w miejsce {instead}. Trzeba dołożyć {amount}.",
  "A gdyby tak {what} zamiast {instead}? Dopłata {amount}, reszta worka bez zmian.",
  "Renifery kręcą nosami na pomysł, ale elfy są za: {what} zamiast {instead}, za {amount} więcej.",
  "Jedna zamiana i gotowe: {what} wskakuje w miejsce {instead}. Dopłata wynosi {amount}.",
];

export function swapLine(seed: number, what: string, instead: string, amount: string): string {
  const line = SWAP_LINES[Math.abs(seed) % SWAP_LINES.length]
    .replace("{what}", what)
    .replace("{instead}", instead)
    .replace("{amount}", amount);
  return line.charAt(0).toUpperCase() + line.slice(1);
}

/**
 * Zaczepki widoczne naraz dostają różne teksty: każda zaczyna od swojego ziarna,
 * a gdy tekst jest już zajęty, bierze następny wolny.
 */
export function distinctSeeds(seeds: number[], swap: boolean[]): number[] {
  const used = [new Set<number>(), new Set<number>()];
  return seeds.map((seed, i) => {
    const size = swap[i] ? SWAP_LINES.length : LINES.length;
    const taken = used[swap[i] ? 1 : 0];
    let idx = Math.abs(seed) % size;
    for (let k = 0; k < size && taken.has(idx); k++) idx = (idx + 1) % size;
    taken.add(idx);
    return idx;
  });
}
