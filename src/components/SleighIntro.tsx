/** Mikołaj na saniach: wlatuje z lewej, robi fikołka, wita się i odlatuje w prawo. */
export default function SleighIntro() {
  return (
    <div className="flight" aria-hidden="true">
      <div className="bubble">Ho, ho, ho! Witaj, Mikołaju!</div>
      <div className="flight-spin">
        <svg className="sleigh" viewBox="0 0 330 130" role="img">
          <g stroke="#1b1640" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            {/* lejce */}
            <path d="M150 62 Q195 78 236 62" fill="none" />

            {/* renifer */}
            <g className="deer">
              <path d="M236 76 L230 100 M250 78 L250 102 M268 78 L274 100 M282 74 L292 94" fill="none" />
              <ellipse cx="258" cy="66" rx="28" ry="14" fill="#b9793c" />
              <path d="M230 62 Q224 56 226 50" fill="none" />
              <path d="M278 58 Q284 44 294 40" fill="none" strokeWidth="9" stroke="#1b1640" />
              <path d="M278 58 Q284 44 294 40" fill="none" strokeWidth="5" stroke="#b9793c" />
              <circle cx="298" cy="36" r="12" fill="#b9793c" />
              <path d="M292 26 L286 10 M289 18 L280 14 M300 24 L304 8 M302 16 L311 12" fill="none" />
              <circle cx="301" cy="33" r="1.8" fill="#1b1640" stroke="none" />
              <circle cx="310" cy="39" r="5.5" fill="#e5383b" />
            </g>

            {/* worek */}
            <path d="M34 66 Q22 30 52 26 Q60 16 68 26 Q94 30 84 66 Z" fill="#1e8e5a" />
            <rect x="58" y="12" width="18" height="16" rx="2" fill="#ffc53d" transform="rotate(12 67 20)" />
            <path d="M67 12 L65 28" fill="none" transform="rotate(12 67 20)" />

            {/* Mikołaj */}
            <path d="M92 70 Q90 38 112 38 Q134 38 132 70 Z" fill="#e5383b" />
            <g className="wave">
              <path d="M126 50 L146 30" fill="none" strokeWidth="11" stroke="#1b1640" />
              <path d="M126 50 L146 30" fill="none" strokeWidth="6" stroke="#e5383b" />
              <circle cx="148" cy="27" r="6" fill="#fff" />
            </g>
            <circle cx="112" cy="26" r="12" fill="#ffd7b8" />
            <path d="M100 26 Q100 48 112 48 Q124 48 124 26 Q118 34 112 30 Q106 34 100 26 Z" fill="#fff" />
            <path d="M100 20 Q104 2 126 6 Q118 10 124 20 Z" fill="#e5383b" />
            <path d="M98 20 H126" stroke="#1b1640" strokeWidth="9" />
            <path d="M98 20 H126" stroke="#fff" strokeWidth="5" />
            <circle cx="128" cy="6" r="5" fill="#fff" />
            <circle cx="108" cy="24" r="1.6" fill="#1b1640" stroke="none" />
            <circle cx="116" cy="24" r="1.6" fill="#1b1640" stroke="none" />

            {/* sanie */}
            <path d="M24 62 H140 Q156 62 156 46 V42 H166 V70 Q166 92 144 92 H48 Q24 92 24 70 Z" fill="#e5383b" />
            <path d="M34 74 H150" stroke="#ffc53d" strokeWidth="4" />
            <path d="M54 92 V106 M130 92 V106" fill="none" />
            <path d="M22 108 H160 Q178 108 178 92" fill="none" stroke="#1b1640" strokeWidth="8" />
            <path d="M22 108 H160 Q178 108 178 92" fill="none" stroke="#ffc53d" strokeWidth="4" />
          </g>
        </svg>
      </div>
    </div>
  );
}
