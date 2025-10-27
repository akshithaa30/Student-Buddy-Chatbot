import express from 'express';
import Intent from '../models/Intent.js';

const router = express.Router();

router.post('/intent', async (req, res) => {
  const { tags, patterns, responses } = req.body;
  if (!patterns || !responses) return res.status(400).json({ error: 'patterns and responses required' });
  const doc = await Intent.create({ tags: tags || [], patterns, responses });
  res.json(doc);
});

router.get('/intent', async (req, res) => {
  const items = await Intent.find().sort({ createdAt: -1 }).lean();
  res.json(items);
});

export default router;
