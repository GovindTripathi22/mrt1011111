import sys

file_path = r'd:\Ecommerce\src\main.js'

new_content = r"""  async renderFeaturedSegments() {
    try {
      const [productsRes, themesRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/themes')
      ]);
      
      if (productsRes.ok && themesRes.ok) {
        const products = await productsRes.json();
        const themes = await themesRes.json();
        this.renderHomepagePicks(products, themes);
      }
    } catch (err) { 
      console.error('Featured segments sync failed:', err); 
    } finally { 
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh(); 
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

  renderHomepagePicks(products, themes = {}) {
     const sections = [
        { id: 'home-kitchen-carousel', category: 'home-kitchen' },
        { id: 'health-care-carousel', category: 'health-personal-care' },
        { id: 'beauty-skincare-carousel', category: 'beauty-skincare' },
        { id: 'pet-carousel', category: 'pet-supplies' },
        { id: 'baby-carousel', category: 'baby-products' },
        { id: 'electronics-carousel', category: 'electronics-accessories' },
        { id: 'sports-carousel', category: 'sports-fitness' }
     ];

     sections.forEach(sec => {
       const el = document.getElementById(sec.id);
       if (!el) return;
       
       const list = products
         .filter(p => p.category === sec.category)
         .slice(0, 8);

       if (list.length > 0) {
         const theme = themes[sec.category] || { primary: '#914d00', secondary: '#ff8c00' };
         const primary = theme.primary || '#914d00';
         el.style.setProperty('--category-primary', primary);
         el.style.setProperty('--category-secondary', theme.secondary || '#ff8c00');
         
         const r = parseInt(primary.slice(1, 3), 16);
         const g = parseInt(primary.slice(3, 5), 16);
         const b = parseInt(primary.slice(5, 7), 16);
         el.style.setProperty('--category-primary-glow', `rgba(${r}, ${g}, ${b}, 0.15)`);

         el.innerHTML = list.map(p => this.createProductCard(p, { variant: 'homepage' })).join('');
       } else {
         el.innerHTML = `<div class="w-full py-20 text-center opacity-30 italic">No products currently listed in ${sec.category}</div>`;
       }
     });
     this.initCardInteractions();
   }
"""

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Replace lines 346 to 387 (1-indexed, inclusive)
# Zero-indexed: 345 to 387
start_idx = 345
end_idx = 387

# Adjust if lines changed slightly, find 'async renderFeaturedSegments()'
for i, line in enumerate(lines):
    if 'async renderFeaturedSegments()' in line:
        start_idx = i
        break

for i in range(start_idx, len(lines)):
    if 'renderTestimonials(testimonials)' in lines[i]:
        end_idx = i
        break

new_lines = lines[:start_idx] + [new_content + '\n'] + lines[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Successfully updated main.js logic.")
