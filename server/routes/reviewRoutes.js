import express from 'express';
import Review from '../models/Review.js';

const router = express.Router();

// Create a review
router.post('/', async (req, res) => {
  try {
    const { userId, rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
    const r = await Review.create({ userId, rating, comment });
    res.json({ success: true, review: r });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// List reviews and summary
router.get('/', async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 }).limit(100);
    const agg = await Review.aggregate([
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    const summary = agg[0] || { avg: 0, count: 0 };
    res.json({ reviews, avg: summary.avg || 0, count: summary.count || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
