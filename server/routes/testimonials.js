import express from 'express';
import prisma from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Public: List active testimonials
router.get('/', async (req, res) => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(testimonials);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Create
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const t = await prisma.testimonial.create({ data: req.body });
    res.status(201).json(t);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Update
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const t = await prisma.testimonial.update({ where: { id: req.params.id }, data: req.body });
    res.json(t);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Delete
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await prisma.testimonial.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
