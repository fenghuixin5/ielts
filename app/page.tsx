"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Track = "IELTS" | "Fitness" | "Nutrition";
type View = "Today" | "Week" | "Review";
type Task = { id: number; date: string; time: string; title: string; detail: string; track: Track; done: boolean };
type Metric = { label: string; value: number; target: number; unit: string; step: number };

const iso = (date: Date) => date.toISOString().slice(0, 10);
const baseDate = new Date();
const seedTasks: Task[] = [
  { id: 1, date: iso(baseDate), time: "07:30", title: "Power walk", detail: "35 min · Zone 2", track: "Fitness", done: true },
  { id: 2, date: iso(baseDate), time: "09:00", title: "Listening · Section 3", detail: "Cambridge 18 · Test 2", track: "IELTS", done: false },
  { id: 3, date: iso(baseDate), time: "13:30", title: "Speaking rehearsal", detail: "Part 2 · Record 2 takes", track: "IELTS", done: false },
  { id: 4, date: iso(baseDate), time: "18:00", title: "Full-body strength", detail: "45 min · Moderate", track: "Fitness", done: false },
  { id: 5, date: iso(baseDate), time: "20:30", title: "Writing Task 2", detail: "Opinion essay · 40 min", track: "IELTS", done: false },
];
const initialMetrics: Metric[] = [
  { label: "Calories", value: 1420, target: 1750, unit: "kcal", step: 50 },
  { label: "Protein", value: 96, target: 120, unit: "g", step: 5 },
  { label: "Water", value: 1.8, target: 2.5, unit: "L", step: .2 },
  { label: "Steps", value: 7860, target: 10000, unit: "", step: 500 },
];

