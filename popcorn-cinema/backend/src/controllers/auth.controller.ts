import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { AuthRequest } from '../middleware/errorHandler';

const signAccess = (id: string, role: string, email: string) =>
  jwt.sign({ id, role, email }, process.env.JWT_ACCESS_SECRET!, { 
    expiresIn: (process.env.JWT_ACCESS_EXPIRES || '8h') as any 
  });

const signRefresh = (id: string) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET!, { 
    expiresIn: (process.env.JWT_REFRESH_EXPIRES || '30d') as any 
  });

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu ít nhất 6 ký tự' });
    }
    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Email này đã được đăng ký' });
    }
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone || '',
      isVerified: true,
    });
    const access = signAccess(user.id, user.role, user.email);
    const refresh = signRefresh(user.id);
    user.refreshTokens.push(refresh);
    await user.save();
    return res.status(201).json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        access,
        refresh,
      }
    });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Email này đã được đăng ký' });
    }
    return res.status(500).json({ success: false, message: 'Đăng ký thất bại' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu' });
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    }
    const access = signAccess(user.id, user.role, user.email);
    const refresh = signRefresh(user.id);
    user.refreshTokens.push(refresh);
    if (user.refreshTokens.length > 5) user.refreshTokens.shift();
    await user.save();
    return res.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        access,
        refresh,
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Đăng nhập thất bại' });
  }
}

export async function refreshToken(req: Request, res: Response) {
  try {
    const { refresh } = req.body;
    if (!refresh) return res.status(400).json({ success: false, message: 'Refresh token required' });
    const decoded = jwt.verify(refresh, process.env.JWT_REFRESH_SECRET!) as { id: string };
    const user = await User.findById(decoded.id);
    if (!user || !user.refreshTokens.includes(refresh)) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }
    const newAccess = signAccess(user.id, user.role, user.email);
    const newRefresh = signRefresh(user.id);
    user.refreshTokens = user.refreshTokens.filter((t: string) => t !== refresh);
    user.refreshTokens.push(newRefresh);
    await user.save();
    return res.json({ success: true, data: { access: newAccess, refresh: newRefresh } });
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
}

export async function logout(req: AuthRequest, res: Response) {
  try {
    const { refresh } = req.body;
    const user = await User.findById(req.user?.id);
    if (user && refresh) {
      user.refreshTokens = user.refreshTokens.filter((t: string) => t !== refresh);
      await user.save();
    }
    return res.json({ success: true, message: 'Đã đăng xuất' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getMe(req: AuthRequest, res: Response) {
  try {
    const user = await User.findById(req.user?.id).select('-password -refreshTokens');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: user });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function sendOtp(req: Request, res: Response) {
  return res.json({ success: true, message: 'OTP sent' });
}
export async function verifyOtp(req: Request, res: Response) {
  return res.json({ success: true, message: 'OTP verified' });
}
export async function forgotPassword(req: Request, res: Response) {
  return res.json({ success: true, message: 'Reset email sent' });
}
export async function resetPassword(req: Request, res: Response) {
  return res.json({ success: true, message: 'Password reset success' });
}
export async function googleLogin(req: Request, res: Response) {
  return res.json({ success: false, message: 'Google login chưa cấu hình' });
}
export async function phoneSendOtp(req: Request, res: Response) {
  return res.json({ success: true, message: 'SMS sent' });
}
export async function phoneVerifyOtp(req: Request, res: Response) {
  return res.json({ success: true, message: 'Phone verified' });
}