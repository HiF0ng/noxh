import { Router, Request, Response, NextFunction } from 'express';
import { getDb, saveDatabase, User } from '../config/db';
import { hashPassword, comparePassword, generateToken, verifyToken, TokenPayload } from '../utils/auth';

const router = Router();

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

// Middleware: Require Auth
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Vui lòng đăng nhập' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized: Token không hợp lệ hoặc đã hết hạn' });
  }

  req.user = decoded;
  next();
}

// Middleware: Require Admin
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Bạn không có quyền truy cập tính năng này' });
    }
    next();
  });
}

// POST /api/v1/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin (email, password, fullName)' });
    }

    const db = getDb();
    const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'Email này đã được đăng ký tài khoản' });
    }

    const passwordHash = await hashPassword(password);
    const newUser: User = {
      id: 'user-' + Date.now(),
      email: email.toLowerCase().trim(),
      passwordHash,
      fullName: fullName.trim(),
      role: 'user',
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    saveDatabase();

    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role
    });

    res.status(201).json({
      message: 'Đăng ký tài khoản thành công',
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role
      },
      token
    });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi máy chủ khi đăng ký tài khoản' });
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập email và mật khẩu' });
    }

    const db = getDb();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role
    });

    res.json({
      message: 'Đăng nhập thành công',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      },
      token
    });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi máy chủ khi đăng nhập' });
  }
});

// GET /api/v1/auth/me
router.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

// POST /api/v1/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  res.json({ message: 'Đã đăng xuất thành công' });
});

export default router;
