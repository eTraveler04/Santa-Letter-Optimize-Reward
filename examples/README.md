# Przykłady do API

Do każdego żądania dodaj nagłówki `content-type: application/json`
i `x-api-key: <hasło listy albo ADMIN_API_KEY z .env.local>`.
`:slug` to adres listy, np. `moja-lista` (widać go w adresie strony `/l/<slug>`).

| Plik | Metoda i ścieżka | Co robi |
| --- | --- | --- |
| `01-prezent.json` | `POST /api/lists/:slug/gifts` | jeden prezent bez grupy |
| `02-kilka-prezentow.json` | `POST /api/lists/:slug/gifts` | kilka prezentów bez grupy naraz |
| `03-prezenty-do-kompletu.json` | `POST /api/lists/:slug/gifts` | prezenty, które potem trafią do grupy |
| `04-grupa.json` | `POST /api/lists/:slug/groups` | łączy prezenty w komplet |
| `05-prezent-w-istniejacej-grupie.json` | `POST /api/lists/:slug/gifts` | nowy prezent od razu w grupie |
| `06-zmiana-grupy.json` | `PATCH /api/lists/:slug/groups/:id` | zmienia opis i podmienia cały skład |
| `07-wyjecie-z-grupy.json` | `PATCH /api/lists/:slug/gifts/:id` | wyjmuje prezent z grupy |
| `08-zmiana-prezentu.json` | `PATCH /api/lists/:slug/gifts/:id` | zmienia rangę, cenę, powód |
| `09-odblokowanie.json` | `PATCH /api/lists/:slug/gifts/:id` | zdejmuje „zaklepane" |
| `10-grupa-z-nowymi-prezentami.json` | `POST /api/lists/:slug/groups` | tworzy grupę i jej prezenty jednym żądaniem, bez znajomości id |

Numery w `giftIds` i `groupId` są przykładowe: wstaw `id`, które API zwróciło
przy dodawaniu (plik 04 zakłada, że prezenty z pliku 03 dostały 5, 6, 7).

Przykład z curl:

```bash
curl -X POST http://localhost:3000/api/lists/moja-lista/gifts \
  -H "content-type: application/json" -H "x-api-key: $HASLO" \
  -d @examples/01-prezent.json
```
