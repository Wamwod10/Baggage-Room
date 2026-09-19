import { Pause, Play, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const SIZE = 18;
const startSnake = [{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }];
const directions = { ArrowUp:{x:0,y:-1}, w:{x:0,y:-1}, ArrowDown:{x:0,y:1}, s:{x:0,y:1}, ArrowLeft:{x:-1,y:0}, a:{x:-1,y:0}, ArrowRight:{x:1,y:0}, d:{x:1,y:0} };
const bestKey = "br_game_snake_best";

const randomFood = (snake) => {
  let food;
  do { food = { x: Math.floor(Math.random()*SIZE), y: Math.floor(Math.random()*SIZE) }; }
  while (snake.some((part) => part.x===food.x && part.y===food.y));
  return food;
};

export default function SnakeGame(){
  const [snake,setSnake]=useState(startSnake); const [food,setFood]=useState(()=>randomFood(startSnake)); const [score,setScore]=useState(0); const [best,setBest]=useState(()=>Number(localStorage.getItem(bestKey)||0)); const [running,setRunning]=useState(true); const [over,setOver]=useState(false); const direction=useRef({x:1,y:0}); const queued=useRef({x:1,y:0});
  const reset=useCallback(()=>{setSnake(startSnake);setFood(randomFood(startSnake));setScore(0);setOver(false);setRunning(true);direction.current={x:1,y:0};queued.current={x:1,y:0};},[]);
  useEffect(()=>{const key=(e)=>{const next=directions[e.key];if(!next)return;e.preventDefault();if(next.x===-direction.current.x&&next.y===-direction.current.y)return;queued.current=next;};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);},[]);
  useEffect(()=>{if(!running||over)return;const speed=Math.max(72,145-score*2);const timer=setInterval(()=>setSnake((current)=>{direction.current=queued.current;const head={x:current[0].x+direction.current.x,y:current[0].y+direction.current.y};const ate=head.x===food.x&&head.y===food.y;const collisionBody=ate?current:current.slice(0,-1);if(head.x<0||head.y<0||head.x>=SIZE||head.y>=SIZE||collisionBody.some((p)=>p.x===head.x&&p.y===head.y)){setOver(true);setRunning(false);return current;}const next=[head,...current];if(!ate)next.pop();else{const nextScore=score+1;setScore(nextScore);setBest((old)=>{const value=Math.max(old,nextScore);localStorage.setItem(bestKey,String(value));return value;});setFood(randomFood(next));}return next;}),speed);return()=>clearInterval(timer);},[running,over,food,score]);
  const cells=Array.from({length:SIZE*SIZE},(_,i)=>({x:i%SIZE,y:Math.floor(i/SIZE)}));
  return <section className="game-shell snake-game"><div className="game-shell__top"><div style={{display:"flex",gap:8}}><div className="game-stat"><span>Score</span><b>{score}</b></div><div className="game-stat"><span>Best</span><b>{best}</b></div></div><div className="game-controls"><button onClick={()=>setRunning(v=>!v)} disabled={over}>{running?<><Pause size={16}/>Pause</>:<><Play size={16}/>Davom etish</>}</button><button className="primary" onClick={reset}><RotateCcw size={16}/>Restart</button></div></div><div className="snake-board" style={{gridTemplateColumns:`repeat(${SIZE},1fr)`}}>{cells.map((c)=>{const index=snake.findIndex(p=>p.x===c.x&&p.y===c.y);const isFood=food.x===c.x&&food.y===c.y;return <span key={`${c.x}-${c.y}`} className={`${index===0?"head":index>0?"snake":""} ${isFood?"food":""}`}/>;})}</div><p className="game-hint">Arrow yoki WASD bilan boshqaring.</p>{over&&<div className="game-over"><b>Game Over</b><span>Score: {score}</span><button onClick={reset}>Yana o'ynash</button></div>}</section>
}
