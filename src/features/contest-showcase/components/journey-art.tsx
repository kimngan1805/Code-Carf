/**
 * Hình vẽ bản đồ đảo: tất cả là SVG cùng một phong cách phẳng hai tông,
 * nên hiển thị giống nhau trên mọi máy (không phụ thuộc bộ emoji của hệ điều hành).
 * Toạ độ theo khung 1000 x 700, khớp với `SLOTS` trong contest-journey.
 */

const ISLAND =
  "M170,560 C110,500 120,420 175,385 C140,330 150,250 215,215 C270,185 330,200 370,180 C430,140 520,120 600,130 C690,110 790,140 820,210 C850,270 820,320 790,350 C840,400 830,480 770,515 C730,580 640,610 560,600 C480,640 360,640 290,615 C230,610 195,590 170,560 Z";

const WAVES: [number, number][] = [
  [70, 210],
  [130, 420],
  [880, 90],
  [930, 300],
  [900, 520],
  [420, 60],
  [250, 95],
  [700, 660],
  [480, 675],
  [60, 640],
  [960, 640],
  [820, 400],
];

function Palm({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse
        cx="0"
        cy="2"
        rx="14"
        ry="4"
        fill="var(--map-ground-shade)"
        opacity="0.35"
      />
      <path
        d="M0,0 Q6,-24 -2,-50"
        fill="none"
        stroke="var(--map-wood-dark)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <g transform="translate(-2 -50)">
        {[-160, -120, -60, -20, 30, 150].map((angle) => (
          <ellipse
            key={angle}
            cx="17"
            cy="0"
            rx="19"
            ry="6"
            fill={angle % 40 === 0 ? "var(--map-leaf-dark)" : "var(--map-leaf)"}
            transform={`rotate(${angle})`}
          />
        ))}
        <circle cx="-3" cy="4" r="3.5" fill="var(--map-bark)" />
        <circle cx="3" cy="5" r="3.5" fill="var(--map-bark)" />
      </g>
    </g>
  );
}

function Bush({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx="-9" cy="0" r="10" fill="var(--map-bush-dark)" />
      <circle cx="9" cy="0" r="10" fill="var(--map-bush-dark)" />
      <circle cx="0" cy="-8" r="12" fill="var(--map-bush)" />
    </g>
  );
}

