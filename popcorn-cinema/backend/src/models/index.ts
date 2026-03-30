import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

// User Model
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'customer' | 'staff' | 'admin';
  avatar?: string;
  googleId?: string;
  isVerified: boolean;
  refreshTokens: string[];
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  name:          { type: String, required: true },
  email:         { type: String, required: true, unique: true, lowercase: true },
  password:      { type: String, required: true },
  phone:         { type: String, default: '' },
  role:          { type: String, enum: ['customer', 'staff', 'admin'], default: 'customer' },
  avatar:        { type: String },
  googleId:      { type: String },
  isVerified:    { type: Boolean, default: false },
  refreshTokens: [{ type: String }],
}, { timestamps: true });

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export const User = mongoose.model<IUser>('User', UserSchema);

// Movie Model
const MovieSchema = new Schema({
  title:       { type: String, required: true },
  titleEn:     { type: String },
  description: { type: String },
  poster:      { type: String },
  backdrop:    { type: String },
  trailer:     { type: String },
  duration:    { type: Number, required: true },
  genres:      [{ type: String }],
  rating:      { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  director:    { type: String },
  cast:        [{ name: String, role: String }],
  releaseDate: { type: Date },
  status:      { type: String, enum: ['coming_soon', 'now_showing', 'ended'], default: 'coming_soon' },
  ageRating:   { type: String, default: 'P' },
  language:    { type: String, default: 'Tiếng Việt' },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

export const Movie = mongoose.model('Movie', MovieSchema);

// Theater Model
const TheaterSchema = new Schema({
  name:          { type: String, required: true },
  address:       { type: String, required: true },
  city:          { type: String, required: true },
  phone:         { type: String },
  googleMapsUrl: { type: String },
  isActive:      { type: Boolean, default: true },
}, { timestamps: true });

export const Theater = mongoose.model('Theater', TheaterSchema);

// Room Model
const RoomSchema = new Schema({
  theater:    { type: Schema.Types.ObjectId, ref: 'Theater', required: true },
  name:       { type: String, required: true },
  type:       { type: String, enum: ['standard', 'vip', 'imax', '4dx'], default: 'standard' },
  rows:       { type: Number, default: 8 },
  cols:       { type: Number, default: 10 },
  totalSeats: { type: Number, default: 80 },
  seats:      [{ row: String, number: Number, type: String, isAisle: Boolean }],
  isActive:   { type: Boolean, default: true },
}, { timestamps: true });

export const Room = mongoose.model('Room', RoomSchema);