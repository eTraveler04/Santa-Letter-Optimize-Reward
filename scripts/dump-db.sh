#!/bin/sh
# Zrzut bazy listy życzeń. Bezpieczny przy działającej aplikacji (spójna kopia przez sqlite3).
#
#   dump-db.sh [katalog]   zapisuje <katalog>/xmas-DATA.sql (tekst SQL) i xmas-DATA.db (kopia binarna)
#   dump-db.sh -           wypisuje sam SQL na standardowe wyjście
#
# Baza: zmienna DB_PATH, domyślnie data/xmas.db. Katalog domyślny: backups obok bazy.
set -eu

DB="${DB_PATH:-data/xmas.db}"
TARGET="${1:-$(dirname "$DB")/backups}"

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "Brak programu sqlite3." >&2
  exit 1
fi
if [ ! -f "$DB" ]; then
  echo "Nie ma pliku bazy: $DB (ustaw DB_PATH)." >&2
  exit 1
fi

if [ "$TARGET" = "-" ]; then
  sqlite3 -readonly "$DB" .dump
  exit 0
fi

mkdir -p "$TARGET"
STAMP="$(date +%Y%m%d-%H%M%S)"
SQL="$TARGET/xmas-$STAMP.sql"
COPY="$TARGET/xmas-$STAMP.db"

sqlite3 -readonly "$DB" .dump > "$SQL"
sqlite3 -readonly "$DB" ".backup '$COPY'"

echo "Zrzut SQL:      $SQL"
echo "Kopia binarna:  $COPY"
