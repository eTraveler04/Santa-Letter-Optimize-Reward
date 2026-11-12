# Lista życzeń pod choinkę

Next.js (strona + API w jednym), dane w SQLite (`data/xmas.db`, tworzy się sam).

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # testy algorytmu doboru
npm run build && npm start   # wersja produkcyjna
```

## Wdrożenie na Coolify

1. **New resource → Public repository** (albo GitHub App), gałąź `main`.
2. **Build pack: Dockerfile** (nie Nixpacks i nie Docker Compose). Port: `3000`.
3. **Environment variables**: `ADMIN_API_KEY` (np. `openssl rand -hex 16`) i opcjonalnie
   `ANTHROPIC_API_KEY`. Oba są potrzebne tylko w czasie działania, nie przy budowaniu.
4. **Persistent storage → Volume mount** z celem `/data`. Bez tego baza znika przy każdym wdrożeniu.
   Ma to być wolumen, nie „bind mount" katalogu z hosta: aplikacja działa jako użytkownik `node`
   i w katalogu należącym do roota nie utworzy bazy.
5. Domena w polu **Domains** z `https://`; certyfikat wystawi proxy Coolify.

Obraz ma własny `HEALTHCHECK` (pyta `/api/lists`), więc Coolify przełącza ruch na nową wersję dopiero,
gdy ta odpowiada. Zrzut bazy z terminala kontenera w Coolify: `dump-db` (ląduje w `/data/backups`).

## Wdrożenie na VPS (Docker)

Na serwerze potrzebny jest Docker z wtyczką Compose. W katalogu projektu:

```bash
cp .env.example .env      # uzupełnij ADMIN_API_KEY i (opcjonalnie) ANTHROPIC_API_KEY
docker compose up -d --build
```

Aplikacja słucha na porcie 3000. Baza leży w wolumenie `xmas-data` (w kontenerze `/data/xmas.db`),
więc przeżywa przebudowanie obrazu. Aktualizacja: `git pull && docker compose up -d --build`.

Przeniesienie obecnej bazy z komputera na serwer (przy zatrzymanej aplikacji):

```bash
./scripts/dump-db.sh backups                      # lokalnie: powstaje backups/xmas-DATA.db
scp backups/xmas-DATA.db serwer:~/xmas/xmas.db    # na serwer
docker compose cp xmas.db xmas:/data/xmas.db      # na serwerze, w katalogu projektu
docker compose exec -u root xmas chown node:node /data/xmas.db
docker compose restart
```

HTTPS najprościej dodać przez reverse proxy (Caddy, nginx) kierujące na `localhost:3000`.

## Zrzut bazy

`scripts/dump-db.sh` robi spójną kopię także przy działającej aplikacji. Wymaga programu `sqlite3`.

```bash
./scripts/dump-db.sh              # data/backups/xmas-DATA.sql + xmas-DATA.db
./scripts/dump-db.sh /inny/katalog
./scripts/dump-db.sh - > dump.sql # sam SQL na standardowe wyjście
```

W kontenerze skrypt jest dostępny jako `dump-db`:

```bash
docker compose exec xmas dump-db                    # do /data/backups w wolumenie
docker compose exec -T xmas dump-db - > dump.sql    # SQL prosto na dysk serwera
```

Odtworzenie: zatrzymaj aplikację i podmień plik bazy kopią `.db`, albo wczytaj SQL do pustego pliku:
`sqlite3 nowa.db < dump.sql`.

## Wiele list

Każda osoba ma własną listę z własnym adresem i hasłem.

- `/` strona główna: wszystkie listy i formularz „Załóż swoją listę" (nazwa + hasło do edycji)
- `/l/<slug>` strona Mikołaja dla jednej listy
- `/l/<slug>/admin` panel dodawania, edycji i usuwania prezentów oraz kompletów tej listy,
  a także zmiana nazwy, hasła i usunięcie listy

