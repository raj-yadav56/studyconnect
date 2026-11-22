"use client";
import { useEffect, useRef, useState } from "react";
import * as nx from "@/lib/nexconn";

const ROOMS = [
  { id: "sc_general", name: "General" }, { id: "sc_maths", name: "Mathematics" },
  { id: "sc_physics", name: "Physics" }, { id: "sc_coding", name: "Programming" },
];
type Msg = { id: string; from: string; text: string; time: number; mine: boolean };
type Student = { userId: string; name: string; subject: string };

export default function Home() {
  const [me, setMe] = useState<Student | null>(null);
  const [form, setForm] = useState({ userId: "", name: "", subject: "" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"chats" | "students" | "rooms">("rooms");
  const [students, setStudents] = useState<Student[]>([]);
  const [q, setQ] = useState("");
  const [convs, setConvs] = useState<string[]>([]);               // keys like d:alice / g:sc_maths
  const [msgs, setMsgs] = useState<Record<string, Msg[]>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [typing, setTyping] = useState<Record<string, string>>({});
  const [readAt, setReadAt] = useState<Record<string, number>>({});
  const [active, setActive] = useState<string>("");
  const [text, setText] = useState("");
  const activeRef = useRef(""); activeRef.current = active;
  const meRef = useRef<Student | null>(null); meRef.current = me;
  const lastTyping = useRef(0); const endRef = useRef<HTMLDivElement>(null);
  const nameOf = (id: string) => students.find(s => s.userId === id)?.name || id;

  useEffect(() => { endRef.current?.scrollIntoView(); }, [msgs, active]);
  useEffect(() => { if (me) localStorage.setItem("sc:" + me.userId, JSON.stringify({ msgs, convs })); }, [msgs, convs, me]);
  useEffect(() => {
    if (!me) return;
    const load = () => fetch("/api/users").then(r => r.json()).then(d => setStudents(d.users));
    load(); const t = setInterval(load, 8000); return () => clearInterval(t);
  }, [me]);

  async function login() {
    setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error + (d.detail ? " " + JSON.stringify(d.detail) : ""));
      await nx.connect(d.token, onIncoming);
      for (const room of ROOMS) await nx.ensureGroup(room.id, room.name);
      const saved = JSON.parse(localStorage.getItem("sc:" + form.userId) || "{}");
      setMsgs(saved.msgs || {}); setConvs(saved.convs || []);
      setMe({ userId: form.userId, name: form.name || form.userId, subject: form.subject });
    } catch (e: any) { setErr(e.message || "Could not connect"); }
    setBusy(false);
  }

  function onIncoming(m: any) {
    const mine = meRef.current?.userId; if (!m.from || m.from === mine) return;
    const key = m.group ? "g:" + m.channel : "d:" + m.from;
    if (nx.isTyping(m.text)) {
      setTyping(t => ({ ...t, [key]: m.from }));
      setTimeout(() => setTyping(t => (t[key] === m.from ? { ...t, [key]: "" } : t)), 3000); return;
    }
    if (nx.isRead(m.text)) { setReadAt(r => ({ ...r, [key]: Date.now() })); return; }
    setTyping(t => ({ ...t, [key]: "" }));
    setMsgs(s => ({ ...s, [key]: [...(s[key] || []), { id: m.id, from: m.from, text: m.text, time: m.time, mine: false }] }));
    setConvs(c => (c.includes(key) ? c : [key, ...c]));
    if (activeRef.current === key) { if (!m.group) nx.sendRead(false, m.from); }
    else setUnread(u => ({ ...u, [key]: (u[key] || 0) + 1 }));
  }

  function open(key: string) {
    setActive(key); setUnread(u => ({ ...u, [key]: 0 }));
    setConvs(c => (c.includes(key) ? c : [key, ...c]));
    if (key.startsWith("d:")) nx.sendRead(false, key.slice(2));
  }

  async function send() {
    const t = text.trim(); if (!t || !active) return; setText("");
    const group = active.startsWith("g:"), id = active.slice(2);
    setMsgs(s => ({ ...s, [active]: [...(s[active] || []), { id: "l" + Date.now(), from: me!.userId, text: t, time: Date.now(), mine: true }] }));
    try { await nx.sendText(group, id, t); } catch { setErr("Message failed to send"); }
  }
  function onType(v: string) {
    setText(v); const now = Date.now();
    if (active && v && now - lastTyping.current > 2000) { lastTyping.current = now; nx.sendTyping(active.startsWith("g:"), active.slice(2)); }
  }

  if (!me) return (
    <div className="login"><div className="card">
      <h1>StudyConnect</h1><p>Chat with classmates and join subject study rooms.</p>
      <input placeholder="Username (letters, numbers, _)" value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value.trim() })} />
      <input placeholder="Your name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
        <option value="">Main subject (optional)</option>
        {ROOMS.slice(1).map(r => <option key={r.id}>{r.name}</option>)}
      </select>
      <button className="btn" disabled={busy || form.userId.length < 2} onClick={login}>{busy ? "Connecting…" : "Join StudyConnect"}</button>
      {err && <div className="err">{err}</div>}
    </div></div>
  );

  const group = active.startsWith("g:"), activeId = active.slice(2);
  const title = group ? ROOMS.find(r => r.id === activeId)?.name : nameOf(activeId);
  const list = msgs[active] || [];
  const lastMine = [...list].reverse().find(m => m.mine);
  const filtered = students.filter(s => s.userId !== me.userId && (s.name + s.userId + s.subject).toLowerCase().includes(q.toLowerCase()));
  const badge = (k: string) => unread[k] ? <span className="badge">{unread[k]}</span> : null;

  return (
    <div className="app">
      <aside className="side">
        <div className="me"><div>{me.name}<small>@{me.userId}{me.subject ? " · " + me.subject : ""}</small></div>
          <button className="btn" style={{ padding: "6px 10px" }} onClick={() => { nx.disconnect(); location.reload(); }}>Log out</button></div>
        <div className="tabs">{(["rooms", "chats", "students"] as const).map(t =>
          <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}</div>
        {tab === "students" && <input placeholder="Search by name, username, subject" value={q} onChange={e => setQ(e.target.value)} />}
        <div className="list">
          {tab === "rooms" && ROOMS.map(r => <div key={r.id} className={"row" + (active === "g:" + r.id ? " on" : "")} onClick={() => open("g:" + r.id)}>
            <div>{r.name}<small>Study room</small></div>{badge("g:" + r.id)}</div>)}
          {tab === "chats" && (convs.filter(c => c.startsWith("d:")).length === 0
            ? <div className="row"><small>No chats yet. Find a student in the Students tab.</small></div>
            : convs.filter(c => c.startsWith("d:")).map(c => <div key={c} className={"row" + (active === c ? " on" : "")} onClick={() => open(c)}>
              <div>{nameOf(c.slice(2))}<small>{(msgs[c] || []).slice(-1)[0]?.text || ""}</small></div>{badge(c)}</div>))}
          {tab === "students" && (filtered.length === 0
            ? <div className="row"><small>No other students online yet. Open a second browser window and sign up with another username.</small></div>
            : filtered.map(s => <div key={s.userId} className="row" onClick={() => { open("d:" + s.userId); setTab("chats"); }}>
              <div>{s.name}<small>@{s.userId}{s.subject ? " · " + s.subject : ""}</small></div></div>))}
        </div>
      </aside>
      <main className="main">
        {!active ? <div className="empty">Pick a study room or a student to start chatting.</div> : <>
          <div className="head">{title}<small>{typing[active] ? `${nameOf(typing[active])} is typing…` : group ? "Study room" : "Direct message"}</small></div>
          <div className="msgs">
            {list.length === 0 && <div className="empty">No messages yet. Say hello!</div>}
            {list.map(m => <div key={m.id} className={"b" + (m.mine ? " me" : "")}>
              {group && !m.mine && <p className="who">{nameOf(m.from)}</p>}{m.text}
              <span>{new Date(m.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {m.mine && !group && (m === lastMine ? (readAt[active] && readAt[active] >= m.time ? " · Seen ✓✓" : " · Sent ✓") : "")}</span></div>)}
            <div ref={endRef} />
          </div>
          {err && <div className="err" style={{ padding: "0 16px" }}>{err}</div>}
          <div className="compose">
            <input placeholder="Type a message" value={text} onChange={e => onType(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} />
            <button className="btn" onClick={send}>Send</button>
          </div></>}
      </main>
    </div>
  );
}
