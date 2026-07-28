import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(__dirname, '../../database.json');

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  location: string;
  investor: string;
  progress: number;
  status: string;
  detailsJson?: any;
  createdAt: string;
}

export interface Document {
  id: string;
  title: string;
  category: 'Đơn mua' | 'Đơn thuê';
  docType: 'PDF' | 'DOCX';
  fileUrl: string;
  content: string;
  createdAt: string;
}

export interface FaqItem {
  id: string;
  category: 'doi-tuong' | 'dieu-kien' | 'vay-von' | 'quyen-so-huu';
  q: string;
  a: string;
  sortOrder: number;
  createdAt: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  imageUrl: string;
  status: 'published' | 'draft';
  publishedAt: string;
  createdAt: string;
}

export interface DatabaseSchema {
  users: User[];
  projects: Project[];
  documents: Document[];
  faqs: FaqItem[];
  news: NewsItem[];
}

let dbData: DatabaseSchema = {
  users: [],
  projects: [],
  documents: [],
  faqs: [],
  news: []
};

export function loadDatabase(): DatabaseSchema {
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      dbData = JSON.parse(raw);
      return dbData;
    } catch (e) {
      console.error('Failed to parse database.json, re-initializing...', e);
    }
  }

  // Seed Initial Data
  const defaultAdminPasswordHash = '$2a$10$WpQ8xK9Z8g8e9f0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9'; // admin123
  dbData = {
    users: [
      {
        id: 'user-admin-1',
        email: 'admin@noxh.help',
        passwordHash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: admin
        fullName: 'Nguyễn Văn A (Admin)',
        role: 'admin',
        createdAt: new Date().toISOString()
      }
    ],
    projects: [
      {
        id: 'prj-1',
        title: 'NHS Trung Văn',
        location: 'Nam Từ Liêm, Hà Nội',
        investor: 'Công ty Cổ phần Đầu tư Xây dựng NHS',
        progress: 85,
        status: 'Đang mở bán',
        createdAt: new Date().toISOString()
      },
      {
        id: 'prj-2',
        title: 'Udic Ecotrans',
        location: 'Hoàng Mai, Hà Nội',
        investor: 'Tổng Công ty Đầu tư Phát triển Hạ tầng UDIC',
        progress: 60,
        status: 'Đang xây dựng',
        createdAt: new Date().toISOString()
      },
      {
        id: 'prj-3',
        title: 'Rice City Tố Hữu',
        location: 'Hà Đông, Hà Nội',
        investor: 'Công ty Cổ phần BIC Việt Nam',
        progress: 100,
        status: 'Bàn giao',
        createdAt: new Date().toISOString()
      }
    ],
    documents: [
      {
        id: 'doc-1',
        title: 'Mẫu đơn đăng ký mua Nhà ở xã hội (Mẫu số 01)',
        category: 'Đơn mua',
        docType: 'PDF',
        fileUrl: '/uploads/mau-01-dang-ky-mua-noxh.pdf',
        content: 'Mẫu đơn đăng ký mua nhà ở xã hội chuẩn ban hành kèm theo Thông tư mới nhất của Bộ Xây dựng.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'doc-2',
        title: 'Mẫu giấy xác nhận đối tượng và điều kiện nhà ở (Mẫu số 03)',
        category: 'Đơn mua',
        docType: 'DOCX',
        fileUrl: '/uploads/mau-03-xac-nhan-dieu-kien.docx',
        content: 'Giấy xác nhận thực trạng nhà ở dùng cho người thu nhập thấp đăng ký mua nhà ở xã hội.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'doc-3',
        title: 'Mẫu đơn đăng ký thuê Nhà ở xã hội (Mẫu số 02)',
        category: 'Đơn thuê',
        docType: 'PDF',
        fileUrl: '/uploads/mau-02-dang-ky-thue-noxh.pdf',
        content: 'Mẫu đơn chuẩn dành cho đối tượng có nhu cầu thuê nhà ở xã hội do Nhà nước hoặc chủ đầu tư phát triển.',
        createdAt: new Date().toISOString()
      }
    ],
    faqs: [],
    news: [
      {
        id: 'news-1',
        title: 'Lãi suất cho vay ưu đãi mua Nhà ở xã hội mới nhất năm 2026',
        summary: 'Ngân hàng Chính sách xã hội công bố điều chỉnh mức lãi suất cho vay ưu đãi mua NOXH áp dụng toàn quốc.',
        content: 'Mức lãi suất cho vay ưu đãi tại Ngân hàng Chính sách xã hội để mua, thuê mua nhà ở xã hội tiếp tục được duy trì ở mức ổn định nhằm hỗ trợ đối tượng thụ hưởng tiếp cận nhà ở dễ dàng...',
        imageUrl: '/img/news-1.jpg',
        status: 'published',
        publishedAt: '2026-07-01T08:00:00.000Z',
        createdAt: new Date().toISOString()
      }
    ]
  };

  // Seed FAQs from data.json if available
  const dataJsonPath = path.join(__dirname, '../../../data.json');
  if (fs.existsSync(dataJsonPath)) {
    try {
      const rawData = JSON.parse(fs.readFileSync(dataJsonPath, 'utf-8'));
      if (rawData.categories && Array.isArray(rawData.categories)) {
        let order = 0;
        rawData.categories.forEach((cat: any) => {
          const catId = cat.id as any;
          if (Array.isArray(cat.qas)) {
            cat.qas.forEach((qa: any) => {
              order++;
              dbData.faqs.push({
                id: 'faq-' + order,
                category: catId,
                q: qa.q,
                a: qa.a,
                sortOrder: order,
                createdAt: new Date().toISOString()
              });
            });
          }
        });
      }
    } catch (err) {
      console.error('Error seeding FAQs from data.json:', err);
    }
  }

  saveDatabase();
  return dbData;
}

export function saveDatabase(): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save database.json:', e);
  }
}

export function getDb(): DatabaseSchema {
  if (dbData.users.length === 0) {
    return loadDatabase();
  }
  return dbData;
}
