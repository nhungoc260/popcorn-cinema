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

// Seat Model
const SeatSchema = new Schema({
  room:     { type: Schema.Types.ObjectId, ref: 'Room', required: true },
  row:      { type: String, required: true },
  col:      { type: Number, required: true },
  label:    { type: String, required: true },
  type:     { type: String, enum: ['standard', 'vip', 'couple', 'disabled'], default: 'standard' },
  price:    { type: Number, default: 80000 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Seat = mongoose.model('Seat', SeatSchema);

// Showtime Model
const ShowtimeSchema = new Schema({
  movie:       { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
  room:        { type: Schema.Types.ObjectId, ref: 'Room', required: true },
  theater:     { type: Schema.Types.ObjectId, ref: 'Theater', required: true },
  startTime:   { type: Date, required: true },
  endTime:     { type: Date, required: true },
  language:    { type: String, enum: ['sub', 'dub', 'original'], default: 'sub' },
  format:      { type: String, enum: ['2D', '3D', 'IMAX', '4DX'], default: '2D' },
  basePrice:   { type: Number, default: 80000 },
  priceStandard: { type: Number, default: 80000 },
  priceVip:    { type: Number, default: 120000 },
  bookedSeats: [{ type: Schema.Types.ObjectId }],
  lockedSeats: [{ seatId: Schema.Types.ObjectId, userId: Schema.Types.ObjectId, lockedAt: Date }],
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

export const Showtime = mongoose.model('Showtime', ShowtimeSchema);
export const Room = mongoose.model('Room', RoomSchema);

// Booking Model
const BookingSchema = new Schema({
  user:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
  showtime:     { type: Schema.Types.ObjectId, ref: 'Showtime', required: true },
  seats:        [{ type: Schema.Types.ObjectId, ref: 'Seat' }],
  bookingCode:  { type: String, unique: true, required: true },
  totalAmount:  { type: Number, required: true },
  status:       { type: String, enum: ['pending', 'pending_payment', 'confirmed', 'cancelled'], default: 'pending' },
  paymentId:    { type: Schema.Types.ObjectId, ref: 'Payment' },
  createdAt:    { type: Date, default: Date.now },
  expiredAt:    { type: Date },
}, { timestamps: true });

export const Booking = mongoose.model('Booking', BookingSchema);

// Payment Model
const PaymentSchema = new Schema({
  booking:       { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
  user:          { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount:        { type: Number, required: true },
  method:        { type: String, enum: ['cash', 'vietqr', 'bank', 'momo'], required: true },
  transactionId: { type: String, unique: true, required: true },
  qrData:        { type: String },
  status:        { type: String, enum: ['pending', 'pending_confirmation', 'customer_confirmed', 'success', 'failed'], default: 'pending' },
  rejectReason:  { type: String },
  paidAt:        { type: Date },
}, { timestamps: true });

export const Payment = mongoose.model('Payment', PaymentSchema);
  startTime:   { type: Date, required: true },
  endTime:     { type: Date, required: true },
  language:    { type: String, enum: ['sub', 'dub', 'original'], default: 'sub' },
  format:      { type: String, enum: ['2D', '3D', 'IMAX', '4DX'], default: '2D' },
  basePrice:   { type: Number, default: 80000 },
  priceStandard: { type: Number, default: 80000 },
  priceVip:    { type: Number, default: 120000 },
  bookedSeats: [{ type: Schema.Types.ObjectId }],
  lockedSeats: [{ seatId: Schema.Types.ObjectId, userId: Schema.Types.ObjectId, lockedAt: Date }],
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

export const Showtime = mongoose.model('Showtime', ShowtimeSchema);
export const Room = mongoose.model('Room', RoomSchema);