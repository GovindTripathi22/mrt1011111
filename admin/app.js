const API = '/api';
let token = localStorage.getItem('mrt_admin_token');
let currentView = 'dashboard';

// === API Helper (ENHANCED: Surgical Cache-Busting) ===
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  let finalPath = path;
  
  // Only cache-bust highly dynamic routes (products, categories, stats, reviews)
  const needsCacheBust = path.includes('/products') || path.includes('/categories') || path.includes('/stats') || path.includes('/reviews');
  
  if ((!opts.method || opts.method === 'GET') && needsCacheBust) {
    finalPath += (path.includes('?') ? '&' : '?') + `_t=${Date.now()}`;
  }

  try {
    const res = await fetch(`${API}${finalPath}`, { ...opts, headers });
    if (res.status === 401) { logout(); return null; }
    const data = await res.json();
    if (!res.ok) {
      console.error(`API Error [${res.status}]:`, data);
      return data;
    }
    return data;
  } catch (err) {
    console.error(`API Fetch Error [${path}]:`, err);
    return { error: 'Network or parse error' };
  }
}

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="material-symbols-outlined">${type === 'success' ? 'check_circle' : 'error'}</span> ${msg}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// === Router ===
function navigate(view) {
  currentView = view;
  render();
}

function logout() {
  token = null;
  localStorage.removeItem('mrt_admin_token');
  render();
}

// === Main Render ===
function render() {
  const app = document.getElementById('app');
  if (!token) { renderLogin(app); return; }
  renderLayout(app);
}

// === Login (ENHANCED: Removed Hardcoded Test Credentials) ===
function renderLogin(app) {
  app.innerHTML = `
    <div class="login-container">
      <div class="login-card">
        <h1>MRT Admin</h1>
        <p>Sign in to manage your affiliate platform</p>
        <form id="login-form">
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="login-email" placeholder="admin@example.com" required>
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="login-password" placeholder="••••••••" required>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;padding:0.875rem;">
            <span class="material-symbols-outlined">login</span> Sign In
          </button>
        </form>
      </div>
    </div>
  `;
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      if (data?.token) {
        token = data.token;
        localStorage.setItem('mrt_admin_token', token);
        toast('Welcome back!');
        render();
      } else {
        toast(data?.error || 'Login failed', 'error');
      }
    } catch { toast('Connection error', 'error'); }
  });
}

// === Layout ===
function renderLayout(app) {
  if (app.querySelector('.admin-layout')) {
    updateSidebar();
    renderView();
    return;
  }

  app.innerHTML = `
    <div class="admin-layout">
      <button class="mobile-nav-toggle" id="mobile-nav-toggle">
         <span class="material-symbols-outlined">menu</span>
      </button>
      <aside class="sidebar" id="sidebar-container"></aside>
      <main class="main-content" id="main-content"></main>
    </div>
  `;
  updateSidebar();
  renderView();

  const toggle = document.getElementById('mobile-nav-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      document.getElementById('sidebar-container').classList.toggle('open');
    });
  }
}

