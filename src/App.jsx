import { useState } from 'react'

// ── Hardcoded winner sequence ──────────────────────────────────────────────
const SEQUENCE = [
  'Grace', 'Johnny Roesch', 'John Russo', 'Bella', 'Jackson',
  'Nathan', 'James Q', 'Kieran', 'Jameson', 'Cillian',
  'Donovan', 'Anaise', 'Charlotte', 'James K', 'Emma',
  'Connor', 'Tommy', 'Cashel', 'Patrick', 'Hadassah',
  'Ava', 'Aliyah', 'Heath', 'Louis', 'Rory',
]

const PALETTE = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#F59E0B',
  '#10B981', '#6366F1', '#F43F5E', '#84CC16', '#0EA5E9',
]

// Wheel geometry
const CX = 200
const CY = 200
const R  = 182

// Spin feel
const FULL_SPINS = 8   // full rotations added before landing
const SPIN_SECS  = 4   // animation duration

// ── Helpers ────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function initWheelOrder() {
  try {
    const raw = localStorage.getItem('wheelOrder')
    if (raw) return JSON.parse(raw)
  } catch {}
  const order = shuffle([...SEQUENCE])
  localStorage.setItem('wheelOrder', JSON.stringify(order))
  return order
}

// angleDeg: 0 = 12 o'clock, clockwise
function polarXY(angleDeg, r) {
  const a = (angleDeg - 90) * (Math.PI / 180)
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)]
}

function slicePath(i, N) {
  if (N === 1) {
    // SVG can't draw a 360° arc in one command — use two semicircles
    return `M${CX - R},${CY} A${R},${R},0,1,1,${CX + R},${CY} A${R},${R},0,1,1,${CX - R},${CY}Z`
  }
  const a0 = i * (360 / N)
  const a1 = (i + 1) * (360 / N)
  const [x0, y0] = polarXY(a0, R)
  const [x1, y1] = polarXY(a1, R)
  const large = 360 / N > 180 ? 1 : 0
  return `M${CX},${CY} L${x0},${y0} A${R},${R},0,${large},1,${x1},${y1}Z`
}

// Calculates the new CSS rotation so the pointer (top) lands on winnerIdx's segment center.
// Always spins clockwise and accumulates rotation so the transition animates forward.
function calcNewRotation(prevRot, winnerIdx, N) {
  const segCenter = (winnerIdx + 0.5) * (360 / N)
  // How many degrees of clockwise rotation bring this segment to the top (angle 0)
  const target   = (360 - (segCenter % 360)) % 360
  const prevNorm = ((prevRot % 360) + 360) % 360
  let delta = (target - prevNorm + 360) % 360
  // Guarantee the wheel visibly spins at least part of a rotation beyond the full spins
  if (delta < 10) delta += 360
  return prevRot + FULL_SPINS * 360 + delta
}

// ── App ────────────────────────────────────────────────────────────────────

