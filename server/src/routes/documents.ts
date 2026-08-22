import { Router, Request, Response } from 'express';
import { getDb, saveDatabase, Document as DocItem } from '../config/db';
import { requireAdmin } from './auth';

const router = Router();

// GET /api/v1/documents
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  res.json({ documents: db.documents });
});

// POST /api/v1/documents
router.post('/', requireAdmin, (req: Request, res: Response) => {
  const { title, category, docType, fileUrl, content } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Vui lòng nhập tên tài liệu' });
  }

  const db = getDb();
  const newDoc: DocItem = {
    id: 'doc-' + Date.now(),
    title: title.trim(),
    category: ['Đơn đăng ký', 'Xác nhận nhà ở', 'Đối tượng & Thu nhập'].includes(category) ? category : 'Đơn đăng ký',
    docType: docType === 'DOCX' ? 'DOCX' : 'PDF',
    fileUrl: fileUrl || '',
    content: content || '',
    createdAt: new Date().toISOString()
  };

  db.documents.push(newDoc);
  saveDatabase();
  res.status(201).json({ message: 'Lưu tài liệu thành công', document: newDoc });
});

// DELETE /api/v1/documents/:id
router.delete('/:id', requireAdmin, (req: Request, res: Response) => {
  const db = getDb();
  const idx = db.documents.findIndex(d => d.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Không tìm thấy tài liệu' });
  }

  const deleted = db.documents.splice(idx, 1)[0];
  saveDatabase();
  res.json({ message: 'Đã xóa tài liệu thành công', document: deleted });
});

export default router;
