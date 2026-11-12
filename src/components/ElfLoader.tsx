/** Elf piszący list piórem + spinner. Pokazywany, gdy czekamy na list z podziękowaniami. */
export default function ElfLoader({ text }: { text: string }) {
  return (
    <div className="elf-loader" role="status">
      <svg className="elf" viewBox="0 0 240 170" aria-hidden="true">
        <g stroke="#1b1640" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          {/* biurko i kartka */}
          <path d="M14 150 H226" strokeWidth="5" />
          <path d="M118 148 L134 96 H222 L206 148 Z" fill="#fffdf3" />
          <g fill="none" stroke="#3d6fe0" strokeWidth="3">
            <path className="ink ink-1" d="M142 110 H206" />
            <path className="ink ink-2" d="M138 122 H202" />
            <path className="ink ink-3" d="M134 134 H186" />
          </g>

          {/* kałamarz */}
          <path d="M26 148 V128 Q26 122 32 122 H50 Q56 122 56 128 V148 Z" fill="#232b6b" />
          <path d="M32 122 V114 H50 V122" fill="#3d6fe0" />

          {/* elf */}
          <path d="M62 150 Q58 104 88 100 Q118 104 114 150 Z" fill="#1e8e5a" />
          <path d="M74 104 L88 114 L102 104" fill="#e5383b" />
          <g className="elf-head">
            <path d="M62 78 L44 66 L64 66 Z" fill="#ffd7b8" />
            <path d="M114 78 L132 66 L112 66 Z" fill="#ffd7b8" />
            <circle cx="88" cy="76" r="24" fill="#ffd7b8" />
            <path d="M62 66 Q70 20 122 14 Q104 40 114 66 Z" fill="#1e8e5a" />
            <path d="M60 66 H116" stroke="#1b1640" strokeWidth="10" />
            <path d="M60 66 H116" stroke="#e5383b" strokeWidth="6" />
            <circle cx="124" cy="14" r="6" fill="#ffc53d" />
            <circle cx="80" cy="78" r="2.2" fill="#1b1640" stroke="none" />
            <circle cx="97" cy="78" r="2.2" fill="#1b1640" stroke="none" />
            <path d="M82 88 Q89 94 96 88" fill="none" />
            <circle cx="73" cy="86" r="4" fill="#f3a6a8" stroke="none" />
            <circle cx="104" cy="86" r="4" fill="#f3a6a8" stroke="none" />
          </g>

          {/* ręka z piórem */}
          <g className="elf-arm">
            <path d="M104 118 L140 122" strokeWidth="13" stroke="#1b1640" />
            <path d="M104 118 L140 122" strokeWidth="7" stroke="#1e8e5a" />
            <circle cx="144" cy="122" r="6.5" fill="#ffd7b8" />
            <g className="quill">
              <path d="M146 124 L166 70 Q184 60 182 84 Q172 104 150 126 Z" fill="#fff" />
              <path d="M148 124 L174 78" fill="none" strokeWidth="2.5" />
            </g>
          </g>
        </g>
      </svg>
      <p>
        <span className="spinner" aria-hidden="true" />
        {text}
      </p>
    </div>
  );
}