export default function App() {
  const [spinIndex, setSpinIndex] = useState(
    () => parseInt(localStorage.getItem('spinIndex') || '0', 10)
  )
  const [rotation, setRotation] = useState(
    () => parseFloat(localStorage.getItem('rotation') || '0')
  )
  const [wheelOrder] = useState(initWheelOrder)
  const [spinning, setSpinning]   = useState(false)
  const [winner, setWinner]       = useState(null)

  // Names still on the wheel = everything not yet drawn, in shuffled display order
  const wonSet    = new Set(SEQUENCE.slice(0, spinIndex))
  const remaining = wheelOrder.filter(n => !wonSet.has(n))
  const done      = spinIndex >= SEQUENCE.length

  function handleSpin() {
    if (spinning || winner || done) return
    const nextWinner = SEQUENCE[spinIndex]
    const wi         = remaining.indexOf(nextWinner)
    const newRot     = calcNewRotation(rotation, wi, remaining.length)
    setRotation(newRot)
    setSpinning(true)
    localStorage.setItem('rotation', String(newRot))
  }

  function handleTransitionEnd() {
    if (!spinning) return
    setSpinning(false)
    setWinner(SEQUENCE[spinIndex])
  }

  function handleContinue() {
    const next = spinIndex + 1
    setSpinIndex(next)
    setWinner(null)
    localStorage.setItem('spinIndex', String(next))
  }

  function handleReset() {
    localStorage.clear()
    window.location.reload()
  }

  // ── All-done screen ──────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-900 flex flex-col items-center justify-center gap-6 p-6 text-white">
        <div className="text-7xl">🏆</div>
        <h1 className="text-5xl font-extrabold">All Done!</h1>
        <p className="text-purple-300 text-lg">All {SEQUENCE.length} winners have been drawn</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-w-lg w-full mt-2">
          {SEQUENCE.map((name, i) => (
            <div
              key={i}
              className="bg-white/10 rounded-xl px-2 py-2 text-center text-sm leading-tight"
            >
              <span className="text-purple-400 text-xs block">#{i + 1}</span>
              {name}
            </div>
          ))}
        </div>
        <button
          onClick={handleReset}
          className="mt-4 px-8 py-3 bg-amber-400 text-purple-950 font-bold rounded-full hover:bg-amber-300 transition-colors shadow-lg"
        >
          Play Again
        </button>
      </div>
    )
  }

  // ── Main wheel screen ────────────────────────────────────────────────────
  const N        = remaining.length
  const fontSize = N > 18 ? 8 : N > 12 ? 10 : N > 7 ? 12 : 14

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-900 flex flex-col items-center justify-center gap-5 p-4 select-none">

      {/* Title — double-click to reset */}
      <h1
        className="text-4xl font-extrabold text-white tracking-tight cursor-default"
        onDoubleClick={handleReset}
        title="Double-click to reset"
      >
        Spin the Wheel
      </h1>
      <p className="text-purple-300 text-sm -mt-3">
        Spin {spinIndex + 1} of {SEQUENCE.length}
      </p>

      {/* Wheel SVG */}
      <div className="w-full max-w-sm drop-shadow-2xl">
        <svg viewBox="0 0 400 400" className="w-full h-auto">

          {/* ── Rotating group ── */}
          <g
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: `${CX}px ${CY}px`,
              transition: spinning
                ? `transform ${SPIN_SECS}s cubic-bezier(0.23,1,0.32,1)`
                : 'none',
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {N === 1 ? (
              /* Single-segment special case */
              <g key={remaining[0]}>
                <circle cx={CX} cy={CY} r={R} fill={PALETTE[0]} stroke="white" strokeWidth="1.5" />
                <text
                  x={CX} y={CY}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="white" fontSize={18} fontWeight="700"
                  fontFamily="system-ui,sans-serif"
                >
                  {remaining[0]}
                </text>
              </g>
            ) : (
              remaining.map((name, i) => {
                const mid      = (i + 0.5) * (360 / N)
                const [tx, ty] = polarXY(mid, R * 0.6)
                return (
                  <g key={name}>
                    <path
                      d={slicePath(i, N)}
                      fill={PALETTE[i % PALETTE.length]}
                      stroke="white"
                      strokeWidth="1.5"
                    />
                    {/* Text rotated radially so longer names fit along the slice */}
                    <text
                      x={tx} y={ty}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize={fontSize}
                      fontWeight="700"
                      fontFamily="system-ui,sans-serif"
                      paintOrder="stroke"
                      stroke="rgba(0,0,0,0.55)"
                      strokeWidth="2.5"
                      transform={`rotate(${mid},${tx},${ty})`}
                    >
                      {name}
                    </text>
                  </g>
                )
              })
            )}
          </g>

          {/* ── Fixed decorations (don't spin) ── */}

          {/* Outer border ring */}
          <circle cx={CX} cy={CY} r={R + 1} fill="none" stroke="white" strokeWidth="3" />

          {/* Center hub */}
          <circle cx={CX} cy={CY} r={24} fill="#1e1b4b" stroke="white" strokeWidth="3" />

          {/* Pointer triangle — tip points down into the wheel from the top */}
          <polygon
            points={`${CX - 14},3 ${CX + 14},3 ${CX},31`}
            fill="#FBBF24"
            stroke="white"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Spin button */}
      <button
        onClick={handleSpin}
        disabled={spinning || !!winner}
        className="px-14 py-4 bg-amber-400 text-purple-950 font-extrabold text-2xl rounded-full shadow-lg hover:bg-amber-300 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {spinning ? 'Spinning…' : 'SPIN!'}
      </button>

      {/* Winner modal */}
      {winner && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-10 text-center max-w-xs w-full shadow-2xl animate-pop">
            <div className="text-6xl mb-3">🎉</div>
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">
              Draw #{spinIndex + 1}
            </p>
            <h2 className="text-4xl font-extrabold text-purple-700 mb-6 leading-tight break-words">
              {winner}
            </h2>
            <button
              onClick={handleContinue}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-lg py-3 rounded-2xl transition-colors"
            >
              {spinIndex + 1 >= SEQUENCE.length ? 'See Results →' : 'Next Spin →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
