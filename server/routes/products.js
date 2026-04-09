import express from 'express';
import prisma from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { cacheMiddleware, invalidateCache } from '../middleware/cache.js';

const router = express.Router();

// Router-level Debug
router.use((req, res, next) => {
  console.log(`[PRODUCTS ROUTER] ${req.method} ${req.url}`);
  next();
});

// Public: Get product by ID
router.get('/:id', async (req, res) => {
  console.log(`[DEBUG] Entered GET /:id with param: ${req.params.id}`);
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { category: true },
    });
    console.log(`[DEBUG] Data found: ${product ? product.name : 'NULL'}`);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(parseJsonFields(product));
  } catch (err) {
    console.error(`[DEBUG] Error:`, err);
    res.status(500).json({ error: 'Server error' });
  }
});
function parseJsonFields(product) {
  return {
    ...product,
    images: JSON.parse(product.images || '[]'),
    tags: JSON.parse(product.tags || '[]'),
    keyBenefits: JSON.parse(product.keyBenefits || '[]'),
    pros: JSON.parse(product.pros || '[]'),
    cons: JSON.parse(product.cons || '[]'),
  };
}

// Public: List products with filters, sorting, pagination
router.get('/', async (req, res) => {
  try {
    const { category, badge, search, sort, order, page = 1, limit = 50, featured } = req.query;
    const where = { isActive: true };
    if (category) where.category = { slug: category };
    if (badge) where.badge = badge;
    if (featured === 'true') where.isFeatured = true;
    if (search) where.name = { contains: search };

    const orderBy = {};
    if (sort === 'price') orderBy.price = order === 'desc' ? 'desc' : 'asc';
    else if (sort === 'rating') orderBy.ratingValue = 'desc';
    else if (sort === 'newest') orderBy.createdAt = 'desc';
    else orderBy.sortOrder = 'asc';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: parseInt(limit),
        include: { category: { select: { slug: true, name: true } } },
      }),
      prisma.product.count({ where }),
    ]);

    res.set('Cache-Control', 'public, max-age=3600');
    res.json({
      products: products.map(parseJsonFields),
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error('Products list error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: Get product by slug
router.get('/by-slug/:slug', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: { category: true },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(parseJsonFields(product));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: Get related products
router.get('/:id/related', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const related = await prisma.product.findMany({
      where: { categoryId: product.categoryId, id: { not: product.id }, isActive: true },
      take: 6,
      orderBy: { ratingValue: 'desc' },
    });
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(related.map(parseJsonFields));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Create product
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const data = req.body;
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug,
        shortBenefit: data.shortBenefit || '',
        description: data.description || '',
        price: parseFloat(data.price) || 0,
        image: data.image || '',
        badge: data.badge || '',
        ratingValue: parseFloat(data.ratingValue) || 5.0,
        categoryId: parseInt(data.categoryId),
        tags: JSON.stringify(data.tags || []),
        keyBenefits: JSON.stringify(data.keyBenefits || []),
        affiliateUrl: data.affiliateUrl || '',
        isActive: data.isActive !== false,
        sortOrder: parseInt(data.sortOrder) || 0,
      },
    });
    invalidateCache('products');
    res.status(201).json(parseJsonFields(product));
  } catch (err) {
    console.error('Product create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin: Update product
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const data = req.body;
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.shortBenefit !== undefined) updateData.shortBenefit = data.shortBenefit;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = parseFloat(data.price);
    if (data.compareAtPrice !== undefined) updateData.compareAtPrice = data.compareAtPrice ? parseFloat(data.compareAtPrice) : null;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.images !== undefined) updateData.images = JSON.stringify(data.images);
    if (data.badge !== undefined) updateData.badge = data.badge;
    if (data.rating !== undefined) updateData.rating = data.rating;
    if (data.ratingValue !== undefined) updateData.ratingValue = parseFloat(data.ratingValue);
    if (data.categoryId !== undefined) updateData.categoryId = parseInt(data.categoryId);
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.keyBenefits !== undefined) updateData.keyBenefits = JSON.stringify(data.keyBenefits);
    if (data.affiliateUrl !== undefined) updateData.affiliateUrl = data.affiliateUrl;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.sortOrder !== undefined) updateData.sortOrder = parseInt(data.sortOrder);

    const product = await prisma.product.update({ 
      where: { id: parseInt(req.params.id) }, 
      data: updateData 
    });
    invalidateCache('products');
    res.json(parseJsonFields(product));
  } catch (err) {
    console.error('Product update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin: Delete product
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: parseInt(req.params.id) } });
    invalidateCache('products');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Bulk create/update
router.post('/bulk', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { products } = req.body;
    const results = [];
    for (const data of products) {
      const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const product = await prisma.product.upsert({
        where: { slug },
        update: { name: data.name, price: parseFloat(data.price) || 0, image: data.image || '', badge: data.badge || '' },
        create: {
          name: data.name, slug, price: parseFloat(data.price) || 0, image: data.image || '',
          badge: data.badge || '', categoryId: data.categoryId,
          keyBenefits: JSON.stringify(data.keyBenefits || []),
          shortBenefit: data.shortBenefit || '', rating: data.rating || '',
        },
      });
      results.push(product);
    }
    invalidateCache('products');
    res.json({ imported: results.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
