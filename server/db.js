import { PrismaClient } from '@prisma/client';
import path from 'path';
import 'dotenv/config';

// Robust Absolute Pathing for SQLite (Fixed local restoration)
const dbPath = path.resolve(process.cwd(), 'prisma/dev.db');

const prisma = new PrismaClient();

export default prisma;
