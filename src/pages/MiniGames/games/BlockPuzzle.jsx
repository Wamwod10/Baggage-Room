import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const SIZE = 8, bestKey = "br_game_blocks_best";
const SHAPES = [[[0,0]],[[0,0],[1,0]],[[0,0],[0,1]],[[0,0],[1,0],[2,0]],[[0,0],[0,1],[0,2]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[0,1],[1,1]],[[0,0],[1,0],[1,1]],[[0,0],[1,0],[2,0],[1,1]],[[0,0],[1,0],[2,0],[3,0]]];
const colors = ["cyan", "violet", "amber", "rose"];
const makePiece = () => ({ shape: SHAPES[Math.floor(Math.random() * SHAPES.length)], color: colors[Math.floor(Math.random() * colors.length)] });
const newPieces = () => [makePiece(), makePiece(), makePiece()];
const canPlace = (piece, x, y, board) => piece.shape.every(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < SIZE && y + dy < SIZE && !board[(y + dy) * SIZE + x + dx]);

export default function BlockPuzzle() {
  const [board, setBoard] = useState(() => Array(SIZE * SIZE).fill(""));
  const [pieces, setPieces] = useState(newPieces);
  const [drag, setDrag] = useState(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem(bestKey) || 0));
  const boardRef = useRef(null);
  const dragRef = useRef(null);
  const stateRef = useRef({ board, pieces });
  useEffect(() => { stateRef.current = { board, pieces }; }, [board, pieces]);
  const reset = () => { setBoard(Array(SIZE * SIZE).fill("")); setPieces(newPieces()); dragRef.current = null; setDrag(null); setScore(0); };
  const position = (clientX, clientY, piece) => {
    const cells = boardRef.current?.querySelectorAll(".block-board__cell");
    if (!cells?.length) return null;
    const first = cells[0].getBoundingClientRect();
    const second = cells[1].getBoundingClientRect();
    const lower = cells[SIZE].getBoundingClientRect();
    const stepX = second.left - first.left, stepY = lower.top - first.top;
    const width = Math.max(...piece.shape.map(([x]) => x)) + 1;
    const height = Math.max(...piece.shape.map(([, y]) => y)) + 1;
    const x = Math.round((clientX - first.left - (width * stepX - first.width) / 2) / stepX);
    const y = Math.round((clientY - first.top - (height * stepY - first.height) / 2) / stepY);
    const bounds = boardRef.current.getBoundingClientRect();
    if (clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom) return null;
    return { x, y, valid: canPlace(piece, x, y, stateRef.current.board), cellSize: first.width, gap: stepX - first.width };
  };
  const place = (index, x, y) => {
    const { board: current, pieces: currentPieces } = stateRef.current;
    const piece = currentPieces[index];
    if (!piece || !canPlace(piece, x, y, current)) return;
    const next = [...current];
    piece.shape.forEach(([dx, dy]) => { next[(y + dy) * SIZE + x + dx] = piece.color; });
    const rows = Array.from({ length: SIZE }, (_, r) => r).filter((r) => Array.from({ length: SIZE }, (_, c) => next[r * SIZE + c]).every(Boolean));
    const cols = Array.from({ length: SIZE }, (_, c) => c).filter((c) => Array.from({ length: SIZE }, (_, r) => next[r * SIZE + c]).every(Boolean));
    rows.forEach((r) => { for (let c = 0; c < SIZE; c++) next[r * SIZE + c] = ""; });
    cols.forEach((c) => { for (let r = 0; r < SIZE; r++) next[r * SIZE + c] = ""; });
    const gain = piece.shape.length + (rows.length + cols.length) * 12;
    setScore((old) => { const value = old + gain; setBest((previous) => { const updated = Math.max(previous, value); localStorage.setItem(bestKey, String(updated)); return updated; }); return value; });
    const remaining = currentPieces.map((item, i) => i === index ? null : item);
    setPieces(remaining.every((item) => !item) ? newPieces() : remaining);
    setBoard(next);
  };
  useEffect(() => {
    const onMove = (event) => {
      const current = dragRef.current;
      if (!current) return;
      const piece = stateRef.current.pieces[current.index];
      if (!piece) return;
      const next = { ...current, clientX: event.clientX, clientY: event.clientY, preview: position(event.clientX, event.clientY, piece) };
      dragRef.current = next;
      setDrag(next);
    };
    const onUp = (event) => {
      const current = dragRef.current;
      if (!current) return;
      const piece = stateRef.current.pieces[current.index];
      const preview = piece && position(event.clientX, event.clientY, piece);
      if (event.type === "pointerup" && preview?.valid) place(current.index, preview.x, preview.y);
      dragRef.current = null;
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp); };
  }, []);
  const gameOver = pieces.filter(Boolean).every((piece) => !Array.from({ length: SIZE * SIZE }, (_, i) => canPlace(piece, i % SIZE, Math.floor(i / SIZE), board)).some(Boolean));
  const previewCells = new Map();
  if (drag?.preview) pieces[drag.index]?.shape.forEach(([dx, dy]) => { const x = drag.preview.x + dx, y = drag.preview.y + dy; if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) previewCells.set(y * SIZE + x, drag.preview.valid ? "valid" : "invalid"); });
  return <section className="game-shell"><div className="game-shell__top"><div style={{ display: "flex", gap: 8 }}><div className="game-stat"><span>Score</span><b>{score}</b></div><div className="game-stat"><span>Best</span><b>{best}</b></div></div><div className="game-controls"><button className="primary" onClick={reset}><RotateCcw size={16}/>Restart</button></div></div><div className="block-game-layout"><div className="block-board" ref={boardRef}>{board.map((value, i) => <span key={i} className={`block-board__cell ${value ? `filled ${value}` : ""} ${previewCells.get(i) || ""}`} />)}</div><div className="block-pieces"><h3>Bloklar</h3>{pieces.map((piece, i) => <div key={i} className={`block-piece ${drag?.index === i ? "dragging" : ""}`} onPointerDown={(event) => { if (!piece || event.button !== 0) return; event.preventDefault(); const next = { index: i, clientX: event.clientX, clientY: event.clientY, preview: null }; dragRef.current = next; setDrag(next); }}>{piece ? <Piece piece={piece} /> : <span className="used">✓</span>}</div>)}</div></div><p className="game-hint">Blokni doskaga olib boring. To'liq qator yoki ustun tozalanadi.</p>{drag && pieces[drag.index] && <div className="block-drag" style={{ left: drag.clientX, top: drag.clientY, "--cell": `${drag.preview?.cellSize || 38}px` }}><Piece piece={pieces[drag.index]} /></div>}{gameOver && <div className="game-over"><b>Joy qolmadi</b><span>Score: {score}</span><button onClick={reset}>Yana o'ynash</button></div>}</section>;
}
function Piece({ piece }) { const width = Math.max(...piece.shape.map(([x]) => x)) + 1, height = Math.max(...piece.shape.map(([, y]) => y)) + 1; return <span className="piece-mini" style={{ gridTemplateColumns: `repeat(${width}, var(--cell, 18px))`, gridTemplateRows: `repeat(${height}, var(--cell, 18px))` }}>{Array.from({ length: width * height }, (_, i) => <i key={i} className={piece.shape.some(([x, y]) => x === i % width && y === Math.floor(i / width)) ? piece.color : "empty"} />)}</span>; }
