import { Router, Request, Response } from 'express';
import { getDb, saveDatabase, Project } from '../config/db';
import { requireAdmin } from './auth';

const router = Router();

// GET /api/v1/projects
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  res.json({ projects: db.projects });
});

// GET /api/v1/projects/:id
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const project = db.projects.find(p => p.id === req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Không tìm thấy dự án' });
  }
  res.json({ project });
});

// POST /api/v1/projects
router.post('/', requireAdmin, (req: Request, res: Response) => {
  const { title, location, investor, progress, status, detailsJson } = req.body;
  if (!title || !location) {
    return res.status(400).json({ error: 'Vui lòng nhập tên dự án và vị trí' });
  }

  const db = getDb();
  const newProject: Project = {
    id: 'prj-' + Date.now(),
    title: title.trim(),
    location: location.trim(),
    investor: (investor || '').trim(),
    progress: Number(progress) || 0,
    status: status || 'Đang cập nhật',
    detailsJson: detailsJson || {},
    createdAt: new Date().toISOString()
  };

  db.projects.push(newProject);
  saveDatabase();
  res.status(201).json({ message: 'Tạo dự án thành công', project: newProject });
});

// PUT /api/v1/projects/:id
router.put('/:id', requireAdmin, (req: Request, res: Response) => {
  const db = getDb();
  const idx = db.projects.findIndex(p => p.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Không tìm thấy dự án để cập nhật' });
  }

  const current = db.projects[idx];
  db.projects[idx] = {
    ...current,
    ...req.body,
    id: current.id
  };

  saveDatabase();
  res.json({ message: 'Cập nhật dự án thành công', project: db.projects[idx] });
});

// DELETE /api/v1/projects/:id
router.delete('/:id', requireAdmin, (req: Request, res: Response) => {
  const db = getDb();
  const idx = db.projects.findIndex(p => p.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Không tìm thấy dự án' });
  }

  const deleted = db.projects.splice(idx, 1)[0];
  saveDatabase();
  res.json({ message: 'Đã xóa dự án thành công', project: deleted });
});

export default router;