export default function Home() {
  const [view, setView] = useState<View>("Today");
  const [active, setActive] = useState<Track | "All">("All");
  const [currentDate, setCurrentDate] = useState(baseDate);
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [metrics, setMetrics] = useState<Metric[]>(initialMetrics);
  const [modal, setModal] = useState<"goal" | "profile" | null>(null);
  const [note, setNote] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [listening, setListening] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("study-shape-data");
    if (raw) { const data = JSON.parse(raw); setTasks(data.tasks || seedTasks); setMetrics(data.metrics || initialMetrics); setSavedNote(data.note || ""); }
  }, []);
  useEffect(() => { localStorage.setItem("study-shape-data", JSON.stringify({ tasks, metrics, note: savedNote })); }, [tasks, metrics, savedNote]);

  const dateKey = iso(currentDate);
  const dayTasks = tasks.filter((t) => t.date === dateKey);
  const visibleTasks = dayTasks.filter((t) => active === "All" || t.track === active).sort((a,b) => a.time.localeCompare(b.time));
  const done = dayTasks.filter((t) => t.done).length;
  const progress = dayTasks.length ? Math.round(done / dayTasks.length * 100) : 0;
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(currentDate); d.setDate(d.getDate() - d.getDay() + 1 + i); return d; }), [currentDate]);

  const goDate = (days: number) => { const next = new Date(currentDate); next.setDate(next.getDate() + days); setCurrentDate(next); };
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2400); };
  const toggle = (id: number) => setTasks((all) => all.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  const remove = (id: number) => { setTasks((all) => all.filter((t) => t.id !== id)); notify("Goal removed"); };
  const adjustMetric = (index: number, direction: number) => setMetrics((all) => all.map((m, i) => i === index ? { ...m, value: Math.max(0, Math.round((m.value + m.step * direction) * 10) / 10) } : m));

  const addGoal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const fd = new FormData(event.currentTarget);
    setTasks((all) => [...all, { id: Date.now(), date: dateKey, time: String(fd.get("time")), title: String(fd.get("title")), detail: String(fd.get("detail")) || "Personal goal", track: String(fd.get("track")) as Track, done: false }]);
    setModal(null); notify("Goal added to your day");
  };

  const speakPlan = () => {
    if (!("speechSynthesis" in window)) return notify("Speech is not supported in this browser");
    window.speechSynthesis.cancel(); const open = dayTasks.filter((t) => !t.done).map((t) => `${t.time}, ${t.title}, ${t.detail}`).join(". ");
    const utterance = new SpeechSynthesisUtterance(`Your Study and Shape plan. ${done} of ${dayTasks.length} goals complete. ${open || "All goals are complete. Well done!"}`);
    utterance.lang = "en-US"; utterance.rate = .92; window.speechSynthesis.speak(utterance); notify("Reading your plan aloud");
  };

  const startVoice = () => {
    type Rec = { lang: string; interimResults: boolean; start:()=>void; onresult:(e:{results:{0:{0:{transcript:string}}}[]})=>void; onend:()=>void; onerror:()=>void };
    const w = window as typeof window & { SpeechRecognition?: new()=>Rec; webkitSpeechRecognition?: new()=>Rec };
    const Engine = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Engine) return notify("Voice input works best in Chrome or Safari");
    const rec = new Engine(); rec.lang = "en-US"; rec.interimResults = false;
    rec.onresult = (e) => { setNote(e.results[0][0].transcript); notify("Voice converted to text"); };
    rec.onend = () => setListening(false); rec.onerror = () => { setListening(false); notify("I couldn’t hear that. Try again"); };
    setListening(true); rec.start();
  };

  return <main className="app-shell">
    <header className="topbar">
      <button className="brand plain" onClick={() => { setView("Today"); window.scrollTo({ top: 0, behavior: "smooth" }); }}><span className="brand-mark">S</span><span>STUDY &amp; SHAPE</span></button>
      <nav aria-label="Main navigation">{(["Today","Week","Review"] as View[]).map((item) => <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}>{item}</button>)}</nav>
      <button className="avatar" aria-label="Open YQ profile" onClick={() => setModal("profile")}>YQ</button>
    </header>

    {view === "Today" && <>
      <section className="hero">
        <div className="date-tools"><button onClick={() => goDate(-1)}>← Previous</button><button className="date-main" onClick={() => setCurrentDate(new Date())}>{currentDate.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" })}<small>{dateKey === iso(new Date()) ? "Today" : "Tap to return to today"}</small></button><button onClick={() => goDate(1)}>Next →</button></div>
        <div className="hero-grid"><div><p className="kicker">DAILY PRACTICE</p><h1>Build your<br/><em>next self.</em></h1><p className="intro">One focused day for a stronger body<br/>and a higher IELTS band.</p></div>
          <div className="score-card"><div className="ring" style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}><span>{progress}<small>%</small></span></div><div><strong>{done} of {dayTasks.length}</strong><span>daily goals complete</span><button onClick={speakPlan}>▶ Hear today’s plan</button></div></div>
        </div>
      </section>
      <section className="week-strip">{weekDays.map((d) => { const key=iso(d), total=tasks.filter(t=>t.date===key).length, complete=tasks.filter(t=>t.date===key&&t.done).length; return <button key={key} className={key===dateKey?"chosen":""} onClick={()=>setCurrentDate(d)}><span>{d.toLocaleDateString("en-US",{weekday:"short"})}</span><b>{d.getDate()}</b><i style={{width:`${total?complete/total*100:0}%`}}/></button> })}</section>
      <section className="dashboard">
        <aside className="focus-panel"><div className="section-label">FOCUS AREAS</div>{(["All","IELTS","Fitness","Nutrition"] as const).map((track) => { const total=track==="All"?dayTasks.length:dayTasks.filter(t=>t.track===track).length; const complete=track==="All"?done:dayTasks.filter(t=>t.track===track&&t.done).length; return <button key={track} className={`focus-tab ${active===track?"selected":""}`} onClick={()=>setActive(track)}><span className="focus-icon">{track==="All"?"◎":track==="IELTS"?"Aa":track==="Fitness"?"↗":"○"}</span><span><b>{track==="All"?"Full day":track==="Fitness"?"Training":track}</b><small>{complete} / {total} complete</small></span><i>→</i></button>})}<div className="exam-card"><span>IELTS COUNTDOWN</span><strong>141 <small>days</small></strong><p>Target band <b>7.5</b></p></div></aside>
        <div className="plan-panel" id="plan"><div className="plan-heading"><div><span className="section-label">TODAY’S TIMELINE</span><h2>{active === "All" ? "Your complete day" : active === "IELTS" ? "IELTS practice" : active === "Fitness" ? "Training plan" : "Daily nutrition"}</h2></div><button className="add-button" onClick={()=>setModal("goal")}>＋ Add goal</button></div>
          {active === "Nutrition" ? <Nutrition metrics={metrics} adjust={adjustMetric}/> : <div className="task-list">{visibleTasks.length ? visibleTasks.map((task) => <article className={`task ${task.done?"completed":""}`} key={task.id}><time>{task.time}</time><button className="check" aria-label={`Mark ${task.title} ${task.done?"incomplete":"complete"}`} onClick={()=>toggle(task.id)}>{task.done?"✓":""}</button><div className="task-copy"><span className={`tag ${task.track.toLowerCase()}`}>{task.track}</span><h3>{task.title}</h3><p>{task.detail}</p></div><button className="delete-goal" aria-label={`Delete ${task.title}`} onClick={()=>remove(task.id)}>×</button></article>) : <EmptyDay add={()=>setModal("goal")}/>}</div>}
          <div className="voice-card"><div><span className={`mic ${listening?"listening":""}`}>●</span><div><b>English voice journal</b><small>Practise speaking and save your daily reflection.</small></div></div><textarea aria-label="Daily reflection" value={note} placeholder={savedNote||"What went well today?"} onChange={(e)=>setNote(e.target.value)}/><button className="voice-start" onClick={startVoice}>{listening?"Listening…":"Speak"}</button><button className="save-note" onClick={()=>{setSavedNote(note);notify("Reflection saved on this device")}}>Save reflection</button></div>
        </div>
      </section>
    </>}
    {view === "Week" && <WeekView days={weekDays} tasks={tasks} choose={(d)=>{setCurrentDate(d);setView("Today")}}/>}
    {view === "Review" && <Review tasks={tasks} metrics={metrics}/>} 
    <section className="insights"><div><span>WEEKLY CONSISTENCY</span><strong>5 <small>day streak</small></strong></div><div><span>STUDY TIME</span><strong>8h 40m</strong></div><div><span>WEIGHT GOAL</span><strong>−6.0 <small>kg to go</small></strong></div></section>
    <footer><span>STUDY &amp; SHAPE · IELTS × FITNESS</span><span>Learn better. Live stronger.</span></footer>

    {modal === "goal" && <div className="modal-backdrop" role="presentation" onMouseDown={(e)=>{if(e.currentTarget===e.target)setModal(null)}}><form className="modal" onSubmit={addGoal}><button type="button" className="modal-close" onClick={()=>setModal(null)}>×</button><span className="section-label">NEW DAILY GOAL</span><h2>Add to your plan</h2><label>Goal title<input name="title" required placeholder="e.g. Reading passage 2" autoFocus/></label><div className="form-row"><label>Time<input name="time" type="time" defaultValue="09:00" required/></label><label>Area<select name="track"><option>IELTS</option><option>Fitness</option><option>Nutrition</option></select></label></div><label>Details<input name="detail" placeholder="Duration, source or target"/></label><button className="primary" type="submit">Add goal</button></form></div>}
    {modal === "profile" && <div className="modal-backdrop" role="presentation" onMouseDown={(e)=>{if(e.currentTarget===e.target)setModal(null)}}><section className="modal profile"><button className="modal-close" onClick={()=>setModal(null)}>×</button><div className="profile-avatar">YQ</div><span className="section-label">YOUR GOALS</span><h2>YQ’s dashboard</h2><div className="profile-goals"><p><span>IELTS target</span><b>Band 7.5</b></p><p><span>Exam date</span><b>20 Dec 2026</b></p><p><span>Weight target</span><b>−6.0 kg</b></p><p><span>Weekly training</span><b>4 sessions</b></p></div><button className="primary" onClick={()=>setModal(null)}>Done</button></section></div>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </main>;
}

