import Todo from '../models/Todo.js';
import { strict as assert } from 'assert';

function safeCalc(expr) {
  // allow digits, + - * / % . ( ) and spaces only
  if (!/^[0-9+\-*/%().\s]+$/.test(expr)) {
    return 'Only basic arithmetic is allowed.';
  }
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`return (${expr})`);
    const v = fn();
    return isFinite(v) ? v.toString() : 'Invalid calculation.';
  } catch (e) {
    return 'Invalid expression.';
  }
}

function parseList(s) {
  return s.split(/[\s,|]+/).filter(Boolean).map(Number).filter(n => !Number.isNaN(n));
}

function gpaFrom(marks, credits) {
  assert(marks.length === credits.length, 'Marks and credits count mismatch');
  // Convert marks (0-100) to 10-point grade points (simple scale)
  const gp = marks.map(m => {
    if (m >= 90) return 10;
    if (m >= 80) return 9;
    if (m >= 70) return 8;
    if (m >= 60) return 7;
    if (m >= 50) return 6;
    if (m >= 40) return 5;
    return 0;
  });
  let num = 0, den = 0;
  for (let i = 0; i < gp.length; i++) {
    num += gp[i] * credits[i];
    den += credits[i];
  }
  const gpa = den ? (num / den) : 0;
  return gpa.toFixed(2);
}

function convert(value, from, to) {
  const units = {
    // length
    m: 1, cm: 0.01, mm: 0.001, km: 1000, in: 0.0254, ft: 0.3048,
    // mass
    g: 0.001, kg: 1, mg: 1e-6, lb: 0.453592,
  };
  if (!(from in units) || !(to in units)) {
    return 'Units supported: m, cm, mm, km, in, ft, g, kg, mg, lb';
  }
  const metersOrKg = value * units[from];
  const res = metersOrKg / units[to];
  return res.toFixed(4) + ' ' + to;
}

function planHours(days, subjects) {
  // subjects: array of {name, weight}
  const total = subjects.reduce((a, s) => a + (s.weight || 1), 0);
  const perDay = subjects.map(s => ({
    name: s.name,
    hoursPerDay: +( ( (s.weight || 1) / total) * 6 ).toFixed(2) // assume 6 hrs/day
  }));
  return {
    days,
    recommendation: perDay
  };
}

export async function handleCommand(userId, text) {
  const parts = text.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();

  if (cmd === '/calc') {
    const expr = text.replace('/calc', '').trim();
    const out = safeCalc(expr || '0');
    return { reply: `Result: ${out}`, suggestions: ['/calc 2+2*5', '/gpa 90,88,79|3,3,4'] };
  }

  if (cmd === '/gpa') {
    // /gpa 90,88,79|3,3,4
    const payload = text.replace('/gpa', '').trim();
    const [mPart, cPart] = payload.split('|').map(s => (s || '').trim());
    if (!mPart || !cPart) {
      return { reply: 'Usage: /gpa 90,88,79|3,3,4', suggestions: ['/gpa 95,86,72|3,4,3'] };
    }
    const marks = parseList(mPart);
    const credits = parseList(cPart);
    try {
      const g = gpaFrom(marks, credits);
      return { reply: `Your GPA is **${g} / 10**`, suggestions: ['/cgpa 8.1,8.3,7.9'] };
    } catch (e) {
      return { reply: 'Error computing GPA. Check counts.', suggestions: ['/gpa 90,88,79|3,3,4'] };
    }
  }

  if (cmd === '/cgpa') {
    // /cgpa 8.1,8.3,7.9
    const payload = text.replace('/cgpa', '').trim();
    const sems = parseList(payload);
    if (sems.length === 0) return { reply: 'Usage: /cgpa 8.1,8.3,7.9' };
    const cg = (sems.reduce((a,b)=>a+b,0) / sems.length).toFixed(2);
    return { reply: `Your CGPA is **${cg} / 10**` };
  }

  if (cmd === '/convert') {
    // /convert 180 cm ft
    const payload = text.replace('/convert', '').trim();
    const [valueS, from, to] = payload.split(/\s+/);
    const val = Number(valueS);
    if (!valueS || Number.isNaN(val) || !from || !to) {
      return { reply: 'Usage: /convert <value> <from> <to>  e.g., /convert 180 cm ft' };
    }
    return { reply: convert(val, from, to) };
  }

  if (cmd === '/todo') {
    // /todo add Finish report
    const action = (parts[1] || '').toLowerCase();
    if (action === 'add') {
      const textTodo = text.split(/\s+/).slice(2).join(' ').trim();
      if (!textTodo) return { reply: 'Usage: /todo add <task>' };
      await Todo.create({ userId, text: textTodo });
      return { reply: '✅ Added to your To‑Dos.', suggestions: ['/todo list', '/todo clear'] };
    }
    if (action === 'list') {
      const items = await Todo.find({ userId, done: false }).sort({ createdAt: -1 }).limit(10);
      if (items.length === 0) return { reply: 'No pending To‑Dos. 🎉' };
      const lines = items.map((t, i) => `${i+1}. ${t.text}`);
      return { reply: 'Your To‑Dos:\n' + lines.join('\n') };
    }
    if (action === 'clear') {
      await Todo.deleteMany({ userId });
      return { reply: '🧹 Cleared all To‑Dos.' };
    }
    return { reply: 'Usage: /todo add <task> | /todo list | /todo clear' };
  }

  if (cmd === '/plan') {
    // /plan 10 DSA:2 OS:1 ML:3
    const payload = text.replace('/plan', '').trim();
    const match = payload.match(/^(\d+)\s+(.*)$/);
    if (!match) return { reply: 'Usage: /plan <days> <Subject:weight> ...' };
    const days = Number(match[1]);
    const rest = match[2];
    const subjects = rest.split(/\s+/).map(p => {
      const [name, w] = p.split(':'); return { name, weight: Number(w || 1) };
    });
    const plan = planHours(days, subjects);
    const lines = plan.recommendation.map(s => `• ${s.name}: ${s.hoursPerDay} hrs/day`).join('\n');
    return { reply: `Study plan for next ${days} day(s):\n${lines}\n(Assumed 6 hrs/day; tweak weights as needed.)` };
  }

  if (cmd === '/menu') {
    return { reply: 'Feature placeholder: set/view mess menu (customize in code as needed).' };
  }

  return { reply: 'Unknown command. Try /help for features.' };
}
