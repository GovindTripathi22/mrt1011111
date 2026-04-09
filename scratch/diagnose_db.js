import prisma from './server/db.js';

async function diagnose() {
  console.log('--- MRT DIAGNOSTICS ---');
  try {
    const tCount = await prisma.testimonial.count();
    console.log(`[OK] Testimonials: ${tCount}`);
    
    const uCount = await prisma.user.count();
    console.log(`[OK] Users: ${uCount}`);
    
    const firstUser = await prisma.user.findFirst();
    console.log(`[OK] Admin User: ${firstUser ? firstUser.email : 'MISSING'}`);
    
  } catch (err) {
    console.error(`[ERROR] DB Check Failed: ${err.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
