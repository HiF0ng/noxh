import { Router, Request, Response } from 'express';
import { getDb, saveDatabase, NewsItem } from '../config/db';
import { requireAdmin } from './auth';

const router = Router();

// GET /api/v1/news
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  res.json({ news: db.news });
});

// GET /api/v1/news/:id
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const item = db.news.find(n => n.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Không tìm thấy bài viết tin tức' });
  }
  res.json({ newsItem: item });
});

// POST /api/v1/news
router.post('/', requireAdmin, (req: Request, res: Response) => {
  const { title, summary, content, imageUrl, status } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Vui lòng nhập tiêu đề tin tức' });
  }

  const db = getDb();
  const newItem: NewsItem = {
    id: 'news-' + Date.now(),
    title: title.trim(),
    summary: summary || '',
    content: content || '',
    imageUrl: imageUrl || '',
    status: status === 'draft' ? 'draft' : 'published',
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  db.news.push(newItem);
  saveDatabase();
  res.status(201).json({ message: 'Tạo bài viết thành công', newsItem: newItem });
});

// PUT /api/v1/news/:id
router.put('/:id', requireAdmin, (req: Request, res: Response) => {
  const db = getDb();
  const idx = db.news.findIndex(n => n.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Không tìm thấy bài viết tin tức' });
  }

  db.news[idx] = {
    ...db.news[idx],
    ...req.body,
    id: db.news[idx].id
  };

  saveDatabase();
  res.json({ message: 'Cập nhật tin tức thành công', newsItem: db.news[idx] });
});

// DELETE /api/v1/news/:id
router.delete('/:id', requireAdmin, (req: Request, res: Response) => {
  const db = getDb();
  const idx = db.news.findIndex(n => n.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Không tìm thấy bài viết tin tức' });
  }

  const deleted = db.news.splice(idx, 1)[0];
  saveDatabase();
  res.json({ message: 'Đã xóa bài viết thành công', newsItem: deleted });
});

export default router;
