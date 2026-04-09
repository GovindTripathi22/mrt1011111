import express from 'express';
import prisma from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// GET /api/admin/stats - Consolidated dashboard metrics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const [productCount, categoryCount, clickCount, subscriberCount, testimonialCount, reviewCount] = await Promise.all([
      prisma.product.count(),
      prisma.category.count(),
      prisma.affiliateClick.count(),
      prisma.newsletterSub.count(), // FIXED: Matches schema model name
      prisma.testimonial.count(),
      prisma.review.count(),
    ]);

    const recentClicks = await prisma.affiliateClick.findMany({
      take: 10,
      orderBy: { clickedAt: 'desc' }, // FIXED: Matches schema field name
      include: { product: { select: { name: true, image: true, categoryId: true } } },
    });

    res.json({ 
      productCount, 
      categoryCount, 
      clickCount, 
      subscriberCount, 
      testimonialCount, 
      reviewCount,
      recentClicks 
    });
  } catch (err) {
    console.error('Admin Stats Error:', err);
    res.status(500).json({ error: 'Failed to fetch admin statistics' });
  }
});

// GET /api/admin/analytics - Detailed click data for charts
router.get('/analytics', authMiddleware, adminOnly, async (req, res) => {
  try {
    const clicks = await prisma.affiliateClick.findMany({
      take: 1000,
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { name: true, categoryId: true } } }
    });
    
    // Group by category for chart
    const categoryDistribution = await prisma.product.groupBy({
      by: ['categoryId'],
      _count: true
    });

    res.json({ clicks, categoryDistribution });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /api/admin/reviews - All reviews for moderation
router.get('/reviews', authMiddleware, adminOnly, async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { name: true, image: true } } }
    });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch all reviews' });
  }
});

// POST /api/admin/reviews/:id/verify - Moderation
router.post('/reviews/:id/verify', authMiddleware, adminOnly, async (req, res) => {
  try {
    const review = await prisma.review.update({
      where: { id: req.params.id },
      data: { isVerified: true }
    });
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify review' });
  }
});

export default router;
