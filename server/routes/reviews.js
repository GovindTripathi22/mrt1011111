import express from 'express';
import prisma from '../db.js';

const router = express.Router();

// GET /api/reviews/:productId
router.get('/:productId', async (req, res) => {
  const { productId } = req.params;
  try {
    const reviews = await prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// POST /api/reviews
router.post('/', async (req, res) => {
  const { productId, userName, rating, comment } = req.body;
  
  if (!productId || !userName || !rating || !comment) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const review = await prisma.review.create({
      data: {
        productId,
        userName,
        rating: parseInt(rating),
        comment,
        isVerified: false, 
      },
    });

    // Update product review count/rating cache
    const allReviews = await prisma.review.findMany({ where: { productId } });
    const avgRating = allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length;
    
    await prisma.product.update({
      where: { id: productId },
      data: {
        reviewCount: allReviews.length,
        ratingValue: avgRating,
        rating: `${avgRating.toFixed(1)}/5 Recommended`
      }
    });

    res.status(201).json(review);
  } catch (err) {
    console.error('Review Create Error:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

export default router;
