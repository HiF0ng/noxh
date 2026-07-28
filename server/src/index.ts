import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

import { loadDatabase } from './config/db';
import authRoutes from './routes/auth';
import uploadRoutes from './routes/upload';
import projectRoutes from './routes/projects';
import documentRoutes from './routes/documents';
import faqRoutes from './routes/faqs';
import newsRoutes from './routes/news';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Database & Seed Data
loadDatabase();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve Uploaded Files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health Check API
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    message: 'NOXH.HELP Backend API Server is running smoothly',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/faqs', faqRoutes);
app.use('/api/v1/news', newsRoutes);

// Start Express Server
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 NOXH.HELP Backend API Server running on port ${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/api/v1/health`);
  console.log(`=================================================`);
});
