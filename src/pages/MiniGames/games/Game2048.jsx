import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const bestKey = "br_game_2048_best";
let nextId = 0;
const spawn = (tiles) => {
  const occupied = new Set(tiles.map((tile) => tile.cell));
  const empty = Array.from({ length: 16 }, (_, i) => i).filter((i) => !occupied.has(i));
  if (!empty.length) return tiles;
  return [...tiles, { id: ++nextId, cell: empty[Math.floor(Math.random() * empty.length)], value: Math.random() < .9 ? 2 : 4 }];
};
const fresh = () => spawn(spawn([]));
const directions = ["left", "right", "up", "down"];
const moveTiles = (tiles, direction) => {
  const byCell = new Map(tiles.map((tile) => [tile.cell, tile]));
  const moved = [], merged = [];
  let gained = 0;
  for (let n = 0; n < 4; n++) {
    const cells = Array.from({ length: 4 }, (_, i) => direction === "left" ? n * 4 + i : direction === "right" ? n * 4 + 3 - i : direction === "up" ? i * 4 + n : (3 - i) * 4 + n);
    const line = cells.map((cell) => byCell.get(cell)).filter(Boolean);
    let destination = 0;
    for (let i = 0; i < line.length; i++) {
      const first = line[i];
      const cell = cells[destination++];
      if (line[i + 1]?.value === first.value) {
        const second = line[++i];
        moved.push({ ...first, cell }, { ...second, cell });
        merged.push({ id: ++nextId, cell, value: first.value * 2, pop: true });
        gained += first.value * 2;
      } else {
        moved.push({ ...first, cell });
        merged.push({ ...first, cell });
      }
    }
  }
  return { moved, merged, gained, changed: moved.some((tile) => byCell.get(tile.cell)?.id !== tile.id) || moved.length !== tiles.length };
};

export default function Game2048() {
  const [tiles, setTiles] = useState(fresh);
  const [moving, setMoving] = useState(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem(bestKey) || 0));
  const [over, setOver] = useState(false);
  const tilesRef = useRef(tiles);
  const movingRef = useRef(false);
  const timerRef = useRef(null);
  const reset = () => {
    clearTimeout(timerRef.current);
    movingRef.current = false;
    const next = fresh();
    tilesRef.current = next;
    setTiles(next);
    setMoving(null);
    setScore(0);
    setOver(false);
  };
  useEffect(() => {
    const onKey = (event) => {
      const direction = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", a: "left", d: "right", w: "up", s: "down" }[event.key];
      if (!direction) return;
      event.preventDefault();
      if (movingRef.current) return;
      const result = moveTiles(tilesRef.current, direction);
      if (!result.changed) return;
      movingRef.current = true;
      setMoving(result.moved);
      timerRef.current = setTimeout(() => {
        const next = spawn(result.merged);
        tilesRef.current = next;
        setTiles(next);
        setMoving(null);
        setScore((old) => {
          const value = old + result.gained;
          setBest((previous) => {
            const updated = Math.max(previous, value);
            localStorage.setItem(bestKey, String(updated));
            return updated;
          });
          return value;
        });
        setOver(!directions.some((dir) => moveTiles(next, dir).changed));
        movingRef.current = false;
      }, 190);
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); clearTimeout(timerRef.current); };
  }, []);
  const visible = moving || tiles;
  return <section className="game-shell"><div className="game-shell__top"><div style={{ display: "flex", gap: 8 }}><div className="game-stat"><span>Score</span><b>{score}</b></div><div className="game-stat"><span>Best</span><b>{best}</b></div></div><div className="game-controls"><button className="primary" onClick={reset}><RotateCcw size={16}/>Restart</button></div></div><div className="game-2048-board"><div className="game-2048-cells">{Array.from({ length: 16 }, (_, i) => <span key={i} />)}</div><div className="game-2048-tiles">{visible.map((tile) => <div key={tile.id} className={`tile tile-${Math.min(tile.value, 2048)}${tile.pop ? " tile-pop" : ""}`} style={{ left: `calc(${tile.cell % 4 * 25}% + ${tile.cell % 4 * 1.75}px)`, top: `calc(${Math.floor(tile.cell / 4) * 25}% + ${Math.floor(tile.cell / 4) * 1.75}px)` }}>{tile.value}</div>)}</div></div><p className="game-hint">Arrow yoki WASD bilan harakatlantiring. Eng katta tile: <b>{Math.max(...tiles.map((tile) => tile.value))}</b></p>{over && <div className="game-over"><b>Harakat qolmadi</b><span>Score: {score}</span><button onClick={reset}>Yana o'ynash</button></div>}</section>;
}
