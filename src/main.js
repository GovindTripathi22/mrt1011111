import './style.css';

const SVG_LOGO = `
  <svg viewBox="0 0 240 60" class="h-10 md:h-12 w-auto logo-glow" aria-label="MRT International">
    <text x="0" y="45" font-family="Manrope, sans-serif" font-weight="800" font-size="40" fill="#003366" letter-spacing="-1.5">MR</text>
    <text x="68" y="45" font-family="Manrope, sans-serif" font-weight="800" font-size="40" fill="#ff8c00" letter-spacing="-1.5">T</text>
    <path d="M98 15L112 5L126 15" fill="none" stroke="#ff8c00" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M112 5V22" fill="none" stroke="#ff8c00" stroke-width="5" stroke-linecap="round"/>
    <text x="0" y="58" font-family="Manrope, sans-serif" font-weight="600" font-size="10" fill="#003366" opacity="0.6" letter-spacing="4">INTERNATIONAL</text>
  </svg>
`;

const ID_MAP = {
  '1': 'home-kitchen',
  '2': 'beauty-personal-care',
  '3': 'health-wellness',
  '4': 'pet-supplies',
  '5': 'baby-kids-essentials',
  '6': 'electronics-accessories',
  '7': 'sports-fitness'
};

const API_BASE = ''; // Use relative paths for Vite proxy

const SECTION_IDS = [
  'home-kitchen-carousel', 'health-wellness-carousel', 'beauty-personal-care-carousel',
  'pet-carousel', 'baby-kids-essentials-carousel', 'electronics-carousel', 'sports-carousel'
];

class MRTApp {
  constructor() {
    // 1. CRITICAL: Force visibility before anything else
    document.body.classList.add('loaded');
    document.body.style.opacity = '1';

    this.lenis = null;
    this.lenisDriverInitialized = false;
    this.lenisRafId = null;
    this.lenisTicker = null;
    this.quickViewCleanupPending = false;
    this.previousBodyOverflow = '';
    this.globalEventsBound = false;

    // 2. Library Guards - RESTRICT SMOOTH SCROLL TO DESKTOP FOR NATIVE MOBILE FEEL
    // AVORY SCROLL FIX: Buttery smooth Lenis on Desktop, Native on Mobile
    if (window.innerWidth > 768) {
      this.lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        smoothTouch: false,
      });

      if (typeof gsap !== 'undefined') {
        gsap.ticker.add((time) => { this.lenis.raf(time * 1000); });
        gsap.ticker.lagSmoothing(0);
      }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category') || urlParams.get('c');
    const id = urlParams.get('id');
    this.currentCategory = category || ID_MAP[id] || 'home-kitchen';

    this.isBoutique = window.location.pathname.includes('category.html');

    this.injectLogos();
    this.init();

    // Global state for Quick View and persistence
    this.allProducts = [];
    this.allCategories = [];

