import { ArrowLeft, Blocks, Gamepad2, Grid3X3, Palette, Trophy } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import AppLoader from "../../components/AppLoader/AppLoader";
import "./miniGames.scss";

const SnakeGame = lazy(() => import("./games/SnakeGame"));
const Game2048 = lazy(() => import("./games/Game2048"));
const BlockPuzzle = lazy(() => import("./games/BlockPuzzle"));
const ColorsGame = lazy(() => import("./games/ColorsGame"));

const games = [
  { id: "snake", title: "Snake", subtitle: "Tezlik, refleks va klassik arcade", icon: Gamepad2, accent: "cyan", component: SnakeGame },
  { id: "2048", title: "2048", subtitle: "Raqamlarni birlashtirib 2048 ga yeting", icon: Grid3X3, accent: "violet", component: Game2048 },
  { id: "blocks", title: "Block Puzzle", subtitle: "Bloklarni joylashtiring va qatorlarni tozalang", icon: Blocks, accent: "amber", component: BlockPuzzle },
  { id: "colors", title: "Colors", subtitle: "Ortiqcha rangni qanchalik tez topasiz?", icon: Palette, accent: "rose", component: ColorsGame },
];

export default function MiniGames() {
  const [active, setActive] = useState(null);
  const game = games.find((item) => item.id === active);
  const ActiveGame = game?.component;

  if (ActiveGame) {
    const ActiveIcon = game.icon;
    return (
      <div className="game-page">
        <div className="game-page__bar">
          <button type="button" onClick={() => setActive(null)}><ArrowLeft size={17} /> Game Center</button>
          <div><ActiveIcon size={18} /><b>{game.title}</b><span>{game.subtitle}</span></div>
        </div>
        <Suspense fallback={<AppLoader label="O'yin yuklanmoqda..." />}>
          <ActiveGame />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="game-center">
      <section className="game-center__hero">
        <div className="game-center__hero-icon"><Gamepad2 size={28} /></div>
        <div>
          <span className="game-center__eyebrow">MINI GAMES</span>
          <h1>Tanaffus uchun kichik o'yinlar</h1>
        </div>
        <div className="game-center__badge"><Trophy size={17} /><span>Best score<br/><b>local saqlanadi</b></span></div>
      </section>

      <div className="game-center__grid">
        {games.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} type="button" className={`game-card ${item.accent}`} onClick={() => setActive(item.id)}>
              <div className="game-card__visual"><Icon size={42} /></div>
              <div className="game-card__arrow">→</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