function updateSidebar() {
  const container = document.getElementById('sidebar-container');
  if (!container) return;
  container.innerHTML = `
    <div class="sidebar-logo">
      <div class="logo-icon">M</div>
      <span>MRT Admin</span>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-section-title">Overview</div>
      <a class="nav-item ${currentView === 'dashboard' ? 'active' : ''}" data-view="dashboard">
        <span class="material-symbols-outlined">dashboard</span> Dashboard
      </a>
      <a class="nav-item ${currentView === 'analytics' ? 'active' : ''}" data-view="analytics">
        <span class="material-symbols-outlined">analytics</span> Analytics
      </a>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-section-title">Content</div>
      <a class="nav-item ${currentView === 'products' ? 'active' : ''}" data-view="products">
        <span class="material-symbols-outlined">inventory_2</span> Products
      </a>
      <a class="nav-item ${currentView === 'categories' ? 'active' : ''}" data-view="categories">
        <span class="material-symbols-outlined">category</span> Categories
      </a>
      <a class="nav-item ${currentView === 'reviews' ? 'active' : ''}" data-view="reviews">
        <span class="material-symbols-outlined">rate_review</span> Reviews
      </a>
      <a class="nav-item ${currentView === 'testimonials' ? 'active' : ''}" data-view="testimonials">
        <span class="material-symbols-outlined">reviews</span> Testimonials
      </a>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-section-title">Marketing</div>
      <a class="nav-item ${currentView === 'newsletter' ? 'active' : ''}" data-view="newsletter">
        <span class="material-symbols-outlined">mail</span> Newsletter
      </a>
    </div>
    <div class="sidebar-section" style="margin-top:auto;padding-top:1rem;border-top:1px solid var(--border);">
      <a class="nav-item" data-view="logout">
        <span class="material-symbols-outlined">logout</span> Sign Out
      </a>
      <a class="nav-item" href="/" target="_blank">
        <span class="material-symbols-outlined">open_in_new</span> View Site
      </a>
    </div>
  `;

  container.querySelectorAll('.nav-item[data-view]').forEach(el => {
    el.addEventListener('click', () => {
      const view = el.dataset.view;
      if (view === 'logout') { logout(); return; }
      navigate(view);
      container.classList.remove('open');
    });
  });
}

async function renderView() {
  const main = document.getElementById('main-content');
  if (!main) return;
  
  // Ensure we have containers for each view
  let viewContainer = document.getElementById(`view-${currentView}`);
  if (!viewContainer) {
    viewContainer = document.createElement('div');
    viewContainer.id = `view-${currentView}`;
    viewContainer.className = 'view-container';
    main.appendChild(viewContainer);
  }

  // Hide all other views
  document.querySelectorAll('.view-container').forEach(el => el.style.display = 'none');
  viewContainer.style.display = 'block';
  viewContainer.innerHTML = '<div class="text-center mt-2"><div class="loading-spinner"></div></div>';

  switch (currentView) {
    case 'dashboard': await renderDashboard(viewContainer); break;
    case 'products': await renderProducts(viewContainer); break;
    case 'categories': await renderCategories(viewContainer); break;
    case 'testimonials': await renderTestimonials(viewContainer); break;
    case 'analytics': await renderAnalytics(viewContainer); break;
    case 'reviews': await renderReviews(viewContainer); break;
    case 'newsletter': await renderNewsletter(viewContainer); break;
    default: await renderDashboard(viewContainer);
  }
}

// === Dashboard ===
async function renderDashboard(main) {
  const stats = await api('/admin/stats');
  if (!stats) return;

  main.innerHTML = `
    <div class="page-header">
      <div><h2>Dashboard</h2><div class="subtitle">Welcome to MRT International Admin</div></div>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon"><span class="material-symbols-outlined">inventory_2</span></div>
        <div class="stat-label">Total Products</div>
        <div class="stat-value">${stats.productCount || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><span class="material-symbols-outlined">category</span></div>
        <div class="stat-label">Categories</div>
        <div class="stat-value">${stats.categoryCount || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><span class="material-symbols-outlined">ads_click</span></div>
        <div class="stat-label">Affiliate Clicks</div>
        <div class="stat-value">${stats.clickCount || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><span class="material-symbols-outlined">mail</span></div>
        <div class="stat-label">Subscribers</div>
        <div class="stat-value">${stats.subscriberCount || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><span class="material-symbols-outlined">reviews</span></div>
        <div class="stat-label">Testimonials</div>
        <div class="stat-value">${stats.testimonialCount || 0}</div>
      </div>
    </div>
    <div class="table-container">
      <div class="table-header">
        <h3>Recent Activity</h3>
      </div>
      <table>
        <thead><tr><th>Product</th><th>Event</th><th>Time</th></tr></thead>
        <tbody>
          ${(stats.recentClicks || []).map(c => `
            <tr>
              <td class="flex gap-1" style="align-items:center">
                <img src="${c.product?.image || ''}" class="product-thumb" alt="">
                <span>${c.product?.name || 'Unknown'}</span>
              </td>
              <td><span class="badge badge-info">Affiliate Click</span></td>
              <td class="text-muted text-sm">${new Date(c.createdAt).toLocaleString()}</td>
            </tr>
          `).join('') || '<tr><td colspan="3" class="text-center text-muted" style="padding:2rem">No recent activity</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

// === Products ===
async function renderProducts(main) {
  const data = await api('/products');
  const cats = await api('/categories');
  if (!data) return;
  const products = data.products || [];

  main.innerHTML = `
    <div class="page-header">
      <div><h2>Products</h2><div class="subtitle">${data.total || 0} products total</div></div>
      <button class="btn btn-primary" id="btn-add-product"><span class="material-symbols-outlined">add</span> Add Product</button>
    </div>
    <div class="table-container">
      <table>
        <thead><tr><th></th><th>Name</th><th>Category</th><th>Price</th><th>Badge</th><th>Rating</th><th>Actions</th></tr></thead>
        <tbody>
          ${products.map(p => `
            <tr>
              <td><img src="${p.image || ''}" class="product-thumb" alt="${p.name}"></td>
              <td><strong>${p.name}</strong><br><span class="text-muted text-sm">${p.slug}</span></td>
              <td><span class="badge badge-info">${p.category?.name || p.categoryId}</span></td>
              <td>$${p.price}</td>
              <td><span class="badge badge-warning">${p.badge || '-'}</span></td>
              <td>${p.ratingValue || '-'}</td>
              <td>
                <button class="btn btn-sm btn-secondary btn-edit-product" data-id="${p.id}"><span class="material-symbols-outlined">edit</span></button>
                <button class="btn btn-sm btn-danger btn-delete-product" data-id="${p.id}"><span class="material-symbols-outlined">delete</span></button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('btn-add-product')?.addEventListener('click', () => showProductModal(null, cats));
  document.querySelectorAll('.btn-edit-product').forEach(b => b.addEventListener('click', () => {
    const p = products.find(x => String(x.id) === String(b.dataset.id));
    if (p) showProductModal(p, cats);
  }));
  document.querySelectorAll('.btn-delete-product').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Delete this product?')) return;
    await api(`/products/${b.dataset.id}`, { method: 'DELETE' });
    toast('Product deleted');
    renderView();
  }));
}

function showProductModal(product, categories) {
  const isEdit = !!product;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>${isEdit ? 'Edit Product' : 'Add Product'}</h3>
      <form id="product-form">
        <div class="grid-2">
          <div class="form-group">
            <label>Name</label>
            <input type="text" name="name" value="${product?.name || ''}" required>
          </div>
          <div class="form-group">
            <label>Price</label>
            <input type="number" name="price" value="${product?.price || ''}" step="0.01" required>
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label>Category</label>
            <select name="categoryId" required>
              ${(categories || []).map(c => `<option value="${c.id}" ${product?.categoryId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Badge</label>
            <select name="badge">
              <option value="">None</option>
              <option value="Top Pick" ${product?.badge === 'Top Pick' ? 'selected' : ''}>Top Pick</option>
              <option value="Trending Now" ${product?.badge === 'Trending Now' ? 'selected' : ''}>Trending Now</option>
              <option value="Editor's Choice" ${product?.badge === "Editor's Choice" ? 'selected' : ''}>Editor's Choice</option>
              <option value="Best Deal" ${product?.badge === 'Best Deal' ? 'selected' : ''}>Best Deal</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Short Benefit</label>
          <input type="text" name="shortBenefit" value="${product?.shortBenefit || ''}">
        </div>
        <div class="form-group">
          <label>Image & Media</label>
          <div class="flex gap-4 items-end">
            <div class="flex-1">
              <input type="text" name="image" id="product-image-path" value="${product?.image || ''}" placeholder="/assets/uploads/image.jpg">
            </div>
            <div id="product-dropzone" class="dropzone">
              <span class="material-symbols-outlined">upload_file</span>
              <span>Upload</span>
            </div>
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label>Affiliate URL</label>
            <input type="url" name="affiliateUrl" value="${product?.affiliateUrl || ''}">
          </div>
          <div class="form-group">
            <label>Affiliate Source</label>
            <input type="text" name="affiliateSource" value="${product?.affiliateSource || ''}" placeholder="amazon, walmart...">
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label>Rating Display</label>
            <input type="text" name="rating" value="${product?.rating || ''}" placeholder="4.8/5 Recommended">
          </div>
          <div class="form-group">
            <label>Rating Value</label>
            <input type="number" name="ratingValue" value="${product?.ratingValue || ''}" step="0.1" max="5">
          </div>
        </div>
        <div class="form-group">
          <label>Key Benefits (one per line)</label>
          <textarea name="keyBenefits">${(product?.keyBenefits || []).join('\n')}</textarea>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label>Meta Title (SEO)</label>
            <input type="text" name="metaTitle" value="${product?.metaTitle || ''}">
          </div>
          <div class="form-group">
            <label>Meta Description (SEO)</label>
            <input type="text" name="metaDescription" value="${product?.metaDescription || ''}">
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'} Product</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#modal-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  const dropzone = overlay.querySelector('#product-dropzone');
  const imgInput = overlay.querySelector('#product-image-path');
  initDragAndDrop(dropzone, (url) => {
      imgInput.value = url;
      toast('Image uploaded successfully');
  });

  overlay.querySelector('#product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    body.keyBenefits = body.keyBenefits.split('\n').filter(Boolean);
    body.price = parseFloat(body.price);
    body.ratingValue = parseFloat(body.ratingValue) || 0;

    if (isEdit) {
      const res = await api(`/products/${product.id}`, { method: 'PUT', body: JSON.stringify(body) });
      if (res?.error) { toast(res.error, 'error'); return; }
      toast('Product updated');
    } else {
      const res = await api('/products', { method: 'POST', body: JSON.stringify(body) });
      if (res?.error) { toast(res.error, 'error'); return; }
      toast('Product created');
    }
    overlay.remove();
    setTimeout(() => renderView(), 100); // Small delay to allow DB sync/refresh UI
  });
}

// === Categories ===
async function renderCategories(main) {
  const cats = await api('/categories');
  if (!cats) return;

  main.innerHTML = `
    <div class="page-header">
      <div><h2>Categories</h2><div class="subtitle">${cats.length} categories</div></div>
      <button class="btn btn-primary" id="btn-add-cat"><span class="material-symbols-outlined">add</span> Add Category</button>
    </div>
    <div class="table-container">
      <table>
        <thead><tr><th>Name</th><th>Slug</th><th>Products</th><th>Theme</th><th>Actions</th></tr></thead>
        <tbody>
          ${cats.map(c => `
            <tr>
              <td><strong>${c.name}</strong></td>
              <td class="text-muted">${c.slug}</td>
              <td><span class="badge badge-info">${c._count?.products || 0}</span></td>
              <td><span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:${c.theme?.primary || '#999'}"></span></td>
              <td>
                <button class="btn btn-sm btn-secondary btn-edit-cat" data-id="${c.id}"><span class="material-symbols-outlined">edit</span></button>
                <button class="btn btn-sm btn-danger btn-delete-cat" data-id="${c.id}"><span class="material-symbols-outlined">delete</span></button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('btn-add-cat')?.addEventListener('click', () => showCategoryModal(null));
  document.querySelectorAll('.btn-edit-cat').forEach(b => b.addEventListener('click', () => {
    const c = cats.find(x => String(x.id) === String(b.dataset.id));
    if (c) showCategoryModal(c);
  }));
  document.querySelectorAll('.btn-delete-cat').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Delete this category?')) return;
    await api(`/categories/${b.dataset.id}`, { method: 'DELETE' });
    toast('Category deleted');
    renderView();
  }));
}

function showCategoryModal(cat) {
  const isEdit = !!cat;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>${isEdit ? 'Edit Category' : 'Add Category'}</h3>
      <form id="cat-form">
        <div class="grid-2">
          <div class="form-group"><label>Name</label><input type="text" name="name" value="${cat?.name || ''}" required></div>
          <div class="form-group"><label>Slug</label><input type="text" name="slug" value="${cat?.slug || ''}"></div>
        </div>
        <div class="form-group">
          <label>Image & Media</label>
          <div class="flex gap-4 items-end">
            <div class="flex-1">
              <input type="text" name="image" id="cat-image-path" value="${cat?.image || ''}" placeholder="/assets/uploads/image.jpg">
            </div>
            <div id="cat-dropzone" class="dropzone">
              <span class="material-symbols-outlined">upload_file</span>
              <span>Upload</span>
            </div>
          </div>
        </div>
        <div class="form-group"><label>Description</label><textarea name="description">${cat?.description || ''}</textarea></div>
        <h4 style="margin:1rem 0 0.75rem;font-size:0.875rem;color:var(--accent)">Theme</h4>
        <div class="grid-2">
          <div class="form-group"><label>Primary Color</label><input type="text" name="primary" value="${cat?.theme?.primary || '#914d00'}"></div>
          <div class="form-group"><label>Secondary Color</label><input type="text" name="secondary" value="${cat?.theme?.secondary || '#f28c28'}"></div>
        </div>
        <div class="grid-2">
          <div class="form-group"><label>Theme Title</label><input type="text" name="title" value="${cat?.theme?.title || ''}"></div>
          <div class="form-group"><label>Subtitle</label><input type="text" name="subtitle" value="${cat?.theme?.subtitle || ''}"></div>
        </div>
        <h4 style="margin:1rem 0 0.75rem;font-size:0.875rem;color:var(--accent)">SEO</h4>
        <div class="form-group"><label>SEO Title</label><input type="text" name="seoTitle" value="${cat?.theme?.seoTitle || ''}"></div>
        <div class="form-group"><label>SEO Intro</label><textarea name="seoIntro">${cat?.theme?.seoIntro || ''}</textarea></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'}</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#modal-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  const dropzone = overlay.querySelector('#cat-dropzone');
  const imgInput = overlay.querySelector('#cat-image-path');
  initDragAndDrop(dropzone, (url) => {
      imgInput.value = url;
      toast('Category image uploaded');
  });

  overlay.querySelector('#cat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const d = Object.fromEntries(fd.entries());
    const body = {
      name: d.name, slug: d.slug, image: d.image, description: d.description,
      theme: { primary: d.primary, secondary: d.secondary, title: d.title || d.name, subtitle: d.subtitle, seoTitle: d.seoTitle, seoIntro: d.seoIntro },
    };
    if (isEdit) {
      await api(`/categories/${cat.id}`, { method: 'PUT', body: JSON.stringify(body) });
      toast('Category updated');
    } else {
      await api('/categories', { method: 'POST', body: JSON.stringify(body) });
      toast('Category created');
    }
    overlay.remove();
    renderView();
  });
}

// === Testimonials ===
async function renderTestimonials(main) {
  const items = await api('/testimonials');
  if (!items) return;

  main.innerHTML = `
    <div class="page-header">
      <div><h2>Testimonials</h2><div class="subtitle">${items.length} reviews</div></div>
      <button class="btn btn-primary" id="btn-add-test"><span class="material-symbols-outlined">add</span> Add</button>
    </div>
    <div class="table-container">
      <table>
        <thead><tr><th>Name</th><th>Location</th><th>Region</th><th>Text</th><th>Actions</th></tr></thead>
        <tbody>
          ${items.map(t => `
            <tr>
              <td><strong>${t.name}</strong></td>
              <td class="text-muted">${t.location}</td>
              <td><span class="badge badge-info">${t.region.toUpperCase()}</span></td>
              <td class="text-sm" style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.text}</td>
              <td><button class="btn btn-sm btn-danger btn-del-test" data-id="${t.id}"><span class="material-symbols-outlined">delete</span></button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.querySelectorAll('.btn-del-test').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Delete?')) return;
    await api(`/testimonials/${b.dataset.id}`, { method: 'DELETE' });
    toast('Deleted'); renderView();
  }));

  document.getElementById('btn-add-test')?.addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3>Add Testimonial</h3>
        <form id="test-form">
          <div class="grid-2">
            <div class="form-group"><label>Name</label><input type="text" name="name" required></div>
            <div class="form-group"><label>Location</label><input type="text" name="location" required></div>
          </div>
          <div class="grid-2">
            <div class="form-group"><label>Region</label><select name="region"><option value="us">US</option><option value="ae">UAE</option></select></div>
            <div class="form-group"><label>Quote Title</label><input type="text" name="quote"></div>
          </div>
          <div class="form-group"><label>Review Text</label><textarea name="text" required></textarea></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary">Create</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#modal-cancel').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#test-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.target).entries());
      await api('/testimonials', { method: 'POST', body: JSON.stringify(body) });
      toast('Created'); overlay.remove(); renderView();
    });
  });
}

// === Analytics ===
async function renderAnalytics(main) {
  const data = await api('/admin/analytics');
  const stats = await api('/admin/stats');
  if (!data || !stats) return;

  main.innerHTML = `
    <div class="page-header">
      <div><h2>Analytics</h2><div class="subtitle">Platform performance & engagement metrics</div></div>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon"><span class="material-symbols-outlined">ads_click</span></div>
        <div class="stat-label">Total Affiliate Clicks</div>
        <div class="stat-value">${stats.clickCount || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><span class="material-symbols-outlined">rate_review</span></div>
        <div class="stat-label">Product Reviews</div>
        <div class="stat-value">${stats.reviewCount || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><span class="material-symbols-outlined">mail</span></div>
        <div class="stat-label">Conversion Rate</div>
        <div class="stat-value">${((stats.clickCount / (stats.productCount || 1)) * 100).toFixed(1)}%</div>
      </div>
    </div>

    <div class="analytics-row flex gap-6 mt-8">
      <div class="stat-card flex-1">
        <h3 class="font-headline mb-6" style="font-size:1rem;opacity:0.6">Category Distribution</h3>
        <div class="chart-container" style="height:200px;display:flex;align-items:flex-end;gap:1.5rem;padding-bottom:1rem;border-bottom:1px solid var(--border)">
          ${(data.categoryDistribution || []).map(c => `
            <div class="chart-bar-group" style="flex:1;display:flex;flex-col;align-items:center;gap:0.5rem">
              <div class="chart-bar" style="width:100%;background:var(--primary);height:${(c._count / (stats.productCount || 1)) * 100}%;border-radius:4px 4px 0 0;min-height:4px;transition:height 1s ease"></div>
              <span class="text-[9px] uppercase tracking-tighter opacity-40 text-center truncate w-full">${c.categoryId}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="table-container mt-10">
      <div class="table-header"><h3>Click Stream (Recent)</h3></div>
      <table>
        <thead><tr><th>Product</th><th>Source</th><th>User Agent</th><th>Time</th></tr></thead>
        <tbody>
          ${(data.clicks || []).slice(0, 10).map(c => `
            <tr>
              <td><strong>${c.product?.name || 'Unknown'}</strong></td>
              <td><span class="badge badge-info">${c.source || 'Direct'}</span></td>
              <td class="text-xs opacity-50 truncate max-w-xs">${c.userAgent || '-'}</td>
              <td class="text-xs">${new Date(c.createdAt).toLocaleString()}</td>
            </tr>
          `).join('') || '<tr><td colspan="4" class="text-center text-muted" style="padding:2rem">No clicks recorded</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

// === Reviews ===
async function renderReviews(main) {
  const reviews = await api('/admin/reviews');
  if (!reviews) return;

  main.innerHTML = `
    <div class="page-header">
      <div><h2>Reviews</h2><div class="subtitle">${reviews.length} customer reviews total</div></div>
    </div>
    <div class="table-container">
      <table>
        <thead><tr><th>Product</th><th>User</th><th>Rating</th><th>Comment</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${reviews.map(r => `
            <tr>
              <td class="flex items-center gap-2">
                <img src="${r.product?.image || ''}" class="product-thumb" style="width:30px;height:30px">
                <span class="text-sm font-bold">${r.product?.name || 'Unknown'}</span>
              </td>
              <td><strong>${r.userName}</strong></td>
              <td><span class="badge badge-warning">${r.rating}/5</span></td>
              <td class="text-sm italic opacity-80 max-w-xs truncate" title="${r.comment}">"${r.comment}"</td>
              <td><span class="badge ${r.isVerified ? 'badge-success' : 'badge-info'}">${r.isVerified ? 'Verified' : 'Pending'}</span></td>
              <td>
                ${!r.isVerified ? `<button class="btn btn-sm btn-primary btn-verify-review" data-id="${r.id}"><span class="material-symbols-outlined">verified</span> Verify</button>` : ''}
                <button class="btn btn-sm btn-danger btn-delete-review" data-id="${r.id}"><span class="material-symbols-outlined">delete</span></button>
              </td>
            </tr>
          `).join('') || '<tr><td colspan="6" class="text-center text-muted" style="padding:2rem">No reviews to manage</td></tr>'}
        </tbody>
      </table>
    </div>
  `;

  document.querySelectorAll('.btn-verify-review').forEach(b => b.addEventListener('click', async () => {
    await api(`/admin/reviews/${b.dataset.id}/verify`, { method: 'POST' });
    toast('Review verified'); renderView();
  }));

  document.querySelectorAll('.btn-delete-review').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Delete this review?')) return;
    await api(`/reviews/${b.dataset.id}`, { method: 'DELETE' });
    toast('Review deleted'); renderView();
  }));
}

