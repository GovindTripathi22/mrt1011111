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

class ShoppingCart {
  constructor() {
    this.items = JSON.parse(localStorage.getItem('mrt_cart')) || [];
    this.init();
  }
  init() { this.bindEvents(); }
  bindEvents() {
    document.addEventListener('click', (e) => {
      const addBtn = e.target.closest('[data-add-to-cart]');
      if (addBtn) {
        const product = JSON.parse(addBtn.dataset.product);
        this.addItem(product);
      }
    });
  }
  addItem(product) { this.items.push(product); localStorage.setItem('mrt_cart', JSON.stringify(this.items)); }
}

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

    // 2. Library Guards
    if (typeof Lenis !== 'undefined') {
      this.lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true
      });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category') || urlParams.get('c');
    const id = urlParams.get('id');
    this.currentCategory = category || ID_MAP[id] || 'home-kitchen';
    
    this.isBoutique = window.location.pathname.includes('category.html');

    this.injectLogos();
    this.init();
    
    this.cart = new ShoppingCart();
  }

  async init() {
    try {
      this.initHeaderScroll();
      if (this.lenis) this.initLenis();

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
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      }

      // Mobile Menu
      const mobileBtn = document.getElementById('mobile-menu-btn');
      const mobileNav = document.getElementById('mobile-menu');
      if (mobileBtn && mobileNav) {
         mobileBtn.addEventListener('click', () => {
             mobileNav.classList.toggle('hidden');
             mobileNav.classList.toggle('flex');
             mobileNav.classList.toggle('flex-col');
             mobileNav.classList.toggle('absolute');
             mobileNav.classList.toggle('top-16');
             mobileNav.classList.toggle('left-0');
             mobileNav.classList.toggle('w-full');
             mobileNav.classList.toggle('bg-white');
             mobileNav.classList.toggle('p-6');
             mobileNav.classList.toggle('shadow-xl');
         });
      }

      if (this.isBoutique) {
        await this.initBoutique();
      } else {
        await this.renderDynamicHomepage();
        await this.renderHomepageTestimonials();
      }

      this.initScrollReveal();
      this.animateReveals();
      this.bindEvents();
      this.initSmoothScroll();
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
      // Surgical cache bust on core JSON data fetching only
      const [productsRes, themesRes] = await Promise.all([
        fetch(`/api/legacy/products?_t=${Date.now()}`),
        fetch(`/api/legacy/themes?_t=${Date.now()}`)
      ]);

      if (!productsRes.ok || !themesRes.ok) throw new Error('API error');

      const products = await productsRes.json();
      const themes = await themesRes.json();
      const theme = themes[this.currentCategory];

      if (theme) {
        this.applyTheme(theme);
        this.renderBoutiqueProducts(products, this.currentCategory, container);
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
      ? `rgba(${parseInt(primary.slice(1,3), 16)}, ${parseInt(primary.slice(3,5), 16)}, ${parseInt(primary.slice(5,7), 16)}, 0.15)`
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
    const variant = options.variant || 'boutique';
    const name = product.name || 'Product';
    const badge = product.badge || 'Top Pick';
    const shortDesc = product.shortBenefit || 'Premium quality product selected for elite needs.';
    const benefits = (product.keyBenefits ? (typeof product.keyBenefits === 'string' ? JSON.parse(product.keyBenefits) : product.keyBenefits) : ['High Quality', 'Durable', 'Effective']).slice(0, 3);
    const ratingStr = product.rating || '4.8/5 Recommended';
    const image = product.image || '';
    const affiliateUrl = product.affiliateUrl || '#';
    
    const ratingDisplay = `⭐ [${product.ratingValue || 4.8}/5 Recommended]`;
    
    const cardClasses = variant === 'homepage'      ? 'product-card-premium product-card-compact group flex-shrink-0 w-[300px] md:w-[380px] snap-start cursor-pointer'
      : 'product-card-premium group snap-start block w-full border border-outline-variant/20 hover:border-transparent transition-all duration-300 cursor-pointer';

    return `
      <article class="${cardClasses} p-6 group" data-premium-card data-id="${product.id}">
        <div class="relative mb-8 rounded-[2rem] overflow-hidden bg-surface-variant/5 border border-outline-variant/10 p-12 flex items-center justify-center min-h-[320px] transition-all duration-700 group-hover:scale-[1.02] group-hover:bg-surface-variant/10">
          <div class="absolute top-6 left-6 z-30 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.35em] shadow-lg border border-white/20" style="background-color: var(--category-primary, #914d00); color: white;">
            ${badge}
          </div>

          <div class="product-shine"></div>

          ${image
            ? `<img src="${image}" alt="${name}" loading="lazy" decoding="async" class="w-full h-full object-contain relative z-10 transition-all duration-700 group-hover:scale-110 floating-image drop-shadow-[0_20px_40px_rgba(0,0,0,0.1)]">`
            : `<div class="w-full h-full flex items-center justify-center opacity-20 text-on-surface"><span class="material-symbols-outlined text-7xl">image</span></div>`
          }
        </div>
`+ "        " + `
        <div class="flex flex-col flex-grow text-left relative z-20">
          <div class="flex items-center gap-3 mb-3">
             <span class="text-[10px] uppercase font-black tracking-[0.4em] text-primary/40">${product.category?.name || 'Collection'}</span>
             <div class="h-[1px] flex-grow bg-primary/10"></div>
          </div>
          <h3 class="text-3xl md:text-4xl font-headline italic text-on-surface mb-4 leading-none tracking-tighter group-hover:text-primary transition-colors">${name}</h3>
          <p class="text-base text-on-surface-variant font-body mb-8 line-clamp-2 opacity-60 leading-relaxed font-medium capitalize italic">${shortDesc}</p>
          
          <div class="flex flex-col gap-5">
            <div class="flex items-center justify-between pb-6 border-b border-primary/5">
               <div class="flex flex-col">
                 <span class="text-[10px] uppercase font-black tracking-widest text-primary/40 mb-1">Elite Pricing</span>
                 <span class="text-4xl font-bold text-on-surface tracking-tighter">$${product.price ? product.price.toFixed(2) : '39.99'}</span>
               </div>
               <div class="flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10">
                  <span class="material-symbols-outlined text-sm text-primary fill-primary">star</span>
                  <span class="text-xs font-black text-primary">${product.ratingValue || 4.8}</span>
               </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <a href="${affiliateUrl}" target="_blank" class="bg-[#FF9900] text-[#111] rounded-2xl py-5 px-4 text-center text-[10px] font-black uppercase tracking-[0.25em] shadow-2xl shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all duration-500 flex items-center justify-center gap-3">
                <span class="material-symbols-outlined text-base">shopping_bag</span>
                Amazon Selection
              </a>
              <button data-id="${product.id}" class="glass-panel-premium text-primary rounded-2xl py-5 px-4 text-center text-[10px] font-black uppercase tracking-[0.25em] hover:bg-primary hover:text-white transition-all duration-500 active:scale-95 flex items-center justify-center gap-3" onclick="window.mrtApp.openQuickView('${product.id}')">
                <span class="material-symbols-outlined text-base">auto_awesome</span>
                Pro Max View
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  renderBoutiqueProducts(products, category, container) {
    const filtered = products.filter(p => p.category === category);
    if (filtered.length === 0) {
      container.innerHTML = `<p class="col-span-full text-center serif italic opacity-50 py-20 text-on-surface">No products in "${category}" yet.</p>`;
      return;
    }

    const sections = [
      { badge: 'Top Pick', title: '⭐ Top Picks' },
      { badge: 'Trending Now', title: '🔥 Trending Now' },
      { badge: "Editor's Choice", title: "💡 Editor's Choice" }
    ];

    const unassigned = filtered.filter(p => !sections.some(s => s.badge === p.badge));

    container.innerHTML = sections.map(sec => {
      const secProducts = filtered.filter(p => p.badge === sec.badge);
      if (secProducts.length === 0) return '';
      return `
        <div class="category-section mb-32">
          <div class="flex flex-col mb-16">
             <h2 class="text-6xl md:text-8xl font-headline italic text-on-surface mb-4">${sec.title}</h2>
             <div class="h-1 w-40 bg-primary/20" style="background-color: var(--category-primary, #914d0055);"></div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12">
            ${secProducts.map(p => this.createProductCard(p)).join('')}
          </div>
        </div>
      `;
    }).join('') + (unassigned.length > 0 ? `
        <div class="category-section mb-32">
          <div class="flex flex-col mb-16">
             <h2 class="text-6xl md:text-8xl font-headline italic text-on-surface mb-4">Elite Collection</h2>
             <div class="h-1 w-40 opacity-20" style="background-color: var(--category-primary, #914d00);"></div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12">
            ${unassigned.map(p => this.createProductCard(p)).join('')}
          </div>
        </div>
    ` : '');
    
    this.initCardInteractions('category-products-container');
  }

  initCardInteractions(targetId = null) {
    const selector = targetId ? `#${targetId} [data-premium-card]` : '[data-premium-card]';
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
    const raf = (t) => { this.lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
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
        fetch(`/api/products?_t=${Date.now()}`)
      ]);
      
      const categories = catsRes.ok ? await catsRes.json() : [];
      const productsData = productsRes.ok ? await productsRes.json() : { products: [] };
      const products = productsData.products || [];
      
      console.log(`[MRT] Data Sync: ${categories.length} categories, ${products.length} products`);

      if (categories.length > 0) {
        this.renderBentoGrid(categories);
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
      if (!Array.isArray(categories)) return;
      const slots = ['cat-slot-1', 'cat-slot-2', 'cat-slot-3', 'cat-slot-4'];
      const firstFour = categories.slice(0, 4);
      
      console.log(`[MRT] Rendering Bento Grid with ${firstFour.length} items.`);

      firstFour.forEach((c, index) => {
          const el = document.getElementById(slots[index]);
          if (!el) return;
          
          const isLarge = index === 0;
          const bgCol = isLarge ? 'from-black/90 via-black/40' : 'from-black/80 via-black/20';
          const imgUrl = c.image || `/assets/categories/${c.slug}.png`;
          
          el.innerHTML = `
            <a href="category.html?c=${c.slug}" class="w-full h-full block relative group">
                <img src="${imgUrl}" alt="${c.name}" class="w-full h-full object-cover transition-transform duration-[1.5s] ${isLarge ? 'group-hover:scale-105' : 'group-hover:scale-110'}" onerror="this.src='/assets/products/premium_product_placeholder.png'">
                <div class="absolute inset-0 bg-gradient-to-t ${bgCol} to-transparent flex flex-col ${isLarge ? 'justify-end p-16' : 'justify-end p-10'}">
                    <h3 class="${isLarge ? 'text-5xl mb-6' : 'text-3xl mb-3'} text-white font-headline italic">${c.name}</h3>
                    <p class="text-white/70 ${isLarge ? 'text-xl mb-10 max-w-xl' : 'text-sm mb-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500'}">${c.description || 'Curated excellence for elite standards.'}</p>
                    <span class="inline-flex items-center text-primary-container font-bold uppercase tracking-widest text-[10px]">Explore Items <span class="material-symbols-outlined ml-2 text-sm">arrow_forward</span></span>
                </div>
            </a>
          `;
      });
  }

  renderCategoriesGrid(categories) {
      const grid = document.getElementById('categories-grid');
      if (!grid) return;
      
      grid.innerHTML = categories.map((c, index) => {
          const isSeventh = index === 6 || (index > 0 && index === categories.length - 1 && categories.length > 5);
          const bgCol = isSeventh ? 'from-black/90 via-black/40' : 'from-black/80 via-black/20';
          return `
            <a href="category.html?c=${c.slug}" class="group relative ${isSeventh ? 'col-span-1 md:col-span-2 lg:col-span-3 h-[400px]' : 'h-[500px]'} rounded-[3rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-700 border border-outline-variant/10 block">
                <img src="${c.image || `/assets/categories/${c.slug}.png`}" alt="${c.name}" loading="lazy" decoding="async" class="w-full h-full object-cover transition-transform duration-[1.5s] ${isSeventh ? 'group-hover:scale-105' : 'group-hover:scale-110'}">
                <div class="absolute inset-0 bg-gradient-to-${isSeventh ? 'r' : 't'} ${bgCol} to-transparent flex flex-col ${isSeventh ? 'justify-center p-20' : 'justify-end p-12'}">
                    <h3 class="${isSeventh ? 'text-5xl mb-6' : 'text-4xl mb-4'} text-white font-headline italic">${c.name}</h3>
                    <p class="${isSeventh ? 'text-white/70 text-xl mb-10 max-w-xl' : 'text-white/70 text-lg mb-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500'}">${c.description || 'Explore our premium selection.'}</p>
                    ${isSeventh ? `<div><span class="inline-flex items-center bg-primary text-on-primary px-10 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:scale-105 transition-all">Explore Peak Gear <span class="material-symbols-outlined ml-3">arrow_forward</span></span></div>` : `<span class="inline-flex items-center text-primary-container font-bold uppercase tracking-widest text-xs">Explore Items <span class="material-symbols-outlined ml-2">arrow_forward</span></span>`}
                </div>
            </a>
          `;
      }).join('');
  }

  renderDynamicCarousels(categories, products) {
      const container = document.getElementById('category-carousels-container');
      if (!container) return;
      
      container.innerHTML = categories.map(c => {
          const list = products.filter(p => p.categoryId === c.id || p.category?.slug === c.slug).slice(0, 8);
          if (list.length === 0) return '';
          
          const primary = c.theme?.primary || '#914d00';
          const secondary = c.theme?.secondary || '#ff8c00';
          const r = parseInt(primary.slice(1, 3), 16) || 145;
          const g = parseInt(primary.slice(3, 5), 16) || 77;
          const b = parseInt(primary.slice(5, 7), 16) || 0;
          
          const itemsHtml = list.map(p => this.createProductCard(p, { variant: 'homepage' })).join('');
          
          return `
            <section class="py-24 bg-surface overflow-hidden carousel-section" style="--category-primary:${primary};--category-secondary:${secondary};--category-primary-glow:rgba(${r},${g},${b},0.15)">
                <div class="px-8 max-w-screen-2xl mx-auto flex justify-between items-end mb-12 reveal-up">
                    <h2 class="text-4xl font-headline italic">${c.name.split(' ').map((word, i, arr) => i === arr.length - 1 ? `<i>${word}</i>` : word).join(' ')}</h2>
                    <div class="section-nav flex items-center space-x-6">
                        <button class="nav-prev hover:text-primary transition-all duration-300" data-target="${c.slug}-carousel"><span class="material-symbols-outlined text-[36px]">arrow_back_ios</span></button>
                        <button class="nav-next hover:text-primary transition-all duration-300" data-target="${c.slug}-carousel"><span class="material-symbols-outlined text-[36px]">arrow_forward_ios</span></button>
                    </div>
                </div>
                <div id="${c.slug}-carousel" class="px-8 pb-12 peek-container flex overflow-x-auto snap-x snap-mandatory gap-6 no-scrollbar">
                    ${itemsHtml}
                </div>
            </section>
          `;
      }).join('');
      this.initCardInteractions();
      this.bindEvents();
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
        <div class="p-10 bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/60 hover:shadow-2xl transition-all duration-700 group reveal-up relative overflow-hidden" 
             style="transition-delay: ${idx * 150}ms">
          <div class="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <span class="material-symbols-outlined text-6xl text-primary">format_quote</span>
          </div>
          <div class="flex mb-6 space-x-1">
            ${Array(5).fill('<span class="material-symbols-outlined text-sm text-primary fill-primary">star</span>').join('')}
          </div>
          <p class="text-2xl font-headline italic mb-10 leading-relaxed text-on-surface opacity-90 group-hover:opacity-100 transition-opacity relative z-10">"${t.text}"</p>
          <div class="flex items-center space-x-4 relative z-10">
            <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
              ${t.name.charAt(0)}
            </div>
            <div class="flex flex-col">
              <span class="text-sm font-bold uppercase tracking-[0.2em] text-primary">${t.name}</span>
              <span class="text-[10px] uppercase tracking-widest text-on-surface-variant opacity-50 font-bold">${t.location}</span>
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

  initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  bindEvents() {
    document.querySelectorAll('.nav-prev, .nav-next').forEach(btn => {
      btn.addEventListener('click', () => {
        const el = document.getElementById(btn.dataset.target);
        if (el) el.scrollBy({ left: btn.classList.contains('nav-prev') ? -400 : 400, behavior: 'smooth' });
      });
    });

    // Quick View & Review Modal Listeners
    document.addEventListener('click', async (e) => {
      const card = e.target.closest('[data-premium-card]');
      const buyBtn = e.target.closest('.shimmer-btn'); // Link to Amazon
      
      // If clicking card but NOT direct buy button
      if (card && !buyBtn) {
        const productId = card.dataset.id;
        this.openQuickView(productId);
      }

      const reviewBtn = e.target.closest('[data-review-btn]');
      if (reviewBtn) {
        this.openReviewModal(reviewBtn.dataset.productId, reviewBtn.dataset.productName);
      }
    });
  }

  async openQuickView(productId) {
    try {
      // PRO MAX: Resilient dual-path fetching for dev stability (127.0.0.1 priority)
      let response = await fetch(`/api/products/${productId}?_t=${Date.now()}`);
      
      if (!response.ok) {
        console.warn(`[MRT] Relative API fetch failed (${response.status}), attempting direct bypass to 127.0.0.1...`);
        response = await fetch(`http://127.0.0.1:3001/api/products/${productId}?_t=${Date.now()}`);
      }

      if (!response.ok) throw new Error('Product details unavailable');
      const product = await response.json();

      let reviews = [];
      try {
        let reviewsRes = await fetch(`/api/reviews/${productId}?_t=${Date.now()}`);
        if (!reviewsRes.ok) {
           reviewsRes = await fetch(`http://127.0.0.1:3001/api/reviews/${productId}?_t=${Date.now()}`);
        }
        if (reviewsRes.ok) reviews = await reviewsRes.json();
      } catch(e) { console.warn('Reviews fetch failed, continuing with empty list'); }

      const benefits = (product.keyBenefits ? (typeof product.keyBenefits === 'string' ? JSON.parse(product.keyBenefits) : product.keyBenefits) : []).slice(0, 4);

      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 md:p-8 animate-fade-in';
      overlay.innerHTML = `
        <div class="bg-surface w-full max-w-6xl rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row max-h-[95vh] animate-scale-up border border-white/10">
          <button class="absolute top-8 right-8 z-50 text-on-surface/40 hover:text-on-surface bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all" id="close-quickview">
            <span class="material-symbols-outlined text-3xl">close</span>
          </button>
          
          <!-- Image Section -->
          <div class="w-full md:w-1/2 bg-surface-variant/10 p-12 flex items-center justify-center relative group min-h-[400px]">
            <div class="premium-glow-bg absolute inset-0 opacity-20 transition-opacity duration-1000"></div>
            <img src="${product.image}" alt="${product.name}" class="w-full h-full object-contain relative z-10 floating-image drop-shadow-2xl">
          </div>
          
          <!-- Info Section -->
          <div class="w-full md:w-1/2 p-12 overflow-y-auto detail-scrollbar bg-surface/50 backdrop-blur-md">
            <div class="mb-10">
              <div class="flex items-center gap-3 mb-4">
                <span class="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary text-white">${product.badge || 'Elite'}</span>
                <div class="flex items-center gap-1 text-primary">
                   <span class="material-symbols-outlined text-lg fill-primary">star</span>
                   <span class="font-bold text-sm">${product.ratingValue || 4.9} / 5</span>
                </div>
              </div>
              <h2 class="text-4xl md:text-5xl font-headline italic text-on-surface mb-4 leading-tight">${product.name}</h2>
              <p class="text-lg text-on-surface-variant font-body opacity-80 leading-relaxed">${product.shortBenefit}</p>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              ${benefits.map(b => `
                <div class="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <span class="material-symbols-outlined text-primary text-xl" style="font-variation-settings: 'FILL' 1">verified</span>
                  <span class="text-xs font-bold text-on-surface opacity-80 uppercase tracking-wide text-left">${b}</span>
                </div>
              `).join('')}
            </div>
            
            <!-- Price & Action -->
            <div class="flex flex-col sm:flex-row items-center justify-between gap-6 mb-12 p-8 rounded-3xl bg-primary/5 border border-primary/10">
              <div class="text-center sm:text-left">
                <p class="text-[10px] uppercase font-black tracking-widest text-primary opacity-60 mb-1">Store Price</p>
                <span class="text-4xl font-bold text-on-surface">$${product.price ? product.price.toFixed(2) : '39.99'}</span>
              </div>
              <a href="${product.affiliateUrl}" target="_blank" class="shimmer-btn flex-grow sm:flex-grow-0 w-full sm:w-auto px-12 py-5 rounded-2xl bg-[#FF9900] text-[#111] font-black uppercase tracking-widest text-xs shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3">
                <span class="material-symbols-outlined">shopping_cart</span>
                Buy on Amazon
              </a>
            </div>
            
            <!-- Reviews Segment -->
            <div class="border-t border-outline-variant/10 pt-10">
              <div class="flex items-center justify-between mb-8">
                <h3 class="text-2xl font-headline italic">Recent <i>Insights</i></h3>
                <span class="text-xs font-bold uppercase tracking-widest opacity-40">${reviews.length} Reviews</span>
              </div>
              
              <div class="space-y-6">
                ${reviews.length > 0 ? reviews.map(r => `
                  <div class="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-primary/20 transition-all group/rev">
                    <div class="flex justify-between items-center mb-4">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-black text-primary">${r.userName.charAt(0)}</div>
                        <span class="text-xs font-black uppercase tracking-wider text-on-surface">${r.userName}</span>
                        ${r.isVerified ? `<span class="material-symbols-outlined text-[14px] text-primary" style="font-variation-settings: 'FILL' 1">verified</span>` : ''}
                      </div>
                      <div class="flex text-primary opacity-60">
                        ${Array(r.rating).fill('<span class="material-symbols-outlined text-[10px] fill-primary">star</span>').join('')}
                      </div>
                    </div>
                    <p class="text-sm font-body italic text-on-surface-variant opacity-80 leading-relaxed group-hover/rev:opacity-100 transition-opacity">"${r.comment}"</p>
                  </div>
                `).join('') : `<p class="text-center opacity-30 italic py-10">No insights shared yet.</p>`}
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';

      const close = () => { overlay.remove(); document.body.style.overflow = 'auto'; };
      overlay.querySelector('#close-quickview').onclick = close;
      overlay.onclick = (e) => { if (e.target === overlay) close(); };

    } catch (err) {
      console.error('Quick View Error:', err);
    }
  }
  async openReviewModal(productId, productName) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4';
    overlay.innerHTML = `
      <div class="bg-surface w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        <button class="absolute top-6 right-6 text-on-surface/40 hover:text-on-surface" id="close-modal">
          <span class="material-symbols-outlined text-3xl">close</span>
        </button>
        
        <div class="p-10 overflow-y-auto">
          <h2 class="text-3xl font-headline italic mb-2">Reviews for <i>${productName}</i></h2>
          <p class="text-on-surface-variant opacity-60 text-sm mb-8">Hear what our global community is saying.</p>
          
          <div id="reviews-list" class="space-y-6 mb-12">
            <div class="py-10 text-center opacity-40 italic">Loading insights...</div>
          </div>
          
          <div class="border-t border-outline-variant/10 pt-10">
            <h3 class="text-xl font-headline italic mb-6">Write a <i>Review</i></h3>
            <form id="review-form" class="space-y-4">
              <input type="hidden" name="productId" value="${productId}">
              <div class="grid grid-cols-2 gap-4">
                <input type="text" name="userName" placeholder="Your Name" required class="w-full bg-white/50 border border-outline-variant/20 rounded-2xl px-6 py-4 outline-none focus:border-primary">
                <select name="rating" required class="w-full bg-white/50 border border-outline-variant/20 rounded-2xl px-6 py-4 outline-none focus:border-primary">
                  <option value="5">Excellent (5 Stars)</option>
                  <option value="4">Great (4 Stars)</option>
                  <option value="3">Good (3 Stars)</option>
                  <option value="2">Fair (2 Stars)</option>
                  <option value="1">Poor (1 Star)</option>
                </select>
              </div>
              <textarea name="comment" placeholder="Share your experience with this product..." required rows="4" class="w-full bg-white/50 border border-outline-variant/20 rounded-2xl px-6 py-4 outline-none focus:border-primary"></textarea>
              <button type="submit" class="w-full bg-primary text-white py-5 rounded-2xl font-bold uppercase tracking-widest hover:scale-[1.02] transition-all">Submit Review</button>
            </form>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const close = () => { overlay.remove(); document.body.style.overflow = 'auto'; };
    overlay.querySelector('#close-modal').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };

    // Fetch Reviews
    try {
      const res = await fetch(`/api/reviews/${productId}`);
      const reviews = await res.json();
      const listEl = overlay.querySelector('#reviews-list');
      
      if (reviews.length === 0) {
        listEl.innerHTML = `<div class="py-10 text-center opacity-30 italic">No reviews yet. Be the first to share your thoughts!</div>`;
      } else {
        listEl.innerHTML = reviews.map(r => `
          <div class="p-6 bg-white/40 rounded-3xl border border-white/60">
            <div class="flex justify-between items-center mb-3">
              <span class="font-bold text-primary">${r.userName}</span>
              <div class="flex text-orange-500 scale-75 transform-gpu">
                ${Array(parseInt(r.rating)).fill('<span class="material-symbols-outlined text-sm">star</span>').join('')}
              </div>
            </div>
            <p class="text-on-surface-variant italic leading-relaxed">"${r.comment}"</p>
            <p class="text-[10px] opacity-30 mt-3 uppercase tracking-widest">${new Date(r.createdAt).toLocaleDateString()}</p>
          </div>
        `).join('');
      }
    } catch (err) {
      console.error('Fetch reviews error:', err);
    }

    // Submit Review
    const form = overlay.querySelector('#review-form');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      
      try {
        const res = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (res.ok) {
          close();
          // Optional: Show success toast
          alert('Thank you for your review! It has been recorded.');
        } else {
          alert('Failed to submit review. Please try again.');
        }
      } catch (err) {
        alert('Network error. Please check your connection.');
      }
    };
  }

}

document.addEventListener('DOMContentLoaded', () => {
  new MRTApp();
});
