import express from 'express';
import { evaluate } from 'mathjs';
import fs from 'fs';
import path from 'path';
import Todo from '../models/Todo.js'; // your todo mongoose model

const router = express.Router();

// Load intents.json
const intentsPath = path.join(process.cwd(), 'data', 'intents.json');
let intents = { intents: [] };
if (fs.existsSync(intentsPath)) {
  intents = JSON.parse(fs.readFileSync(intentsPath, 'utf-8'));
}

// Helper to match user message to intents
function matchIntent(message) {
  const msg = message.toLowerCase();
  for (const intent of intents.intents) {
    for (const pattern of intent.patterns) {
      if (msg.includes(pattern.toLowerCase())) {
        const responses = intent.responses;
        return responses[Math.floor(Math.random() * responses.length)];
      }
    }
  }
  return null;
}

router.post('/chat', async (req, res) => {
  let { userId, text, persona } = req.body;
  let reply = '';
  let suggestions = [];

  if (!userId) userId = Math.floor(Math.random()*1000000).toString();

  // === Commands ===
  if (text.startsWith('/help')) {
    reply = 'Available commands: /calc, /gpa, /convert, /todo add/list/clear, /plan';
    suggestions = ['/calc (3+5)/2', '/gpa 95,86,72|3,4,3', '/todo list', '/plan 7 DSA:2 OS:1 ML:3'];
  } 
  else if (text.startsWith('/calc')) {
    const expr = text.replace('/calc', '').trim();
    try { reply = evaluate(expr).toString(); } 
    catch { reply = 'Invalid expression'; }
  } 
  else if (text.startsWith('/gpa')) {
    const input = text.replace('/gpa', '').trim();
    try {
      const [marksPart, creditsPart] = input.split('|');
      const marks = marksPart.split(',').map(Number);
      const credits = creditsPart.split(',').map(Number);
      let total = 0, creditSum = 0;
      for (let i = 0; i < marks.length; i++) {
        total += (marks[i]/10) * credits[i]; 
        creditSum += credits[i];
      }
      reply = (total / creditSum).toFixed(2);
    } catch { reply = 'Invalid GPA format'; }
  } 
  else if (text.startsWith('/convert')) {
    const parts = text.split(' ');
    if (parts.length === 4 && parts[2] === 'cm' && parts[3] === 'ft') {
      const val = parseFloat(parts[1]);
      reply = (val / 30.48).toFixed(2) + ' ft';
    } else { reply = 'Conversion not supported'; }
  } 

  // === To-Do Commands ===
  else if (text.startsWith('/todo')) {
    const cmd = text.replace('/todo','').trim();

    if (cmd.startsWith('add ')) {
      const task = cmd.replace('add ','');
      await Todo.create({ userId, text: task });
      reply = `Added To-Do: "${task}"`;
    } 
    else if (cmd === 'list') {
      const items = await Todo.find({ userId });
      if (!items.length) reply = 'No To-Dos yet.';
      else reply = items.map(t => '• ' + t.text).join('<br>');
    } 
    else if (cmd === 'clear') {
      await Todo.deleteMany({ userId });
      reply = 'All To-Dos cleared!';
    } 
    else {
      reply = 'Use /todo add <task>, /todo list, or /todo clear';
    }
    suggestions = ['/todo add Buy milk', '/todo list', '/todo clear'];
  } 

  // === Plan Command ===
  else if (text.startsWith('/plan')) {
    const planText = text.replace('/plan','').trim();
    if (!planText) reply = 'Provide your plan like: /plan 7 DSA:2 OS:1 ML:3';
    else {
      const parts = planText.split(' ').slice(1);
      if (parts.length === 0) parts.push(planText);
      reply = parts.map(p => p.replace(':',' → ')).join('<br>');
    }
  } 

  // === Default: intents.json ===
  else {
    const matched = matchIntent(text);
    reply = matched || 'I did not understand that. Try /help';
  }

  res.json({ userId, reply, suggestions });
});

export default router;
