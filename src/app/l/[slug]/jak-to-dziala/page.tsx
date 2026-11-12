import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findList } from "@/lib/store";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Jak to działa" };

/** Instrukcja dla Mikołaja. Celowo nie wspomina o innych listach ani o zakładaniu list. */
export default async function Page({ params }: Props) {
  const list = findList((await params).slug);
  if (!list) notFound();
  const back = (
    <a className="btn btn-gold help-back" href={`/l/${list.slug}`}>
      Wróć do listy
    </a>
  );

  return (
    <main className="admin help">
      <header className="a-head">
        <h1>Jak to działa</h1>
        {back}
      </header>

      <section className="a-card">
        <h2>Krok po kroku</h2>
        <ol>
          <li>
            Wpisz, ile masz w worku, i naciśnij „Dobierz prezenty”. Dobierzemy zestaw, który wykorzysta budżet jak
            najlepiej.
          </li>
          <li>
            Wybierz sposób dobierania:
            <ul>
              <li>
                <strong>Najmniej prezentów</strong>: wydajemy możliwie cały budżet na kilka większych paczek.
              </li>
              <li>
                <strong>Najwięcej prezentów</strong>: najpierw liczy się liczba paczek, potem wydana kwota.
              </li>
            </ul>
          </li>
          <li>
            Zdecyduj, co z kompletami:
            <ul>
              <li>
                <strong>Komplety kupuj w całości</strong> włączone: komplet trafia do zestawu cały albo wcale.
              </li>
              <li>
                <strong>Komplety kupuj w całości</strong> wyłączone: każdy prezent z kompletu liczy się osobno.
              </li>
            </ul>
          </li>
          <li>Popraw wybór ręcznie, zaznaczając lub odznaczając prezenty na liście.</li>
          <li>
            Naciśnij „Wybieram”. Zobaczysz list z podziękowaniami i listę „Do kupienia”. Potwierdź tam, że na pewno
            kupisz te prezenty, albo zwolnij te, z których rezygnujesz. Listę z cenami i linkami możesz skopiować
            lub zapisać na później.
          </li>
        </ol>
        <p>
          Twój wybór zapisuje się sam po każdej zmianie. Inni Mikołajowie widzą te prezenty jako zaklepane, więc nikt
          nie kupi tego samego. Jeśli zmienisz zdanie, odznacz prezent w tej samej przeglądarce.
        </p>
      </section>

      <section className="a-card">
        <h2>Co jest czym</h2>
        <ul>
          <li>
            <strong>Paczka</strong> to jeden prezent. W środku jest nazwa, cena, link do sklepu i czasem kilka słów, po
            co to komuś.
          </li>
          <li>
            <strong>Komplet</strong> to duża paczka z kilkoma prezentami, które mają sens tylko razem.
          </li>
          <li>
            <strong>Zaklepane</strong> prezenty są szare. Wybrał je już inny Mikołaj i nie da się ich zaznaczyć.
          </li>
          <li>
            <strong>Zaczepka</strong> pojawia się, gdy do kolejnego prezentu brakuje niewiele. Przycisk „dorzucam”
            podnosi budżet o brakującą kwotę i dokłada ten prezent do wyboru. Czasem zaczepka proponuje zamianę
            jednego prezentu na inny, i wtedy mówi wprost, który wypada. Reszta wyboru zostaje bez zmian.
          </li>
          <li>
            <strong>Górka prezentów</strong> pod podsumowaniem rośnie z każdym wyborem. Im droższy prezent, tym
            większa paczka.
          </li>
        </ul>
      </section>

      <div>{back}</div>
    </main>
  );
}
