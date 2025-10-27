import express from 'express';
import User from '../models/User.js';
import Message from '../models/Message.js';
import { bestMatch, listIntents } from '../services/nlp.js';
import { handleCommand } from '../services/tools.js';

const router = express.Router();

function suggestFromIntent(intent) {
  const tag = (intent.tags && intent.tags[0]) || '';
  const suggestions = {
    greeting: ['Study Tips', 'Start Pomodoro', '/todo add Read OS ch-3'],
    help: ['/gpa 90,88,79|3,3,4', '/convert 180 cm ft', '/calc (3+5)/2'],
    exam: ['/plan 10 DSA:2 OS:1 ML:3'],
    study_tips: ['Start Pomodoro', 'Open To‑Do', 'Make Study Plan'],
    canteen: ['/menu', 'To‑Do List']
  }[tag] || ['Open To‑Do', 'Start Pomodoro', '/help'];
  return suggestions;
}

router.post('/chat', async (req, res) => {
  try {
    const { userId, text, persona } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Empty message' });

    let user = null;
    if (userId) {
      user = await User.findById(userId);
    }
    if (!user) {
      user = await User.create({ persona: persona || 'friendly' });
    } else if (persona && user.persona !== persona) {
      user.persona = persona;
      await user.save();
    }

    await Message.create({ userId: user._id, role: 'user', text });

    // Commands (start with /)
    if (text.trim().startsWith('/')) {
      const out = await handleCommand(user._id, text);
      const replyText = out.reply || 'Done.';
      await Message.create({ userId: user._id, role: 'bot', text: replyText });
      return res.json({
        userId: user._id,
        reply: replyText,
        suggestions: out.suggestions || [],
        actions: []
      });
    }

    // NLP intent matching
    const match = bestMatch(text);
    let reply = 'I am not sure yet. Try rephrasing or use /help for features.';
    let suggestions = [];

    if (match) {
      const intent = match.intent;
      const resp = intent.responses[Math.floor(Math.random() * intent.responses.length)];
      reply = resp;
      suggestions = suggestFromIntent(intent);
    }

    // persona influence
    if (user.persona === 'formal') {
      reply = reply.replace('Hey!', 'Hello.').replace('Hi!', 'Hello.');
    } else {
      reply += ' 🙂';
    }

    await Message.create({ userId: user._id, role: 'bot', text: reply });

    res.json({
      userId: user._id,
      reply,
      suggestions,
      actions: []
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/history/:userId', async (req, res) => {
  const { userId } = req.params;
  const msgs = await Message.find({ userId }).sort({ createdAt: 1 }).lean();
  res.json(msgs);
});

router.get('/intents', async (req, res) => {
  res.json({ intents: listIntents() });
});

export default router;