`<slug>` powstaje z nazwy przy zakładaniu (np. „Ania Żółw" → `ania-zolw`) i nie zmienia się
po zmianie nazwy. Hasła są przechowywane jako skrót (scrypt).

`ADMIN_API_KEY` z `.env.local` jest kluczem głównym: działa jako hasło do każdej listy.
Lista przeniesiona ze starej wersji (`moja-lista`) nie ma własnego hasła, dopóki go nie ustawisz
w jej panelu, więc do tego czasu edytuje się ją kluczem głównym.

## API

Zapis wymaga nagłówka `x-api-key` z hasłem danej listy albo kluczem głównym.
Odczyt (`GET`), zakładanie list i zapis zaznaczeń Mikołaja są otwarte.

### Listy

| Metoda | Ścieżka | Opis |
| --- | --- | --- |
| GET | `/api/lists` | wszystkie listy |
| POST | `/api/lists` | zakłada listę: `{ "name", "password" }` (hasło od 4 znaków) |
| GET | `/api/lists/:slug` | jedna lista |
| PATCH | `/api/lists/:slug` | zmienia `name` i/lub `password` |
| DELETE | `/api/lists/:slug` | usuwa listę z prezentami i grupami |
| POST | `/api/lists/:slug/auth` | sprawdza hasło z `x-api-key`: 200 albo 401 |

### Prezenty

| Metoda | Ścieżka | Opis |
| --- | --- | --- |
| GET | `/api/lists/:slug/gifts` | lista (ranga malejąco, potem alfabet, potem data dodania) |
| POST | `/api/lists/:slug/gifts` | dodaje jeden prezent (obiekt) albo kilka (tablica) |
| GET | `/api/lists/:slug/gifts/:id` | jeden prezent |
| PATCH | `/api/lists/:slug/gifts/:id` | zmienia dowolne pola, także `chosen` i `groupId` |
| DELETE | `/api/lists/:slug/gifts/:id` | usuwa |

Pola prezentu:

- `name` tekst, wymagane
- `price` liczba w złotych, np. `199.99`, wymagane
- `url` link do sklepu (http/https), wymagane
- `rank` liczba naturalna, wyższa = bardziej pożądany, wymagane
- `reason` po co mi to (tekst, opcjonalne); pokazuje się przy prezencie bez grupy
- `groupId` id grupy z tej samej listy albo `null` (opcjonalne)
- `chosen` `true`/`false`, tylko w PATCH (np. żeby odblokować zaklepany prezent)

```bash
curl -X POST http://localhost:3000/api/lists/moja-lista/gifts \
  -H "content-type: application/json" -H "x-api-key: $HASLO" \
  -d @examples/01-prezent.json
```

### Grupy (komplety: wszystko albo nic)

| Metoda | Ścieżka | Opis |
| --- | --- | --- |
| GET | `/api/lists/:slug/groups` | lista grup z `giftIds` i sumą |
| POST | `/api/lists/:slug/groups` | `{ "name", "reason"?, "giftIds"?: [...], "gifts"?: [...] }`, razem co najmniej 2 prezenty |
| GET | `/api/lists/:slug/groups/:id` | jedna grupa |
| PATCH | `/api/lists/:slug/groups/:id` | zmienia `name`, `reason`, `giftIds` (podmienia skład) |
| DELETE | `/api/lists/:slug/groups/:id` | rozwiązuje grupę, prezenty zostają |

`giftIds` to id istniejących prezentów z tej listy, `gifts` to nowe prezenty (te same pola co przy
dodawaniu prezentu), które powstaną razem z grupą. Można podać jedno, drugie albo oba.

Prezent należy do najwyżej jednej grupy. Grupa, w której zostałby mniej niż 2 prezenty
(po usunięciu albo przeniesieniu prezentu), rozwiązuje się sama.
Przy komplecie na stronie pokazuje się `reason` grupy, a nie pojedynczych prezentów.

### Zaznaczenia Mikołaja

`PUT /api/lists/:slug/selection` z `{ "santaId": "...", "giftIds": [...] }`. Strona wywołuje to sama
po każdej zmianie zaznaczeń. Ustawia `chosen` na wskazanych wolnych prezentach tej listy, zwalnia
te, które ten sam Mikołaj wcześniej miał, i nie rusza cudzych.

### List z podziękowaniami

Trufle: strona dopisuje do tego żądania `"truffles": N` (opakowania uzbierane po „Dobieram jeszcze").
Serwer zapisuje je w tabeli `santas` i nigdy nie trzyma więcej opakowań niż prezentów danego Mikołaja.
`GET /api/lists/:slug/truffles` (z hasłem listy w `x-api-key`) zwraca zestawienie dla właściciela;
to samo widać w panelu w sekcji „Trufle dla Mikołajów".

`POST /api/lists/:slug/letter` z `{ "santaId": "...", "fresh"?: true }` zwraca `{ gifts, letter, source }`.
Prezenty bierze z bazy (to, co ten Mikołaj ma zaznaczone na tej liście). `source` to `claude` albo
`fallback`. Ten sam wybór dostaje ten sam list z pamięci serwera; `fresh: true` wymusza nowy.

## List od Claude

Po kliknięciu „Wybieram" Mikołaj trafia na `/l/<slug>/podsumowanie` z listem z podziękowaniami,
w którym pojawia się każdy wybrany prezent, i z linkami do sklepów.

Klucz wpisuje się w `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Po zmianie klucza trzeba zrestartować serwer. Bez klucza (albo gdy API zwróci błąd) list powstaje
z gotowego szablonu, więc strona działa zawsze. Przycisk „Udostępnij list jako obrazek" robi z listu
plik PNG i otwiera systemowe udostępnianie (na komputerze zapisuje plik). List pisze model `claude-opus-5-5`
(`src/lib/letter.ts`) i może nazwy prezentów odmieniać lub skracać. Jeśli któregoś prezentu
nie da się w liście rozpoznać, serwer dopisuje go w postscriptum.

## Jak działa dobór

- Prezenty zaklepane przez innych nie biorą udziału.
- „Najmniej prezentów": jak najwyższa suma w budżecie, przy remisie mniej sztuk.
- „Najwięcej prezentów": jak najwięcej sztuk, przy remisie jak najwyższa suma.
- Dalsze remisy wygrywa zestaw o wyższej sumie rang.
- „Komplety kupuj w całości": grupa liczy się jako jedna pozycja; po wyłączeniu każdy prezent osobno.
- Zaczepka nigdy nie przebudowuje wyboru. Najpierw szuka dokładek: prezentów, które zmieszczą się
  obok dotychczasowego wyboru po dołożeniu najwyżej 25% budżetu (minimum 30 zł tolerancji).
  Gdy dokładek nie ma, proponuje jedną zamianę: jeden wybrany prezent za jeden droższy, z tą samą
  granicą dopłaty. Prezent, który wypadł przez zamianę, nie wraca w kolejnych zaczepkach
  aż do ponownego „Dobierz prezenty".
