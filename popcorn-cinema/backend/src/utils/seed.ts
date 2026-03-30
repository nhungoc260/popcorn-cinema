import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

import { User, Movie, Theater, Room } from '../models';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/popcorn_cinema';

const MOVIES = [
  {
    title: 'Cú Nhảy Kỳ Diệu',
    titleEn: 'Hoppers',
    description: 'Mabel – cô gái yêu động vật vô tình tiếp cận công nghệ cho phép chuyển ý thức con người vào robot động vật. Dưới hình dạng một con hải ly, Mabel khám phá thế giới tự nhiên từ góc nhìn hoàn toàn mới.',
    poster: 'https://image.tmdb.org/t/p/w500/aLVkiINlIeCkcZIzb7XHzPYgO6L.jpg',
    duration: 105,
    genres: ['Hoạt Hình', 'Phiêu Lưu', 'Gia Đình'],
    rating: 8.5,
    director: 'Pixar Animation Studios',
    status: 'now_showing',
    ageRating: 'P',
    releaseDate: new Date('2026-03-13'),
  },
  {
    title: 'Quỷ Nhập Tràng 2',
    titleEn: 'Quy Nhap Trang 2',
    description: 'Tiếp nối phần đầu, bộ phim đưa khán giả trở lại với những hủ tục tâm linh bí ẩn và câu chuyện rùng rợn xoay quanh người chết tại các vùng quê hẻo lánh.',
    poster: 'https://image.tmdb.org/t/p/w500/b33nnKl1GSFbao4l3fZDDqsMx0F.jpg',
    duration: 126,
    genres: ['Kinh Dị', 'Tâm Linh'],
    rating: 7.5,
    director: 'Pom Nguyễn',
    status: 'now_showing',
    ageRating: 'C16',
    releaseDate: new Date('2026-03-13'),
  },
  {
    title: 'Tài',
    titleEn: 'Tai',
    description: 'Tài bất ngờ rơi vào vòng xoáy nguy hiểm vì một khoản nợ khổng lồ. Bị dồn vào đường cùng, anh phải đối mặt với câu hỏi lớn nhất: liệu lòng hiếu thảo có đủ để biện minh cho con đường đang đi.',
    poster: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
    duration: 100,
    genres: ['Hành Động', 'Gia Đình', 'Tâm Lý'],
    rating: 7.8,
    director: 'Mai Tài Phến',
    status: 'now_showing',
    ageRating: 'C16',
    releaseDate: new Date('2026-03-06'),
  },
  {
    title: 'Tiếng Thét 7',
    titleEn: 'Scream 7',
    description: 'Sidney Evans, nạn nhân sống sót của một vụ thảm sát, đang sống hạnh phúc thì tên sát nhân Ghostface mới lại xuất hiện và nhắm vào con gái cô.',
    poster: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    duration: 112,
    genres: ['Kinh Dị', 'Hồi Hộp'],
    rating: 7.2,
    director: 'Kevin Williamson',
    status: 'now_showing',
    ageRating: 'C18',
    releaseDate: new Date('2026-03-20'),
  },
  {
    title: 'Đếm Ngày Xa Mẹ',
    titleEn: 'When The Phone Rings',
    description: 'Ha Min bất ngờ sở hữu khả năng nhìn thấy những con số bí ẩn xuất hiện mỗi khi thưởng thức món ăn do mẹ nấu. Khi con số chạm mức 0, cũng là lúc mẹ phải rời xa cõi đời.',
    poster: 'https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg',
    duration: 118,
    genres: ['Tâm Lý', 'Tình Cảm', 'Gia Đình'],
    rating: 8.2,
    director: 'Kim Jung Sik',
    status: 'now_showing',
    ageRating: 'P',
    releaseDate: new Date('2026-03-13'),
  },
  {
    title: 'Tứ Hổ Đại Náo',
    titleEn: '4 Tigers',
    description: 'Trong Thế Chiến II, 9 tấn vàng của chính phủ Thái Lan đột ngột bị thất lạc. Bốn tên cướp khét tiếng với năng lực tà thuật riêng bị lôi kéo vào trò chơi tử thần.',
    poster: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    duration: 120,
    genres: ['Hành Động', 'Thần Thoại', 'Phiêu Lưu'],
    rating: 7.0,
    director: 'Wisit Sasanatieng',
    status: 'now_showing',
    ageRating: 'C16',
    releaseDate: new Date('2026-03-27'),
  },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('🌱 Connected. Seeding...');

  await Promise.all([
    User.deleteMany({}),
    Movie.deleteMany({}),
    Theater.deleteMany({}),
    Room.deleteMany({}),
  ]);
  console.log('🗑  Cleared existing data');

  // Users
  await User.create([
    { name: 'Admin', email: 'admin@popcorn.vn', password: 'admin123', role: 'admin', isVerified: true },
    { name: 'Staff', email: 'staff@popcorn.vn', password: 'staff123', role: 'staff', isVerified: true },
    { name: 'User', email: 'user@popcorn.vn', password: 'user123', role: 'customer', isVerified: true },
  ]);
  console.log('👥 Users created');

  // Movies
  await Movie.insertMany(MOVIES);
  console.log('🎬 6 movies created (tháng 3/2026)');

  // Theaters
  const theater1 = await Theater.create({
    name: 'Popcorn Cinema - Quận 1',
    address: '123 Nguyễn Huệ, Quận 1',
    city: 'Hồ Chí Minh',
    phone: '0765099748',
  });
  const theater2 = await Theater.create({
    name: 'Popcorn Cinema - Gò Vấp',
    address: '456 Quang Trung, Gò Vấp',
    city: 'Hồ Chí Minh',
    phone: '028-2345-6789',
  });
  const theater3 = await Theater.create({
    name: 'Popcorn Cinema - Hà Nội',
    address: '789 Hoàng Cầu, Đống Đa',
    city: 'Hà Nội',
    phone: '024-1234-5678',
  });
  console.log('🏛  3 Theaters created');

  // Rooms
  await Room.create([
    { theater: theater1._id, name: 'Phòng 01 - Standard', type: 'standard', rows: 8, cols: 10, totalSeats: 80 },
    { theater: theater1._id, name: 'Phòng 02 - VIP', type: 'vip', rows: 6, cols: 8, totalSeats: 48 },
    { theater: theater2._id, name: 'Phòng 01 - Standard', type: 'standard', rows: 8, cols: 10, totalSeats: 80 },
    { theater: theater3._id, name: 'Phòng 01 - Standard', type: 'standard', rows: 8, cols: 10, totalSeats: 80 },
  ]);
  console.log('🚪 Rooms created');

  console.log('\n✅ Seed complete!');
  console.log('──────────────────────────────────');
  console.log('👤 Admin: admin@popcorn.vn / admin123');
  console.log('👤 Staff: staff@popcorn.vn / staff123');
  console.log('👤 User:  user@popcorn.vn  / user123');

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });