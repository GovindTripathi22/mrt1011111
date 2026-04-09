# 🚀 MRT International - Quick Deployment Guide

## ⚡ 5-Minute Deployment Overview

### Prerequisites
- ✅ Hostinger Business Plan active
- ✅ Domain configured
- ✅ SSH access enabled

---

## 📋 Step-by-Step Deployment

### 1️⃣ Create Database (2 minutes)

**In Hostinger hPanel:**
1. Go to **Databases** → **MySQL Databases**
2. Click **Create New Database**
3. Database name: `u123456789_mrt`
4. Create user with strong password
5. Grant ALL PRIVILEGES
6. **Save credentials!**

---

### 2️⃣ Import Database Schema (1 minute)

**Via phpMyAdmin:**
1. Go to **Databases** → **phpMyAdmin**
2. Select your database
3. Click **Import**
4. Upload: `deployment/mysql-schema.sql`
5. Click **Go**

**Or via SSH:**
```bash
mysql -u your_db_user -p your_db_name < deployment/mysql-schema.sql
```

---

### 3️⃣ Upload Project Files (3 minutes)

**Option A: Git (Recommended)**
```bash
ssh u123456789@your-domain.com
cd domains/your-domain.com/public_html
git clone https://github.com/yourusername/your-repo.git .
```

**Option B: File Manager**
- Upload via hPanel → Files → File Manager
- Upload these folders: `server/`, `dist/`, `prisma/`, `node_modules/`
- Upload these files: `package.json`, `ecosystem.config.js`

---

### 4️⃣ Configure Environment (2 minutes)

```bash
# SSH into server
ssh u123456789@your-domain.com
cd domains/your-domain.com/public_html

# Create .env file
nano .env
```

**Paste this (update YOUR values):**
```env
DATABASE_URL="mysql://YOUR_DB_USER:YOUR_DB_PASSWORD@localhost:3306/YOUR_DB_NAME"
JWT_SECRET="YOUR_RANDOM_32_CHAR_STRING"
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="YOUR_SECURE_PASSWORD"
NODE_ENV="production"
PORT=3001
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Save:** Press `CTRL+X`, then `Y`, then `ENTER`

---

### 5️⃣ Update Prisma for MySQL (1 minute)

```bash
nano prisma/schema.prisma
```

**Change datasource to:**
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

**Save:** `CTRL+X`, `Y`, `ENTER`

---

### 6️⃣ Install & Start (3 minutes)

```bash
# Install dependencies
npm install --production

# Generate Prisma client for MySQL
npx prisma generate

# Install PM2 globally (if not installed)
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on reboot
pm2 startup
# Run the command it outputs
```

---

### 7️⃣ Configure Web Server (2 minutes)

**For Nginx (most common on Hostinger):**

Create/edit: `/etc/nginx/sites-available/your-domain.com`

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    root /home/u123456789/domains/your-domain.com/public_html/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /admin {
        try_files $uri $uri/ /admin/index.html;
    }
}
```

**Enable and reload:**
```bash
sudo ln -s /etc/nginx/sites-available/your-domain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### 8️⃣ Enable SSL (1 minute)

**In Hostinger hPanel:**
1. Go to **SSL**
2. Enable **Free SSL** for your domain
3. Wait 5-10 minutes for activation

---

### 9️⃣ Test Deployment (1 minute)

```bash
# Test health endpoint
curl https://your-domain.com/health

# Test API
curl https://your-domain.com/api/categories

# Check PM2 status
pm2 status

# View logs
pm2 logs mrt-international
```

---

### 🔟 Import Sample Data (Optional - 1 minute)

```bash
mysql -u your_db_user -p your_db_name < deployment/seed-categories-products.sql
```

This adds:
- 7 categories (Home & Kitchen, Beauty, Health, etc.)
- 30 products with affiliate links
- Category themes with SEO content

---

## ✅ Verification Checklist

Test these URLs:

- [ ] `https://your-domain.com` - Homepage loads
- [ ] `https://your-domain.com/admin` - Admin panel accessible
- [ ] `https://your-domain.com/health` - Returns `{"status":"OK"}`
- [ ] `https://your-domain.com/api/categories` - Returns JSON
- [ ] `https://your-domain.com/api/products` - Returns JSON

---

## 🎯 Quick Commands Reference

### PM2 Management
```bash
pm2 status                    # Check status
pm2 logs mrt-international    # View logs
pm2 restart mrt-international # Restart
pm2 stop mrt-international    # Stop
pm2 monit                     # Monitor
```

### Database Backup
```bash
mysqldump -u user -p database > backup_$(date +%Y%m%d).sql
```

### Update Deployment
```bash
cd domains/your-domain.com/public_html
git pull origin main
npm install --production
npm run build
npx prisma generate
pm2 restart mrt-international
```

---

## 🆘 Common Issues

### Issue: Server won't start
```bash
pm2 logs mrt-international --lines 50
# Check .env file and database connection
```

### Issue: Database connection fails
```bash
# Test connection
mysql -u your_user -p your_database

# Verify DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

### Issue: 502 Bad Gateway
```bash
# Check if app is running
pm2 status

# Restart Nginx
sudo systemctl restart nginx
```

### Issue: Admin panel 404
```bash
# Verify admin files exist
ls -la dist/admin/

# Check Nginx configuration for /admin route
```

---

## 📊 Default Credentials

**Admin Panel:**
- Email: Value from `.env` → `ADMIN_EMAIL`
- Password: Value from `.env` → `ADMIN_PASSWORD`

**Database:**
- Default admin user created by schema
- Email: `admin@mrt.com`
- Password: `admin123` (change immediately!)

---

## 🎉 Success!

Your MRT International platform is now live!

**Access Points:**
- 🌐 Frontend: `https://your-domain.com`
- 🔐 Admin: `https://your-domain.com/admin`
- 💚 Health: `https://your-domain.com/health`

**Next Steps:**
1. Login to admin panel
2. Change default admin password
3. Add/edit categories
4. Add/edit products with affiliate links
5. Customize category themes
6. Test all functionality

---

## 📚 Detailed Documentation

For complete instructions, see:
- `deployment/HOSTINGER-DEPLOYMENT-GUIDE.md` - Full deployment guide
- `deployment/README.md` - Deployment package overview
- `deployment/mysql-schema.sql` - Database schema
- `deployment/seed-categories-products.sql` - Sample data

---

## 🔗 Useful Links

- **Hostinger Support**: https://www.hostinger.com/support
- **PM2 Documentation**: https://pm2.keymetrics.io/docs/
- **Prisma Documentation**: https://www.prisma.io/docs/
- **Express.js**: https://expressjs.com/

---

**Total Deployment Time: ~15-20 minutes**

Good luck with your deployment! 🚀
