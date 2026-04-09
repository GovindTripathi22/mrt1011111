import express from 'express';
import crypto from 'crypto';
import prisma from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Public: Track click and redirect
router.get('/redirect/:productId', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const ipHash = crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex').slice(0, 16);
    await prisma.affiliateClick.create({
      data: {
        productId: product.id,
        source: req.query.source || req.headers.referer || '',
        userAgent: (req.headers['user-agent'] || '').slice(0, 200),
        ipHash,
        sessionId: req.query.sid || '',
      },
    });

    const redirectUrl = product.affiliateUrl || `https://wa.me/?text=I+am+interested+in+${encodeURIComponent(product.name)}`;
    res.redirect(302, redirectUrl);
  } catch (err) {
    console.error('Affiliate redirect error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Analytics overview
router.get('/analytics', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 86400000);

    const totalClicks = await prisma.affiliateClick.count({ where: { createdAt: { gte: since } } });
    const topProducts = await prisma.affiliateClick.groupBy({
      by: ['productId'],
      _count: { id: true },
      where: { createdAt: { gte: since } },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const productDetails = await prisma.product.findMany({
      where: { id: { in: topProducts.map(t => t.productId) } },
      select: { id: true, name: true, image: true, price: true, badge: true },
    });

    const dailyClicks = await prisma.affiliateClick.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      where: { createdAt: { gte: since } },
    });

    res.json({
      totalClicks,
      topProducts: topProducts.map(t => ({
        ...productDetails.find(p => p.id === t.productId),
        clicks: t._count.id,
      })),
      dailyClicks,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
