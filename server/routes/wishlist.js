import express from 'express';
import prisma from '../db.js';

const router = express.Router();

// Get wishlist by session
router.get('/', async (req, res) => {
  try {
    const sid = req.query.sid;
    if (!sid) return res.json([]);
    const items = await prisma.wishlistItem.findMany({
      where: { sessionId: sid },
      include: { product: { include: { category: { select: { slug: true, name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    items.forEach(item => {
      item.product.keyBenefits = JSON.parse(item.product.keyBenefits || '[]');
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add to wishlist
router.post('/', async (req, res) => {
  try {
    const { sessionId, productId } = req.body;
    if (!sessionId || !productId) return res.status(400).json({ error: 'sessionId and productId required' });
    const item = await prisma.wishlistItem.upsert({
      where: { sessionId_productId: { sessionId, productId } },
      update: {},
      create: { sessionId, productId },
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove from wishlist
router.delete('/:productId', async (req, res) => {
  try {
    const sid = req.query.sid;
    if (!sid) return res.status(400).json({ error: 'sid required' });
    await prisma.wishlistItem.deleteMany({ where: { sessionId: sid, productId: req.params.productId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