    // Bind global functions for onclick handlers
    window.openQuickView = (id) => this.openQuickView(id);
    window.closeQuickView = () => this.closeQuickView();
    window.openReviewModal = (id, name) => this.openReviewModal(id, name);
    window.mrtApp = this;
  }

  async init() {
    try {
      // Add "Shop Now" scroll listener - Made robust to avoid invalid selector errors
      const allButtons = Array.from(document.querySelectorAll('button'));
      const shopBtn = allButtons.find(el => {
        const txt = el.textContent || '';
        return txt.includes('Explore') || txt.includes('Collections');
      }) || document.querySelector('.hero-btn') || document.querySelector('.bg-primary.text-on-primary');

      if (shopBtn) {
        shopBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const target = document.getElementById('categories') || document.querySelector('.peek-container') || document.getElementById('category-carousels-container');
          this.scrollToTarget(target);
        });
      }

      // --- RENDER AVORY-STYLE 2x4 Categories Grid (Desktop & Mobile Unified) ---
      const avoryGrid = document.getElementById('avory-categories-grid');
      if (avoryGrid) {
        try {
          const res = await fetch('/api/categories');
          const categories = await res.json();
          avoryGrid.innerHTML = categories.slice(0, 8).map(c => `
            <a href="category.html?c=${c.slug}" class="group relative aspect-[3/4.5] md:aspect-[4/5] overflow-hidden rounded-2xl md:rounded-[2.5rem] bg-gray-100 transition-all duration-700 hover:shadow-2xl">
              <img src="${c.image || '/assets/categories/' + c.slug + '.png'}" alt="${c.name}" class="h-full w-full object-cover transition-transform duration-[1.5s] group-hover:scale-110" onerror="this.src='/assets/products/premium_product_placeholder.png'">
              <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-4 md:p-8">
                <h3 class="text-lg md:text-2xl font-headline italic text-white mb-1 md:mb-2">${c.name}</h3>
                <span class="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 group-hover:text-primary transition-colors">Explore Collection</span>
              </div>
            </a>
          `).join('');
        } catch (err) { console.error('Avory Grid render failed:', err); }
      }

      if (window.location.search.includes('c=')) {
        this.initBoutique();
      } else {
        this.renderDynamicHomepage();
        this.renderHomepageTestimonials();
      }
      this.initHeaderScroll();
      this.initScrollReveal();
      this.animateReveals();
      this.bindEvents();

    } catch (err) {
      console.error('MRTApp Initialization Error:', err);
    }
  }

  injectLogos() {
    document.querySelectorAll('[data-logo]').forEach(el => {
      el.innerHTML = SVG_LOGO;
    });
  }

  async initBoutique() {
    const container = document.getElementById('category-products-container');
    if (!container) return;

    try {
      // Use category-specific endpoint for 100% reliability
      const res = await fetch(`/api/categories/${this.currentCategory}?_t=${Date.now()}`);
      if (!res.ok) throw new Error('Category or products not found');

      const data = await res.json();
      const products = data.products || [];
      const theme = data.theme;

      this.allProducts = products;
      this.currentId = data.id;
      this.currentCategoryImage = data.image;

      if (theme) {
        this.applyTheme(theme);

        // Add SEO Header at top of category page
        const titleEl = document.getElementById('seo-title');
        const introEl = document.getElementById('seo-intro');

        if (titleEl) {
          titleEl.innerText = theme.seoTitle || `Top 10 Best ${theme.title} Products (2026)`;
          titleEl.classList.add('text-gray-900', 'font-black'); 
        }
        if (introEl) {
          introEl.innerText = theme.seoIntro || `Discover the most useful, trending, and top-rated ${theme.title.toLowerCase()} products carefully selected for quality and value.`;
          introEl.classList.add('text-gray-800', 'font-medium');
        }

        // Pass the category name from data if missing in product objects
        const categoryData = { name: data.name, slug: data.slug, theme: data.theme };
        const enrichedProducts = products.map(p => ({ ...p, category: p.category || categoryData }));

        this.renderBoutiqueProducts(enrichedProducts, this.currentCategory, container);
      } else {
        container.innerHTML = `<p class="col-span-full text-center serif italic opacity-50 py-20 animate-pulse text-on-surface">Synchronizing Collection for "${this.currentCategory}"...</p>`;
      }
    } catch (err) {
      console.error('Boutique sync failed:', err);
      container.innerHTML = `<p class="col-span-full text-center serif italic opacity-50 py-20 text-on-surface">Data sync failed. Please check connection.</p>`;
    } finally {
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    }
  }

  applyTheme(theme) {
    const root = document.documentElement;
    const primary = theme.primary || '#914d00';
    const secondary = theme.secondary || '#f28c28';

    root.style.setProperty('--category-primary', primary);
    root.style.setProperty('--category-secondary', secondary);

    // Create a theme-aware semi-transparent glow for the premium cards
    const glowColor = primary.startsWith('#')
      ? `rgba(${parseInt(primary.slice(1, 3), 16)}, ${parseInt(primary.slice(3, 5), 16)}, ${parseInt(primary.slice(5, 7), 16)}, 0.15)`
      : primary;
    root.style.setProperty('--category-primary-glow', glowColor);

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('seo-title', theme.seoTitle || `Top 10 Best ${theme.title} Products (2026)`);
    set('seo-intro', theme.seoIntro || `Discover the most useful, trending, and top-rated ${theme.title.toLowerCase()} products carefully selected for quality and value.`);
    this.updateSEO(theme.title, theme.seoIntro);
  }

  updateSEO(title, description, isProduct = false, image = null) {
    document.title = `${title} | MRT International`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = description || `Explore ${title} at MRT International.`;

    let schema = {};
    if (isProduct) {
      schema = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": title,
        "description": description,
        "image": image,
        "brand": { "@type": "Brand", "name": "MRT International" }
      };
    } else {
      schema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "MRT International Holding LLC",
        "url": window.location.origin
      };
    }

    let script = document.querySelector('#seo-json-ld');
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'seo-json-ld';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema);
  }

  createProductCard(product, options = {}) {
    try {
      const name = product.name || 'Premium Product';
      const shortDesc = product.shortBenefit || product.description || '';

      // Smart Image Resolving
      let image = product.image || '';
      if (!image || image.includes('placeholder')) {
        const cleanName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const mapping = {
          'vegetable-chopper': 'vegetable-chopper.png',
          'electric-spin-scrubber': 'electric_spin_scrubber.png',
          'pet-hair-remover-roller': 'pet-hair-remover-roller.png',
          'self-cleaning-grooming-brush': 'self-cleaning-grooming-brush.png',
          'baby-nail-trimmer': 'baby-clipper-premium.png'
        };
        image = `/assets/products/${mapping[cleanName] || cleanName + '.png'}`;
      }

      // ── Price & Currency ──────────────────────────────────
      const currency     = product.currency || 'USD';
      const currencyMap  = {
        USD: '$', INR: '₹', AED: 'د.إ', EUR: '€', GBP: '£',
        JPY: '¥', CAD: 'CA$', AUD: 'A$', SGD: 'S$', SAR: '﷼'
      };
      const sym = currencyMap[currency] || currency + ' ';

      const hasPrice    = product.price && parseFloat(product.price) > 0;
      const price       = hasPrice ? parseFloat(product.price).toFixed(2) : null;
      const hasOriginal = product.originalPrice && parseFloat(product.originalPrice) > price;
      const oldPrice    = hasOriginal ? parseFloat(product.originalPrice).toFixed(2) : null;
      const discountPct = (hasPrice && hasOriginal)
        ? Math.round((1 - parseFloat(price) / parseFloat(oldPrice)) * 100)
        : null;

      const rating      = (product.ratingValue || 4.8).toFixed(1);
      const reviewCount = product.ratingCount || null;
      const isCarousel  = options.isCarousel || false;
      const badge       = product.badge || 'Top Pick';
      const affiliateUrl = product.affiliateUrl || '#';
      const productId   = product.id;
      const catName     = product.category?.name || 'Premium Collection';

      // ── Stars ─────────────────────────────────────────────
      const filledStars = Math.round(parseFloat(rating));
      const stars = [1,2,3,4,5].map(n =>
        `<span class="material-symbols-outlined" style="color:${n <= filledStars ? '#f59e0b' : '#e2ddd8'};font-variation-settings:'FILL' 1;font-size:13px;line-height:1">star</span>`
      ).join('');

      // ── Price block ───────────────────────────────────────
      let priceHtml;
      if (hasPrice) {
        priceHtml = `
          <div class="product-card__price-row">
            <span class="product-card__price">${sym}${price}</span>
            ${oldPrice ? `<span class="product-card__old-price">${sym}${oldPrice}</span>` : ''}
            ${discountPct ? `<span class="product-card__save-tag">-${discountPct}%</span>` : ''}
          </div>`;
      } else {
        priceHtml = `
          <div class="product-card__price-row no-price">
            <span class="product-card__contact-btn">
              <span class="material-symbols-outlined" style="font-size:13px">chat_bubble</span>
              Ask for price
            </span>
          </div>`;
      }

      // ── Discount badge (circle top-right) ─────────────────
      const discountBadgeHtml = discountPct
        ? `<div class="product-card__discount-badge">${discountPct}%<br>OFF</div>`
        : '';

      return `
        <article class="product-card ${isCarousel ? 'carousel-item' : ''}" data-id="${productId}" data-enhanced-card>
          <div class="product-card__image-wrap">
            <div class="product-card__badge">${badge}</div>
            ${discountBadgeHtml}
            <img
              src="${image}"
              alt="${name}"
              loading="lazy"
              onerror="this.src='/assets/products/premium_product_placeholder.png'">
          </div>

          <div class="product-card__body">
            <div class="product-card__category">${catName}</div>
            <h3 class="product-card__name">${name}</h3>
            ${shortDesc ? `<p class="product-card__benefit">${shortDesc}</p>` : ''}
            <div class="product-card__rating">
              ${stars}
              ${reviewCount ? `<span class="product-card__rating-count">(${reviewCount.toLocaleString()})</span>` : `<span class="product-card__rating-count">${rating}</span>`}
            </div>
            ${priceHtml}
          </div>

          <div class="product-card__actions">
            <a href="${affiliateUrl}"
               target="_blank"
               rel="noopener noreferrer"
               class="product-card__btn-amazon"
               data-id="${productId}">
              <span class="material-symbols-outlined">shopping_cart</span>
              <span class="btn-text">Buy Now</span>
            </a>
            <button class="product-card__btn-quickview"
                    data-qv-btn
                    data-id="${productId}">
              <span class="material-symbols-outlined">visibility</span>
              <span class="btn-text">Quick View</span>
            </button>
          </div>
        </article>
      `;
    } catch (err) {
      console.error('Error creating product card:', err);
      return '';
    }
  }






  renderBoutiqueProducts(products, categorySlug, container) {
    try {
      // list is already filtered by API
      const list = products;

      if (list.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center serif italic opacity-40 py-20">No products found in this collection.</p>`;
        return;
      }

      const categoryName = list[0].category?.name || 'Exclusive Collection';
      const categoryTheme = list[0].category?.theme || {};
      const primaryColor = categoryTheme.primary || 'var(--primary)';

      // Premium Hero Design
      const heroHtml = `
        <div class="relative w-full py-24 md:py-32 mb-16 overflow-hidden rounded-[3rem] bg-gray-900 text-white">
          <div class="absolute inset-0 opacity-40">
            <img src="${this.currentCategoryImage || '/assets/mrt-hero.png'}" class="w-full h-full object-cover blur-sm" onerror="this.src='/assets/mrt-hero.png'">
          </div>
          <div class="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent"></div>
          <div class="relative z-10 px-8 md:px-16 max-w-4xl">
            <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
               <span class="material-symbols-outlined text-sm text-primary">diamond</span>
               <span class="text-[10px] font-bold uppercase tracking-[0.2em]">${categoryName} Portfolio</span>
            </div>
            <h1 class="text-4xl md:text-6xl font-headline italic mb-6 leading-tight">${categoryName}</h1>
            <p class="text-lg md:text-xl text-white/70 font-body leading-relaxed max-w-2xl mb-8">${categoryTheme.seoIntro || 'Meticulously sourced, boutique-grade essentials selected for the MRT International global standard.'}</p>
          </div>
        </div>
      `;

      // Get unique badges for filter pills
      const badges = [...new Set(list.map(p => p.badge).filter(Boolean))];

      container.innerHTML = `
        ${heroHtml}
        <div class="mb-12">
          <div class="flex flex-wrap items-center gap-3 mb-10 overflow-x-auto pb-4 no-scrollbar">
            <button class="category-filter-pill active px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] border border-gray-100 shadow-sm transition-all duration-300 bg-gray-900 text-white" data-filter="all">
              Curated All <span class="ml-2 opacity-50 font-medium">${list.length}</span>
            </button>
            ${badges.map(b => {
              const count = list.filter(p => p.badge === b).length;
              return `<button class="category-filter-pill px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] border border-gray-100 shadow-sm transition-all duration-300 bg-white text-gray-400 hover:text-gray-900 hover:border-gray-200" data-filter="${b}">
                ${b} <span class="ml-2 opacity-30 font-medium">${count}</span>
              </button>`;
            }).join('')}
          </div>
          
          <div id="category-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            ${list.map((p, i) => `<div class="category-card-wrapper" data-badge="${p.badge || ''}" style="animation: fadeSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.05}s both;">${this.createProductCard(p)}</div>`).join('')}
          </div>
        </div>
      `;

      // Filter pill interactivity
      container.querySelectorAll('.category-filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          container.querySelectorAll('.category-filter-pill').forEach(p => {
            p.classList.remove('bg-gray-900', 'text-white', 'active');
            p.classList.add('bg-white', 'text-gray-400');
          });
          pill.classList.remove('bg-white', 'text-gray-400');
          pill.classList.add('bg-gray-900', 'text-white', 'active');

          const filter = pill.dataset.filter;
          container.querySelectorAll('.category-card-wrapper').forEach((card, idx) => {
            const badge = card.dataset.badge;
            const show = filter === 'all' || badge === filter;
            if (show) {
              card.classList.remove('hidden');
              card.style.animation = 'none';
              card.offsetHeight; // force reflow
              card.style.animation = `fadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 0.03}s both`;
            } else {
              card.classList.add('hidden');
            }
          });
        });
      });
      
      this.initCardInteractions('category-products-container');
    } catch (err) {
      console.error("[MRT] Failed to render Boutique products:", err);
    }
  }


  initCardInteractions(targetId = null) {
    const selector = targetId ? `#${targetId} [data-enhanced-card]` : '[data-enhanced-card]';
    const cards = document.querySelectorAll(selector);
    
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
        card.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);

        // Subtle 3D Tilt - Enhanced for Premium feel
        const xc = rect.width / 2;
        const yc = rect.height / 2;
        const dx = (x - xc) / (rect.width / 2);
        const dy = (y - yc) / (rect.height / 2);

        if (typeof gsap !== 'undefined') {
          gsap.to(card, {
            rotateY: dx * 8, // More pronounced tilt
            rotateX: -dy * 8,
            boxShadow: `${-dx * 20}px ${-dy * 20}px 50px -10px rgba(0,0,0,0.1)`,
            duration: 0.4,
            ease: 'power2.out'
          });
        }
      });

      card.addEventListener('mouseleave', () => {
        card.style.setProperty('--x', `50%`);
        card.style.setProperty('--y', `50%`);
        if (typeof gsap !== 'undefined') {
          gsap.to(card, {
            rotateY: 0,
            rotateX: 0,
            duration: 0.8,
            ease: 'elastic.out(1, 0.7)'
          });
        }
      });
    });

    // High-performance Reveal Animations - Professional & Robust
    const animSections = targetId ? [targetId] : [...(SECTION_IDS || []), 'category-products-container'];

    animSections.forEach(id => {
      const container = document.getElementById(id);
      if (!container) return;
      const sectionCards = container.querySelectorAll('.product-card-premium');
      
      if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' && sectionCards.length > 0) {
        // Ensure they are visible if GSAP fails or trigger doesn't hit
        gsap.set(sectionCards, { opacity: 0, y: 30 });

        gsap.to(sectionCards, {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.05,
          ease: "power2.out",
          scrollTrigger: {
            trigger: container,
            start: 'top 95%',
            toggleActions: 'play none none none'
          }
        });
      }
    });

    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
  }

  initLenis() {
    if (!this.lenis || this.lenisDriverInitialized) return;

    this.lenisDriverInitialized = true;

    if (typeof gsap !== 'undefined') {
      this.lenisTicker = (time) => {
        this.lenis?.raf(time * 1000);
      };
      gsap.ticker.add(this.lenisTicker);
      gsap.ticker.lagSmoothing(0);
      return;
    }

    const raf = (time) => {
      if (!this.lenis) return;
      this.lenis.raf(time);
      this.lenisRafId = requestAnimationFrame(raf);
    };

    this.lenisRafId = requestAnimationFrame(raf);
  }

  scrollToTarget(target) {
    if (!target) return;

    if (this.lenis) {
      this.lenis.scrollTo(target, {
        duration: 1.1,
      });
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  getProductBenefits(product) {
    if (Array.isArray(product.keyBenefits) && product.keyBenefits.length > 0) {
      return product.keyBenefits;
    }

    if (typeof product.keyBenefits === 'string' && product.keyBenefits.trim()) {
      try {
        const parsed = JSON.parse(product.keyBenefits);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (err) {
        console.warn('[MRT] Failed to parse keyBenefits for Quick View:', product.id, err);
      }
    }

    return ['Superior Build', 'Premium Quality', 'Global Standards'];
  }

  initScrollReveal() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);
    
    const currentPath = window.location.pathname;
    document.querySelectorAll('nav a').forEach(link => {
      const href = link.getAttribute('href');
      if (currentPath.includes(href) && href !== 'index.html') {
         link.classList.add('text-on-surface', 'border-b-2', 'border-primary');
         link.classList.remove('text-on-surface-variant');
      }
    });

    gsap.utils.toArray('.category-pill').forEach(pill => {
       gsap.from(pill, { x: 50, opacity: 0, duration: 1, stagger: 0.1, ease: "power3.out" });
    });
  }

  async renderDynamicHomepage() {
    try {
      console.log("[MRT] Initializing Dynamic Homepage...");
      const [catsRes, productsRes] = await Promise.all([
        fetch(`/api/categories?_t=${Date.now()}`),
        fetch(`/api/products?limit=100&_t=${Date.now()}`)
      ]);
      
      const categories = await catsRes.json();
      const productsData = await productsRes.json();
      const products = Array.isArray(productsData) ? productsData : (productsData.products || []);
      
      if (categories && categories.length > 0) {
        this.allCategories = categories;
        this.allProducts = products;
        
        // --- RENDER AVORY-STYLE CIRCLE CATEGORIES ---
        const avoryContainer = document.getElementById('avory-categories');
        if (avoryContainer && categories.length > 0) {
          // Render only the first 8 categories for the horizontal scroll
          const displayCats = categories.slice(0, 8);
          avoryContainer.innerHTML = displayCats.map(c => `
            <a href="category.html?c=${c.slug}" class="flex flex-col items-center gap-2 min-w-[76px] md:min-w-[100px] snap-start group cursor-pointer text-decoration-none">
                <div class="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border border-gray-200 shadow-sm group-hover:border-primary transition-all duration-300 p-0.5 bg-white">
                    <img src="${c.image || `/assets/categories/${c.slug}.png`}" alt="${c.name}" loading="lazy" class="w-full h-full object-cover rounded-full bg-gray-50">
                </div>
                <span class="text-[10px] md:text-xs font-semibold text-center leading-tight text-gray-800 line-clamp-2">${c.name}</span>
            </a>
          `).join('');
        }
        this.renderDynamicCarousels(categories, products);
        this.updateSEO("Home", "Global Sourcing Platform");
      } else {
        console.warn("[MRT] No categories found for Bento Grid.");
      }
    } catch (err) { 
      console.error('Dynamic homepage sync failed:', err); 
    } finally { 
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh(); 
    }
  }

  renderBentoGrid(categories) {
    try {
      if (!Array.isArray(categories)) return;
      const slots = ['cat-slot-1', 'cat-slot-2', 'cat-slot-3', 'cat-slot-4'];
      
      // PRIORITY: Prioritize the most professional categories for the boutique homepage
      const prioritySlugs = ['home-kitchen', 'health-wellness', 'electronics-accessories', 'pet-supplies'];
      const firstFour = prioritySlugs.map(slug => categories.find(c => c.slug === slug)).filter(Boolean);
      
      // Fallback to slice(0, 4) only if priority categories are missing
      if (firstFour.length < 4) {
        const remaining = categories.filter(c => !prioritySlugs.includes(c.slug));
        while (firstFour.length < 4 && remaining.length > 0) {
            firstFour.push(remaining.shift());
        }
      }

      console.log(`[MRT] Rendering Bento Grid with ${firstFour.length} items.`);

      firstFour.forEach((c, index) => {
          const el = document.getElementById(slots[index]);
          if (!el) return;
          
          const isLarge = index === 0;
          const bgCol = isLarge ? 'from-black/90 via-black/40' : 'from-black/80 via-black/20';
          let imgUrl = c.image || `/assets/categories/${c.slug}.png`;
          // PATCH: Force the correct pet supplies image
          if (c.slug === 'pet-supplies' || c.name.toLowerCase().includes('pet')) {
              imgUrl = '/assets/categories/pet-supplies.png'; 
          }
          
          el.innerHTML = `
            <a href="category.html?c=${c.slug}" class="w-full h-full block relative group">
                <img src="${imgUrl}" alt="${c.name}" class="w-full h-full object-cover transition-transform duration-[1.5s] ${isLarge ? 'group-hover:scale-105' : 'group-hover:scale-110'}" onerror="this.src='/assets/products/premium_product_placeholder.png'">
                <div class="absolute inset-0 bg-gradient-to-t ${bgCol} to-transparent flex flex-col ${isLarge ? 'p-16' : 'p-10'} justify-end">
                    <h3 class="${isLarge ? 'text-5xl mb-6' : 'text-3xl mb-3'} text-white font-headline italic">${c.name}</h3>
                    <p class="text-white/70 ${isLarge ? 'text-xl mb-10 max-w-xl' : 'text-sm mb-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500'}">${c.description || 'Curated excellence for elite standards.'}</p>
                    <span class="inline-flex items-center text-primary-container font-bold uppercase tracking-widest text-[10px]">Explore Items <span class="material-symbols-outlined ml-2 text-sm">arrow_forward</span></span>
                </div>
            </a>
          `;
      });
    } catch (err) {
      console.error("[MRT] Bento Grid Render Error:", err);
    }
  }

  renderCategoriesGrid(categories) {
    try {
      // 1. Check for legacy grid first (Desktop)
      const grid = document.getElementById('categories-grid');
      // 2. Check for new Avory bubbles (Mobile)
      const bubbleContainer = document.getElementById('avory-categories');

      if (grid) {
        grid.innerHTML = categories.map((c, index) => {
            const isSeventh = index === 6 || (index > 0 && index === categories.length - 1 && categories.length > 5);
            const bgCol = isSeventh ? 'from-black/90 via-black/40' : 'from-black/80 via-black/20';
            const isPet = c.slug === 'pet-supplies' || c.name.toLowerCase().includes('pet');
            const imgSrc = isPet ? '/assets/categories/pet-supplies.png' : (c.image || `/assets/categories/${c.slug}.png`);

            return `
              <a href="category.html?c=${c.slug}" class="group relative ${isSeventh ? 'col-span-1 md:col-span-2 lg:col-span-3 h-[400px]' : 'h-[500px]'} rounded-[3rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-700 border border-outline-variant/10 block">
                  <img src="${imgSrc}" alt="${c.name}" loading="lazy" decoding="async" class="w-full h-full object-cover transition-transform duration-[1.5s] ${isSeventh ? 'group-hover:scale-105' : 'group-hover:scale-110'}">
                  <div class="absolute inset-0 bg-gradient-to-${isSeventh ? 'r' : 't'} ${bgCol} to-transparent flex flex-col ${isSeventh ? 'justify-center p-20' : 'justify-end p-12'}">
                      <h3 class="${isSeventh ? 'text-5xl mb-6' : 'text-4xl mb-4'} text-white font-headline italic">${c.name}</h3>
                      <p class="${isSeventh ? 'text-white/70 text-xl mb-10 max-w-xl' : 'text-white/70 text-lg mb-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500'}">${c.description || 'Explore our premium selection.'}</p>
                      ${isSeventh ? `<div><span class="inline-flex items-center bg-primary text-on-primary px-10 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:scale-105 transition-all">Explore Peak Gear <span class="material-symbols-outlined ml-3">arrow_forward</span></span></div>` : `<span class="inline-flex items-center text-primary-container font-bold uppercase tracking-widest text-xs">Explore Items <span class="material-symbols-outlined ml-2">arrow_forward</span></span>`}
                  </div>
              </a>
            `;
        }).join('');
      }

      if (bubbleContainer) {
        bubbleContainer.innerHTML = categories.map(c => {
          const isPet = c.slug === 'pet-supplies' || c.name.toLowerCase().includes('pet');
          const imgSrc = isPet ? '/assets/categories/pet-supplies.png' : (c.image || `/assets/categories/${c.slug}.png`);
          
          return `
            <a href="category.html?c=${c.slug}" class="flex flex-col items-center gap-3 flex-shrink-0 snap-start group">
              <div class="w-20 h-20 rounded-full overflow-hidden border-2 border-transparent group-hover:border-primary transition-all duration-300 shadow-sm">
                <img src="${imgSrc}" alt="${c.name}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
              </div>
              <span class="text-[11px] font-bold uppercase tracking-widest text-gray-900 group-hover:text-primary transition-colors text-center max-w-[80px] leading-tight">${c.name}</span>
            </a>
          `;
        }).join('');
      }
    } catch (err) {
      console.error("[MRT] Categories Render Error:", err);
    }
  }

  renderDynamicCarousels(categories, products) {
    try {
      const container = document.getElementById('category-carousels-container');
      if (!container) return;
      
      container.innerHTML = categories.map((c, idx) => {
          const list = products.filter(p => p.categoryId === c.id || p.category?.slug === c.slug).slice(0, 8);
          if (list.length === 0) return '';
          
          const isAlt = idx % 2 === 1;
          const bgClass = isAlt ? 'bg-[#fcf8f5]' : 'bg-white';
          
          const primary = c.theme?.primary || '#914d00';
          const secondary = c.theme?.secondary || '#ff8c00';
          const r = parseInt(primary.slice(1, 3), 16) || 145;
          const g = parseInt(primary.slice(3, 5), 16) || 77;
          const b = parseInt(primary.slice(5, 7), 16) || 0;
          
          const itemsHtml = list.map(p => this.createProductCard(p, { isCarousel: true })).join('');
          
          return `
            <section class="py-24 md:py-32 ${bgClass} overflow-hidden carousel-section border-b border-outline-variant/10" style="--category-primary:${primary};--category-secondary:${secondary};--category-primary-glow:rgba(${r},${g},${b},0.15)">
                <div class="px-4 md:px-8 max-w-screen-2xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 md:mb-16 reveal-up">
                    <div class="flex flex-col">
                        <span class="text-[10px] font-black text-primary uppercase tracking-[0.5em] mb-4 opacity-60">Boutique Department</span>
                        <h2 class="text-5xl md:text-7xl font-headline italic tracking-tighter">${c.name.split(' ').map((word, i, arr) => i === arr.length - 1 ? `<i>${word}</i>` : word).join(' ')}</h2>
                    </div>
                    <div class="section-nav flex items-center space-x-8">
                        <button class="nav-prev hover:text-primary transition-all duration-300 transform hover:-translate-x-2" data-target="${c.slug}-carousel"><span class="material-symbols-outlined text-[48px] opacity-40 hover:opacity-100">keyboard_backspace</span></button>
                        <button class="nav-next hover:text-primary transition-all duration-300 transform hover:translate-x-2" data-target="${c.slug}-carousel"><span class="material-symbols-outlined text-[48px] opacity-40 hover:opacity-100">trending_flat</span></button>
                    </div>
                </div>
                <div id="${c.slug}-carousel" class="px-8 pb-12 peek-container flex overflow-x-auto snap-x snap-mandatory gap-8 no-scrollbar scroll-smooth">
                    ${itemsHtml}
                </div>
            </section>
          `;
      }).join('');
      this.initCardInteractions();
      this.bindEvents();
    } catch (err) {
      console.error("[MRT] Dynamic Carousels Render Error:", err);
    }
  }

  async renderHomepageTestimonials() {
    try {
      const res = await fetch('/api/testimonials');
      if (res.ok) {
        const data = await res.json();
        this.renderTestimonials(data);
      }
    } catch (err) { console.error('Testimonial sync failed:', err); }
    finally { if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh(); }
  }



  renderTestimonials(testimonials) {
    const render = (id, reg) => {
      const el = document.getElementById(id);
      if (!el) return;
      const list = testimonials.filter(t => t.region === reg);
      el.innerHTML = list.map((t, idx) => `
        <div class="p-5 md:p-7 lg:p-10 bg-white/85 md:bg-white/70 lg:bg-white/40 backdrop-blur-xl rounded-[1.75rem] md:rounded-[2rem] lg:rounded-[2.5rem] border border-primary/10 md:border-white/70 lg:border-white/60 hover:shadow-2xl transition-all duration-700 group reveal-up relative overflow-hidden shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:shadow-[0_24px_60px_rgba(15,23,42,0.08)] lg:shadow-none" 
             style="transition-delay: ${idx * 150}ms">
          <div class="absolute inset-x-0 top-0 h-24 md:h-28 lg:hidden bg-gradient-to-br from-primary/12 via-primary/5 to-transparent"></div>
          <div class="absolute top-0 right-0 p-4 md:p-5 lg:p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <span class="material-symbols-outlined text-5xl md:text-6xl text-primary">format_quote</span>
          </div>
          <div class="relative z-10 flex lg:hidden items-center justify-between gap-3 mb-4 md:mb-5">
            <span class="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-[0.28em] text-primary lg:hidden">Verified Voice</span>
            <div class="flex space-x-1">
              ${Array(5).fill('<span class="material-symbols-outlined text-sm text-primary fill-primary">star</span>').join('')}
            </div>
          </div>
          <div class="hidden lg:flex mb-6 space-x-1">
            ${Array(5).fill('<span class="material-symbols-outlined text-sm text-primary fill-primary">star</span>').join('')}
          </div>
          <p class="text-lg md:text-[1.35rem] lg:text-2xl font-headline italic mb-6 md:mb-8 lg:mb-10 leading-relaxed text-on-surface opacity-90 group-hover:opacity-100 transition-opacity relative z-10">"${t.text}"</p>
          <div class="flex items-center gap-3 md:gap-4 relative z-10">
            <div class="w-11 h-11 md:w-12 md:h-12 rounded-2xl md:rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base md:text-lg ring-1 ring-primary/10">
              ${t.name.charAt(0)}
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-xs md:text-sm font-bold uppercase tracking-[0.18em] md:tracking-[0.2em] text-primary">${t.name}</span>
              <span class="text-[10px] uppercase tracking-[0.22em] md:tracking-widest text-on-surface-variant opacity-60 font-bold">${t.location}</span>
            </div>
          </div>
        </div>
      `).join('');
    };
    render('testimonials-us', 'us');
    render('testimonials-ae', 'ae');
  }

  initHeaderScroll() {
    const header = document.querySelector('header');
    if (!header) return;
    window.addEventListener('scroll', () => {
      header.classList.toggle('bg-white/80', window.scrollY > 20);
      header.classList.toggle('backdrop-blur-xl', window.scrollY > 20);
      header.classList.toggle('shadow-xl', window.scrollY > 20);
    });
  }

  animateReveals() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    
    // Register plugin to be safe
    gsap.registerPlugin(ScrollTrigger);

    gsap.utils.toArray('.reveal-up').forEach(el => {
      gsap.from(el, {
        scrollTrigger: { 
          trigger: el, 
          start: 'top 96%', // Trigger earlier
          toggleActions: 'play none none none',
          onEnter: () => el.classList.add('active') // Add class too
        },
        y: 30, // Subtle movement
        opacity: 0, 
        duration: 1.2, 
        ease: 'expo.out',
        clearProps: "all" // Remove GSAP styles after animation to avoid conflicts
      });
    });

    // Refresh after a delay to ensure everything is rendered
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 1000);
  }

  // Premium Styles are now in style.css

  bindEvents() {
    document.querySelectorAll('.nav-prev, .nav-next').forEach(btn => {
      if (btn.dataset.bound === 'true') return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const el = document.getElementById(btn.dataset.target);
        if (el) el.scrollBy({ left: btn.classList.contains('nav-prev') ? -400 : 400, behavior: 'smooth' });
      });
    });

    if (!this.globalEventsBound) {
      document.addEventListener('click', (e) => {
        const qvBtn = e.target.closest('[data-qv-btn]');
        if (qvBtn) {
          e.stopPropagation();
          this.openQuickView(qvBtn.dataset.id);
          return;
        }

        const reviewBtn = e.target.closest('[data-review-btn]');
        if (reviewBtn) {
          this.openReviewModal(reviewBtn.dataset.productId, reviewBtn.dataset.productName);
          return;
        }

        if (e.target.closest('a, button, input, textarea, select, label')) return;

        // Clicking anywhere on the card body (not a button/link) opens Quick View
        const card = e.target.closest('[data-enhanced-card]');
        if (card) {
          this.openQuickView(card.dataset.id);
        }
      });

      this.globalEventsBound = true;
    }

    // Smooth anchor scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      if (anchor.dataset.bound === 'true') return;
      anchor.dataset.bound = 'true';
      anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (!href || href === '#') return;
        e.preventDefault();
        const target = document.querySelector(href);
        this.scrollToTarget(target);
      });
    });

    // --- AVORY MOBILE SLIDE-OUT DRAWER ---
    const menuBtn = document.getElementById('mobile-menu-btn');
    const closeBtn = document.getElementById('close-drawer-btn');
    const drawer = document.getElementById('mobile-drawer');
    const overlay = document.getElementById('mobile-drawer-overlay');

    if (menuBtn && drawer && overlay) {
      const openDrawer = () => {
        drawer.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);
        document.body.style.overflow = 'hidden'; 
      };
      const closeDrawer = () => {
        drawer.classList.add('-translate-x-full');
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 300);
        document.body.style.overflow = ''; 
      };
      if (menuBtn.dataset.bound !== 'true') {
        menuBtn.dataset.bound = 'true';
        menuBtn.addEventListener('click', (e) => { e.preventDefault(); openDrawer(); });
      }
      if (closeBtn && closeBtn.dataset.bound !== 'true') {
        closeBtn.dataset.bound = 'true';
        closeBtn.addEventListener('click', (e) => { e.preventDefault(); closeDrawer(); });
      }
      if (overlay.dataset.bound !== 'true') {
        overlay.dataset.bound = 'true';
        overlay.addEventListener('click', closeDrawer);
      }
      
      // Close on link click
      drawer.querySelectorAll('a').forEach(link => {
        if (link.dataset.drawerBound === 'true') return;
        link.dataset.drawerBound = 'true';
        link.addEventListener('click', closeDrawer);
      });
    }

    const contactForm = document.getElementById('contact-form');
    if (contactForm && contactForm.dataset.bound !== 'true') {
      contactForm.dataset.bound = 'true';
      contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = contactForm.querySelector('button[type="submit"]');
        const originalText = btn?.innerText || 'Send Message';
        if (btn) {
          btn.innerText = 'Sending...';
          btn.disabled = true;
        }

        const data = Object.fromEntries(new FormData(contactForm).entries());

        try {
          const res = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          const result = await res.json();

          if (result.success) {
            alert('Message sent successfully!');
            contactForm.reset();
          } else {
            alert(result.error || 'Something went wrong.');
          }
        } catch (err) {
          alert('Error connecting to server.');
        } finally {
          if (btn) {
            btn.innerText = originalText;
            btn.disabled = false;
          }
        }
      });
    }

    // --- REVIEWS ROUTING FIX ---
    const reviewForm = document.getElementById('review-form');
    if (reviewForm && reviewForm.dataset.bound !== 'true') {
      reviewForm.dataset.bound = 'true';
      reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = reviewForm.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        btn.innerText = "Submitting...";
        btn.disabled = true;

        const formData = new FormData(reviewForm);
        const data = {
          productId: formData.get('productId'),
          userName: formData.get('name'), 
          rating: parseInt(formData.get('rating')),
          comment: formData.get('text'), // Mapping 'text' to 'comment'
          location: formData.get('location') || 'Global'
        };

        try {
          const res = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          if (res.ok) {
            alert('Thank you! Review submitted for approval.');
            reviewForm.closest('.fixed').remove();
          } else { throw new Error('Failed'); }
        } catch (err) {
          alert('Error submitting review.');
          btn.innerText = originalText;
          btn.disabled = false;
        }
      });
    }

    // Expose globally for any legacy callers
    window.closeQuickView = () => this.closeQuickView();
  }

  async openQuickView(productId) {
    const product = this.allProducts.find(p => String(p.id) === String(productId));
    if (!product) { console.warn('[MRT] openQuickView: product not found:', productId); return; }

    // Create or reuse modal shell
    let modal = document.getElementById('mrt-qv-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'mrt-qv-modal';
      document.body.appendChild(modal);
    }

    const price    = product.price ? parseFloat(product.price).toFixed(2) : '39.99';
    const oldPrice = (parseFloat(price) * 1.42).toFixed(2);
    const rating   = (product.ratingValue || 4.8).toFixed(1);
    const rawBenefits = this.getProductBenefits(product);

    const benefitDelay = (i) => `animation-delay:${i * 80}ms`;

    const modalWasOpen = modal.classList.contains('is-open');
    modal.classList.remove('is-open');
    this.quickViewCleanupPending = false;

    modal.innerHTML = `
      <div class="mrt-qv-backdrop" id="mrt-qv-backdrop"></div>
      <div class="mrt-qv-panel">

        <button class="mrt-qv-close" id="mrt-qv-close-btn">
          <span class="mso" style="font-size:20px">close</span>
        </button>

        <!-- Left: image -->
        <div class="mrt-qv-img-col">
          <img src="${product.image || '/assets/products/premium_product_placeholder.png'}"
               alt="${product.name}"
               onerror="this.src='/assets/products/premium_product_placeholder.png'">
        </div>

        <!-- Right: content -->
        <div class="mrt-qv-content-col">

          <!-- Badge + rating -->
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">
            <span style="padding:4px 14px;border-radius:999px;background:rgba(145,77,0,.1);color:var(--primary,#914d00);font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.08em">${product.badge || 'Premium'}</span>
            <div style="display:flex;align-items:center;gap:4px;font-size:13px;font-weight:700;color:#111">
              <span class="mso" style="font-size:16px;color:#f59e0b;font-variation-settings:'FILL' 1">star</span>
              ${rating} <span style="color:#9ca3af;font-weight:400;font-size:12px;margin-left:2px">(${product.ratingCount || '500+'})</span>
            </div>
          </div>

          <h2 style="font-size:clamp(1.4rem,3vw,2rem);font-weight:900;color:#0f172a;line-height:1.2;margin-bottom:8px">${product.name}</h2>
          <p style="font-size:14px;color:#64748b;line-height:1.7;margin-bottom:20px">${product.description || product.shortBenefit || 'Experience the finest MRT International selection.'}</p>

          <!-- Benefits -->
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:22px">
            ${rawBenefits.map((b, i) => `
              <div class="mrt-benefit-item" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;background:#f8fafc;border:1px solid #f1f5f9;${benefitDelay(i)}">
                <span class="mso" style="font-size:18px;color:var(--primary,#914d00);font-variation-settings:'FILL' 1">check_circle</span>
                <span style="font-size:12px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:.06em">${b}</span>
              </div>`).join('')}
          </div>

          <!-- Price + CTA -->
          <div style="margin-top:auto;padding-top:16px;border-top:1px solid #f1f5f9">
            <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:14px">
              <span style="font-size:32px;font-weight:900;color:#0f172a">$${price}</span>
              <span style="font-size:14px;color:#d1d5db;text-decoration:line-through">$${oldPrice}</span>
              <span style="font-size:10px;font-weight:900;color:#16a34a;background:#f0fdf4;padding:2px 10px;border-radius:999px;margin-left:auto">Save 29%</span>
            </div>
            <a href="${product.affiliateUrl || '#'}" target="_blank" rel="noopener noreferrer"
               style="display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:15px 0;border-radius:14px;background:linear-gradient(90deg,#f59e0b,#f97316);color:#fff;font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;text-decoration:none;box-shadow:0 6px 24px rgba(249,115,22,.4);transition:transform .2s,box-shadow .2s"
               onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 10px 32px rgba(249,115,22,.5)'"
               onmouseout="this.style.transform='';this.style.boxShadow='0 6px 24px rgba(249,115,22,.4)'">
              <span class="mso" style="font-size:20px">shopping_cart</span>
              Buy Now — Best Price
            </a>
          </div>
        </div>
      </div>
    `;

    // Wire close
    document.getElementById('mrt-qv-backdrop').addEventListener('click', () => this.closeQuickView());
    document.getElementById('mrt-qv-close-btn').addEventListener('click', () => this.closeQuickView());

    if (!modal.dataset.escapeBound) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.closeQuickView();
      });
      modal.dataset.escapeBound = 'true';
    }

    // Open animation (two-frame trick)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        modal.classList.add('is-open');
      });
    });

    // Prevent body scroll
    if (!modalWasOpen) {
      this.previousBodyOverflow = document.body.style.overflow;
    }
    document.body.style.overflow = 'hidden';
  }

  closeQuickView() {
    const modal = document.getElementById('mrt-qv-modal');
    if (!modal) return;
    modal.classList.remove('is-open');
    
    // Ensure overflow is ALWAYS restored, even if transition fails
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
    
    // Remove from DOM after transition finishes
    modal.addEventListener('transitionend', () => {
      if (!modal.classList.contains('is-open')) modal.innerHTML = '';
    }, { once: true });
    
    // Safety fallback in case transition event doesn't fire on mobile Safari
    setTimeout(() => {
        if (!modal.classList.contains('is-open')) modal.innerHTML = '';
    }, 500);
  }

  openReviewModal(id, name) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[110] flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="absolute inset-0 bg-black/60 backdrop-blur-md" onclick="this.parentElement.remove()"></div>
      <div class="relative w-full max-w-xl bg-white rounded-3xl p-10 shadow-2xl">
        <h3 class="text-2xl font-bold mb-2">Review ${name}</h3>
        <p class="text-gray-500 mb-8">Share your experience with the global community.</p>
        <form class="space-y-6" id="review-form">
          <input type="hidden" name="productId" value="${id}">
          <div>
            <label class="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Rating</label>
            <div class="flex gap-2">
              ${[1, 2, 3, 4, 5].map(i => `
                <input type="radio" name="rating" value="${i}" id="r${i}" class="hidden peer" required>
                <label for="r${i}" class="cursor-pointer text-gray-300 peer-checked:text-primary hover:text-primary transition-colors">
                  <span class="material-symbols-outlined text-3xl">star</span>
                </label>
              `).join('')}
            </div>
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Message</label>
            <textarea name="text" class="w-full bg-gray-50 border border-gray-100 rounded-2xl p-5 focus:ring-2 ring-primary outline-none transition-all" rows="4" placeholder="Your thoughts..." required></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <input type="text" name="name" placeholder="Name" class="bg-gray-50 border border-gray-100 rounded-2xl p-5" required>
            <input type="text" name="location" placeholder="Location (e.g. Dubai, UAE)" class="bg-gray-50 border border-gray-100 rounded-2xl p-5" required>
          </div>
          <button type="submit" class="w-full py-5 bg-primary text-white rounded-2xl font-bold tracking-widest uppercase hover:opacity-90 transition-all">Submit Global Review</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    // Re-bind events to catch the new form
    this.bindEvents();
  }

  async submitReview(productId, form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    
    submitBtn.innerText = "Submitting...";
    submitBtn.disabled = true;

    try {
      const formData = new FormData(form);
      const data = {
        productId,
        userName: formData.get('userName'),
        location: formData.get('location'),
        rating: parseInt(formData.get('rating')),
        comment: formData.get('comment'),
      };

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        form.closest('.fixed').remove();
        alert('Thank you! Your review has been submitted for approval.');
      } else {
        throw new Error('Failed to submit');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting review. Please try again.');
      submitBtn.innerText = originalText;
      submitBtn.disabled = false;
    }
  }

}

document.addEventListener('DOMContentLoaded', () => {
  new MRTApp();
});
