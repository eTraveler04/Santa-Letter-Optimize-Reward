import type { GiftDTO } from "@/lib/types";

const COLORS = ["#e5383b", "#1e8e5a", "#3d6fe0", "#ff8fb1", "#8b5cf6"];

/** Górka wybranych prezentów: im droższy prezent, tym większa paczka. */
export default function GiftPile({ gifts, maxPriceCents }: { gifts: GiftDTO[]; maxPriceCents: number }) {
  if (gifts.length === 0) return null;
  // największe paczki na dole stosu
  const sorted = [...gifts].sort((a, b) => b.priceCents - a.priceCents || a.id - b.id);
  return (
    <div className="pile" role="img" aria-label={`Górka prezentów: ${gifts.length}`}>
      <div className="pile-boxes">
        {sorted.map((g) => {
          const size = 30 + 50 * Math.sqrt(g.priceCents / Math.max(maxPriceCents, 1));
          return (
            <span
              key={g.id}
              className="parcel"
              title={g.name}
              style={
                {
                  "--size": `${size.toFixed(1)}px`,
                  "--color": COLORS[g.id % COLORS.length],
                  "--tilt": `${((g.id * 37) % 13) - 6}deg`,
                } as React.CSSProperties
              }
            />
          );
        })}
      </div>
    </div>
  );
}
