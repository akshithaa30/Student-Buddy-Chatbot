import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const todosFile = path.resolve('todos.json');

// Helper functions
function readTodos() {
  if (!fs.existsSync(todosFile)) return {};
  return JSON.parse(fs.readFileSync(todosFile));
}
function writeTodos(data) {
  fs.writeFileSync(todosFile, JSON.stringify(data, null, 2));
}

// List To-Dos
router.get('/:userId', (req, res) => {
  const { userId } = req.params;
  const data = readTodos();
  res.json(data[userId] || []);
});

// Add To-Do
router.post('/:userId', (req, res) => {
  const { userId } = req.params;
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required' });

  const data = readTodos();
  if (!data[userId]) data[userId] = [];
  data[userId].push({ text });
  writeTodos(data);
  res.json({ success: true });
});

// Clear To-Dos
router.delete('/:userId', (req, res) => {
  const { userId } = req.params;
  const data = readTodos();
  data[userId] = [];
  writeTodos(data);
  res.json({ success: true });
});

export default router;