function Nutrition({metrics,adjust}:{metrics:Metric[];adjust:(i:number,d:number)=>void}) { return <div className="nutrition-grid">{metrics.map((m,i)=><article key={m.label}><span>{m.label}</span><strong>{m.value.toLocaleString()}</strong><small>/ {m.target.toLocaleString()} {m.unit}</small><div><i style={{width:`${Math.min(100,m.value/m.target*100)}%`}}/></div><section><button onClick={()=>adjust(i,-1)}>−</button><button onClick={()=>adjust(i,1)}>＋ Add</button></section></article>)}</div> }
function EmptyDay({add}:{add:()=>void}) { return <div className="empty-day"><span>○</span><h3>A fresh page</h3><p>No goals here yet. Build a balanced day with study, movement and nutrition.</p><button onClick={add}>Add your first goal</button></div> }
function WeekView({days,tasks,choose}:{days:Date[];tasks:Task[];choose:(d:Date)=>void}) { return <section className="wide-view"><span className="section-label">WEEKLY PLAN</span><h1>Your week,<br/><em>at a glance.</em></h1><div className="week-board">{days.map(d=>{const key=iso(d),items=tasks.filter(t=>t.date===key);return <button key={key} onClick={()=>choose(d)}><span>{d.toLocaleDateString("en-US",{weekday:"long"})}</span><b>{d.getDate()}</b><i>{items.filter(t=>t.done).length}/{items.length} complete</i>{items.slice(0,3).map(t=><small key={t.id} className={t.done?"done":""}>{t.time} · {t.title}</small>)}<em>Open day →</em></button>})}</div></section> }
function Review({tasks,metrics}:{tasks:Task[];metrics:Metric[]}) { const complete=tasks.filter(t=>t.done).length; return <section className="wide-view review-view"><span className="section-label">PROGRESS REVIEW</span><h1>Notice the<br/><em>small wins.</em></h1><div className="review-grid"><article><span>GOAL COMPLETION</span><strong>{tasks.length?Math.round(complete/tasks.length*100):0}%</strong><p>{complete} of {tasks.length} planned actions complete</p></article><article><span>IELTS MOMENTUM</span><strong>7.0 → 7.5</strong><p>Focus next: speaking fluency and Task 2 structure</p></article><article><span>NUTRITION TODAY</span><strong>{Math.round(metrics[0].value/metrics[0].target*100)}%</strong><p>{metrics[1].value}g protein · {metrics[2].value}L water</p></article><article><span>NEXT WEEK</span><strong>4 + 5</strong><p>4 training sessions · 5 IELTS study blocks</p></article></div><div className="reflection"><span>WEEKLY PROMPT</span><h2>What made your best day easier?</h2><p>Keep the cue, remove one obstacle, and repeat the routine.</p></div></section> }
