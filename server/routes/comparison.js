import express from 'express';
import prisma from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const sid = req.query.sid;
    if (!sid) return res.json([]);
    const items = await prisma.comparisonItem.findMany({
      where: { sessionId: sid },
      include: { product: { include: { category: { select: { slug: true, name: true } } } } },
    });
    items.forEach(item => {
      item.product.keyBenefits = JSON.parse(item.product.keyBenefits || '[]');
      item.product.pros = JSON.parse(item.product.pros || '[]');
      item.product.cons = JSON.parse(item.product.cons || '[]');
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { sessionId, productId } = req.body;
    if (!sessionId || !productId) return res.status(400).json({ error: 'sessionId and productId required' });
    const count = await prisma.comparisonItem.count({ where: { sessionId } });
    if (count >= 4) return res.status(400).json({ error: 'Maximum 4 products for comparison' });
    const item = await prisma.comparisonItem.upsert({
      where: { sessionId_productId: { sessionId, productId } },
      update: {},
      create: { sessionId, productId },
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:productId', async (req, res) => {
  try {
    const sid = req.query.sid;
    if (!sid) return res.status(400).json({ error: 'sid required' });
    await prisma.comparisonItem.deleteMany({ where: { sessionId: sid, productId: req.params.productId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