// === Support Functions ===
function initDragAndDrop(dropzone, onUpload) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(name => {
        dropzone.addEventListener(name, (e) => { e.preventDefault(); e.stopPropagation(); });
    });

    dropzone.addEventListener('dragover', () => dropzone.classList.add('drag-active'));
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-active'));
    dropzone.addEventListener('drop', async (e) => {
        dropzone.classList.remove('drag-active');
        const files = Array.from(e.dataTransfer.files);
        if (!files.length) return;
        
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        
        dropzone.innerHTML = '<div class="loading-spinner"></div>';
        
        try {
            const res = await fetch(`${API}/media/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (data && data[0]) onUpload(data[0].url);
            else toast('Upload failed', 'error');
        } catch (err) {
            toast('Upload error', 'error');
        } finally {
            dropzone.innerHTML = `<span class="material-symbols-outlined">upload_file</span><span>Upload Completed</span>`;
        }
    });

    dropzone.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('files', file);
            
            dropzone.innerHTML = '<div class="loading-spinner"></div>';
            try {
                const res = await fetch(`${API}/media/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                const data = await res.json();
                if (data && data[0]) onUpload(data[0].url);
            } catch (err) { toast('Upload error', 'error'); }
            finally { dropzone.innerHTML = `<span class="material-symbols-outlined">upload_file</span><span>Upload Completed</span>`; }
        };
        input.click();
    });
}

// Boot
render();
