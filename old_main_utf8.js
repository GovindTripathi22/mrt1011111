import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

class LuxeRadianceApp {
  constructor() {
    this.initLenis();
    this.initAnimations();
    this.fetchProducts();
    this.bindEvents();
  }

  // Initialize Smooth Scroll (Lenis)
  initLenis() {
    const lenis = new Lenis({
      duration: 1.5,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
  }

  // Orchestrate GSAP Animations
  initAnimations() {
    // Hero Reveal (Original Style with subtle slide)
    gsap.to('.hero-reveal', {
      opacity: 1,
      y: 0,
      duration: 1.8,
      ease: 'expo.out',
      delay: 0.3
    });

    // Staggered Section Reveals
    const revealUps = document.querySelectorAll('.reveal-up');
    revealUps.forEach((el) => {
      gsap.fromTo(el, 
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none none'
          }
        }
      );
    });

    // Subtle Parallax for Grid Images
    document.querySelectorAll('.group img').forEach(img => {
      gsap.to(img, {
        y: -10,
        ease: "none",
        scrollTrigger: {
          trigger: img,
          start: "top bottom",
          end: "bottom top",
          scrub: true
        }
      });
    });
  }

  // Fetch Products from Node.js API
  async fetchProducts() {
    const container = document.getElementById('product-container');
    if (!container) return;

    try {
      const response = await fetch('/api/products');
      const products = await response.json();

      container.innerHTML = products.map(product => `
        <div class="min-w-[300px] flex-none group snap-start cursor-pointer-card reveal-up">
            <div class="relative overflow-hidden rounded-3xl mb-6 bg-surface-container aspect-[4/5]">
                <img src="${product.image}" 
                     alt="${product.title}" 
                     class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000">
                <button class="absolute bottom-6 right-6 bg-white p-4 rounded-full shadow-xl opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-primary hover:text-white">
                    <span class="material-symbols-outlined">add_shopping_cart</span>
                </button>
            </div>
            <div class="space-y-1 px-2">
                <span class="text-[10px] tracking-widest text-on-surface-variant font-bold uppercase">${product.category}</span>
                <div class="flex justify-between items-start">
                    <h4 class="font-serif text-xl group-hover:text-primary transition-colors">${product.title}</h4>
                    <span class="font-bold text-on-surface">$${product.price.toFixed(2)}</span>
                </div>
            </div>
        </div>
      `).join('');

      // Refresh ScrollTrigger after dynamic content injection
      ScrollTrigger.refresh();
      
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  }

  bindEvents() {
    const cartBtn = document.getElementById('cart-btn');
    if (cartBtn) {
        cartBtn.addEventListener('click', () => {
            gsap.fromTo(cartBtn, { scale: 1 }, { scale: 0.8, duration: 0.1, yoyo: true, repeat: 1 });
        });
    }

    // Carousel Navigation Logic
    const container = document.getElementById('product-container');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    if (container && prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
            container.scrollBy({ left: -350, behavior: 'smooth' });
        });
        nextBtn.addEventListener('click', () => {
            container.scrollBy({ left: 350, behavior: 'smooth' });
        });
    }
  }
}

// Initialize the Boutique with the Original Design
document.addEventListener('DOMContentLoaded', () => {
  new LuxeRadianceApp();
});
