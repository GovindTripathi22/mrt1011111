import express from 'express';
import prisma from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { invalidateCache } from '../middleware/cache.js';

const router = express.Router();

// Public: List all categories with themes
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { theme: true, _count: { select: { products: true } } },
    });
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: Get category by slug with products
router.get('/:slug', async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { slug: req.params.slug },
      include: { theme: true, products: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
    });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    category.products = category.products.map(p => ({
      ...p,
      keyBenefits: JSON.parse(p.keyBenefits || '[]'),
      pros: JSON.parse(p.pros || '[]'),
      cons: JSON.parse(p.cons || '[]'),
      tags: JSON.parse(p.tags || '[]'),
    }));
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Create category
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, slug, description, image, parentId, metaTitle, metaDescription, sortOrder, theme } = req.body;
    const category = await prisma.category.create({
      data: {
        name, description, image, parentId: parentId || null,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        metaTitle: metaTitle || '', metaDescription: metaDescription || '',
        sortOrder: sortOrder || 0,
        ...(theme ? { theme: { create: { title: theme.title || name, subtitle: theme.subtitle, primary: theme.primary || '#914d00', secondary: theme.secondary || '#f28c28', seoTitle: theme.seoTitle, seoIntro: theme.seoIntro } } } : {}),
      },
      include: { theme: true },
    });
    invalidateCache();
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Update category
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, slug, description, image, parentId, metaTitle, metaDescription, sortOrder, theme } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (parentId !== undefined) updateData.parentId = parentId;
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const category = await prisma.category.update({ where: { id: parseInt(req.params.id) }, data: updateData });

    if (theme) {
      await prisma.categoryTheme.upsert({
        where: { categoryId: parseInt(req.params.id) },
        update: { ...theme },
        create: { categoryId: parseInt(req.params.id), title: theme.title || category.name, ...theme },
      });
    }
    invalidateCache();
    const full = await prisma.category.findUnique({ where: { id: parseInt(req.params.id) }, include: { theme: true } });
    res.json(full);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Delete category
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: parseInt(req.params.id) } });
    invalidateCache();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