function Tuft({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M${x - 6},${y} l3,-9 l3,9 l3,-11 l3,11`}
      fill="none"
      stroke="var(--map-tuft)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** Biển, đảo, đồi, cây bụi, la bàn và các bộ lọc dùng chung. */
export function Scenery() {
  return (
    <>
      <defs>
        <linearGradient id="journey-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--map-sea-deep)" />
          <stop offset="100%" stopColor="var(--map-sea)" />
        </linearGradient>
        <radialGradient id="journey-grass" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="var(--map-grass-light)" />
          <stop offset="100%" stopColor="var(--map-grass)" />
        </radialGradient>
        <filter id="journey-fog" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      <rect width="1000" height="700" fill="url(#journey-sea)" />
      {WAVES.map(([x, y]) => (
        <path
          key={`${x}-${y}`}
          d={`M${x},${y} q9,-7 18,0 t18,0`}
          fill="none"
          stroke="white"
          strokeOpacity="0.45"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}

      {/* Bóng đảo, bọt sóng, bờ cát rồi cỏ: cùng một đường viền nên luôn khớp nhau. */}
      <path
        d={ISLAND}
        fill="var(--map-island-shadow)"
        stroke="var(--map-island-shadow)"
        strokeWidth="30"
        opacity="0.22"
        transform="translate(0 14)"
      />
      <path
        d={ISLAND}
        fill="white"
        stroke="white"
        strokeWidth="62"
        opacity="0.28"
      />
      <path
        d={ISLAND}
        fill="white"
        stroke="white"
        strokeWidth="44"
        opacity="0.45"
      />
      <path
        d={ISLAND}
        fill="var(--map-sand)"
        stroke="var(--map-sand)"
        strokeWidth="30"
        strokeLinejoin="round"
      />
      <path d={ISLAND} fill="url(#journey-grass)" />

      {/* Đồi thấp cho đảo có chiều sâu. */}
      <ellipse
        cx="455"
        cy="455"
        rx="125"
        ry="42"
        fill="var(--map-hill)"
        opacity="0.55"
      />
      <ellipse
        cx="290"
        cy="425"
        rx="80"
        ry="30"
        fill="var(--map-hill)"
        opacity="0.5"
      />
      <ellipse
        cx="700"
        cy="290"
        rx="80"
        ry="30"
        fill="var(--map-hill)"
        opacity="0.5"
      />
      <ellipse
        cx="420"
        cy="245"
        rx="70"
        ry="24"
        fill="var(--map-hill)"
        opacity="0.45"
      />

      {[
        [260, 470],
        [430, 410],
        [520, 300],
        [700, 380],
        [330, 260],
        [600, 470],
        [760, 270],
        [230, 360],
      ].map(([x, y]) => (
        <Tuft key={`${x}-${y}`} x={x} y={y} />
      ))}
      <Bush x={230} y={300} s={0.9} />
      <Bush x={470} y={190} s={0.8} />
      <Bush x={790} y={300} s={0.8} />
      <Bush x={440} y={470} s={0.7} />
      <Palm x={200} y={450} s={0.8} />
      <Palm x={790} y={475} s={0.75} />
      <Palm x={330} y={200} s={0.7} />

      {/* La bàn ở góc. */}
      <g transform="translate(70 72)">
        <circle
          r="34"
          fill="white"
          stroke="var(--brand-blue)"
          strokeWidth="3"
        />
        <circle
          r="26"
          fill="none"
          stroke="var(--brand-blue)"
          strokeOpacity="0.25"
        />
        <polygon points="0,-24 6,0 0,24 -6,0" fill="var(--brand-blue)" />
        <polygon points="0,-24 6,0 -6,0" fill="var(--brand-orange)" />
        <circle r="3" fill="white" />
        <text
          y="-38"
          textAnchor="middle"
          fontSize="13"
          fontWeight="800"
          fill="white"
        >
          N
        </text>
      </g>
    </>
  );
}

/** 1. Bến cảng: cầu tàu gỗ và chiếc thuyền buồm. */
function Dock() {
  return (
    <g>
      <g transform="translate(150 592) rotate(28)">
        <rect
          x="-8"
          y="-6"
          width="78"
          height="16"
          rx="3"
          fill="var(--map-wood)"
        />
        {[0, 14, 28, 42, 56].map((x) => (
          <line
            key={x}
            x1={x}
            y1="-6"
            x2={x}
            y2="10"
            stroke="var(--map-wood-dark)"
            strokeWidth="2"
          />
        ))}
        <rect x="-10" y="8" width="6" height="12" fill="var(--map-bark)" />
        <rect x="62" y="8" width="6" height="12" fill="var(--map-bark)" />
      </g>
      <g transform="translate(92 640)">
        <path d="M-34,0 L34,0 L24,16 L-24,16 Z" fill="var(--map-hull)" />
        <rect
          x="-34"
          y="-2"
          width="68"
          height="5"
          rx="2"
          fill="var(--map-hull-light)"
        />
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="-62"
          stroke="var(--map-bark)"
          strokeWidth="3"
        />
        <path d="M2,-60 L32,-6 L2,-6 Z" fill="white" />
        <path d="M2,-30 L19,-30 L26,-18 L2,-18 Z" fill="var(--brand-orange)" />
        <path d="M-2,-54 L-26,-8 L-2,-8 Z" fill="var(--map-sail)" />
        <path d="M0,-62 L14,-57 L0,-52 Z" fill="var(--brand-blue)" />
        <path
          d="M-40,20 q10,-6 20,0 t20,0 t20,0 t20,0"
          fill="none"
          stroke="white"
          strokeOpacity="0.7"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}

/** 2. Rừng dừa. */
function Grove() {
  return (
    <g>
      <Palm x={290} y={515} />
      <Palm x={325} y={505} s={1.15} />
      <Palm x={362} y={520} s={0.9} />
    </g>
  );
}

/** 3. Hồ vòng lặp có lá sen. */
function Lake() {
  return (
    <g transform="translate(500 505)">
      <ellipse rx="66" ry="27" fill="var(--map-water-deep)" />
      <ellipse cx="-6" cy="-3" rx="56" ry="20" fill="var(--map-water)" />
      <path
        d="M-30,-4 q8,-5 16,0 M8,6 q8,-5 16,0"
        fill="none"
        stroke="white"
        strokeOpacity="0.7"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="30" cy="-6" r="7" fill="var(--map-bush-dark)" />
      <circle cx="-38" cy="8" r="6" fill="var(--map-bush-dark)" />
      <circle cx="33" cy="-9" r="2.5" fill="var(--map-lotus)" />
      {[-64, -58, 60, 66].map((x) => (
        <line
          key={x}
          x1={x}
          y1="6"
          x2={x + 2}
          y2="-14"
          stroke="var(--map-ground-shade)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

/** 4. Đền hàm: ngôi đền đá có cột. */
function Temple() {
  return (
    <g transform="translate(612 505)">
      <ellipse
        cx="0"
        cy="4"
        rx="44"
        ry="7"
        fill="var(--map-ground-shade)"
        opacity="0.3"
      />
      <rect
        x="-42"
        y="-6"
        width="84"
        height="8"
        rx="2"
        fill="var(--map-stone-dark)"
      />
      <rect
        x="-36"
        y="-12"
        width="72"
        height="7"
        rx="2"
        fill="var(--map-stone)"
      />
      {[-28, -12, 4, 20].map((x) => (
        <rect
          key={x}
          x={x}
          y="-46"
          width="8"
          height="34"
          fill="var(--map-stone-light)"
        />
      ))}
      <rect
        x="-38"
        y="-52"
        width="76"
        height="8"
        rx="2"
        fill="var(--map-stone)"
      />
      <path d="M-42,-52 L0,-74 L42,-52 Z" fill="var(--map-stone-dark)" />
      <path d="M-30,-55 L0,-70 L30,-55 Z" fill="var(--map-stone-face)" />
    </g>
  );
}

/** 5. Hang con trỏ: núi đá có cửa hang tối. */
function Cave() {
  return (
    <g transform="translate(778 392)">
      <ellipse
        cx="0"
        cy="3"
        rx="54"
        ry="8"
        fill="var(--map-ground-shade)"
        opacity="0.3"
      />
      <path d="M-52,0 Q-48,-58 0,-62 Q50,-58 54,0 Z" fill="var(--map-rock)" />
      <path
        d="M8,-61 Q50,-56 54,0 L18,0 Q30,-30 8,-61 Z"
        fill="var(--map-rock-dark)"
      />
      <path d="M-20,0 Q-18,-34 0,-36 Q18,-34 20,0 Z" fill="var(--map-cave)" />
      <circle cx="-62" cy="-4" r="8" fill="var(--map-rock)" />
      <circle cx="62" cy="-3" r="6" fill="var(--map-rock-dark)" />
    </g>
  );
}

function MoaiHead({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <g transform={`translate(${x} 0) scale(${s})`}>
      <rect
        x="-13"
        y="-58"
        width="26"
        height="58"
        rx="8"
        fill="var(--map-moai)"
      />
      <rect
        x="2"
        y="-58"
        width="11"
        height="58"
        rx="6"
        fill="var(--map-moai-dark)"
      />
      <rect
        x="-13"
        y="-44"
        width="26"
        height="5"
        rx="2"
        fill="var(--map-moai-line)"
      />
      <path d="M-2,-39 L4,-22 L-4,-22 Z" fill="var(--map-moai-nose)" />
      <rect
        x="-7"
        y="-14"
        width="14"
        height="3"
        rx="1.5"
        fill="var(--map-moai-line)"
      />
    </g>
  );
}

/** 6. Tượng đá OOP: hai đầu tượng. */
function Statues() {
  return (
    <g transform="translate(640 352)">
      <ellipse
        cx="0"
        cy="3"
        rx="40"
        ry="7"
        fill="var(--map-ground-shade)"
        opacity="0.3"
      />
      <MoaiHead x={-16} />
      <MoaiHead x={18} s={0.82} />
    </g>
  );
}

/** 7. Kim tự tháp thuật toán. */
function Pyramid() {
  return (
    <g transform="translate(280 318)">
      <ellipse
        cx="0"
        cy="3"
        rx="62"
        ry="9"
        fill="var(--map-ground-shade)"
        opacity="0.3"
      />
      <path d="M-60,0 L0,-72 L0,0 Z" fill="var(--map-gold)" />
      <path d="M0,-72 L60,0 L0,0 Z" fill="var(--map-gold-dark)" />
      {[-18, -36, -54].map((y) => (
        <line
          key={y}
          x1={-60 - (y * 60) / 72}
          y1={y}
          x2={60 + (y * 60) / 72}
          y2={y}
          stroke="var(--map-gold-line)"
          strokeOpacity="0.55"
          strokeWidth="2"
        />
      ))}
      <rect
        x="-7"
        y="-16"
        width="14"
        height="16"
        rx="2"
        fill="var(--map-door)"
      />
    </g>
  );
}

/** 8. Núi lửa trùm cuối. */
function Volcano() {
  return (
    <g transform="translate(675 212)">
      <ellipse
        cx="0"
        cy="4"
        rx="96"
        ry="12"
        fill="var(--map-ground-shade)"
        opacity="0.3"
      />
      <path d="M-92,0 L-26,-96 L26,-96 L92,0 Z" fill="var(--map-volcano)" />
      <path d="M8,-96 L26,-96 L92,0 L30,0 Z" fill="var(--map-volcano-dark)" />
      <ellipse cx="0" cy="-96" rx="26" ry="7" fill="var(--map-crater)" />
      <ellipse cx="0" cy="-97" rx="18" ry="4" fill="var(--map-lava)" />
      <path
        d="M-10,-94 Q-14,-70 -22,-58 Q-16,-60 -12,-74 M8,-94 Q10,-74 18,-66"
        fill="none"
        stroke="var(--map-lava)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <g fill="var(--map-smoke)">
        <circle cx="4" cy="-116" r="13" />
        <circle cx="22" cy="-136" r="17" />
        <circle cx="8" cy="-160" r="21" />
      </g>
    </g>
  );
}

/** Công trình của từng chặng, theo thứ tự chặng. */
export const LANDMARKS = [
  Dock,
  Grove,
  Lake,
  Temple,
  Cave,
  Statues,
  Pyramid,
  Volcano,
];
