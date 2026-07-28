import { Router, Request, Response } from 'express';
import { getDb, saveDatabase, FaqItem } from '../config/db';
import { requireAdmin } from './auth';

const router = Router();

// GET /api/v1/faqs
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const category = req.query.category as string;
  let list = db.faqs;

  if (category) {
    list = list.filter(f => f.category === category);
  }

  res.json({ faqs: list });
});

// POST /api/v1/faqs
router.post('/', requireAdmin, (req: Request, res: Response) => {
  const { category, q, a } = req.body;
  if (!q || !a || !category) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ danh mục, câu hỏi và câu trả lời' });
  }

  const db = getDb();
  const newFaq: FaqItem = {
    id: 'faq-' + Date.now(),
    category,
    q: q.trim(),
    a: a.trim(),
    sortOrder: db.faqs.length + 1,
    createdAt: new Date().toISOString()
  };

  db.faqs.push(newFaq);
  saveDatabase();
  res.status(201).json({ message: 'Tạo FAQ mới thành công', faq: newFaq });
});

// PUT /api/v1/faqs/:id
router.put('/:id', requireAdmin, (req: Request, res: Response) => {
  const db = getDb();
  const idx = db.faqs.findIndex(f => f.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Không tìm thấy câu hỏi FAQ' });
  }

  const { q, a, category } = req.body;
  if (q) db.faqs[idx].q = q.trim();
  if (a) db.faqs[idx].a = a.trim();
  if (category) db.faqs[idx].category = category;

  saveDatabase();
  res.json({ message: 'Cập nhật FAQ thành công', faq: db.faqs[idx] });
});

// DELETE /api/v1/faqs/:id
router.delete('/:id', requireAdmin, (req: Request, res: Response) => {
  const db = getDb();
  const idx = db.faqs.findIndex(f => f.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Không tìm thấy câu hỏi FAQ' });
  }

  const deleted = db.faqs.splice(idx, 1)[0];
  saveDatabase();
  res.json({ message: 'Đã xóa FAQ thành công', faq: deleted });
});

// PUT /api/v1/faqs/reorder
router.put('/batch/reorder', requireAdmin, (req: Request, res: Response) => {
  const { category, faqIds } = req.body;
  if (!category || !Array.isArray(faqIds)) {
    return res.status(400).json({ error: 'Danh mục và danh sách ID là bắt buộc' });
  }

  const db = getDb();
  const categoryFaqs = db.faqs.filter(f => f.category === category);
  const otherFaqs = db.faqs.filter(f => f.category !== category);

  const reordered: FaqItem[] = [];
  faqIds.forEach((id: string, index: number) => {
    const item = categoryFaqs.find(f => f.id === id);
    if (item) {
      item.sortOrder = index + 1;
      reordered.push(item);
    }
  });

  // Append any missing category items
  categoryFaqs.forEach(f => {
    if (!reordered.find(r => r.id === f.id)) {
      reordered.push(f);
    }
  });

  db.faqs = [...otherFaqs, ...reordered];
  saveDatabase();
  res.json({ message: 'Đã cập nhật thứ tự FAQ thành công' });
});

export default router;
