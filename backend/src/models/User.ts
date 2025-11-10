import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  phoneNumber?: string;
  notificationPreferences: {
    push: boolean;
    sms: boolean;
    email: boolean;
  };
  weatherMonitoringConfig: {
    intervalHours: number;
    forecastDays: number;
    maxWindSpeed: number;
    maxWaveHeight: number;
    avoidStorms: boolean;
    ensureDaytimeArrival: boolean;
  };
  pushTokens: string[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
    },
    notificationPreferences: {
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      email: { type: Boolean, default: true },
    },
    weatherMonitoringConfig: {
      intervalHours: { type: Number, default: 6 },
      forecastDays: { type: Number, default: 3 },
      maxWindSpeed: { type: Number, default: 25 },
      maxWaveHeight: { type: Number, default: 3 },
      avoidStorms: { type: Boolean, default: true },
      ensureDaytimeArrival: { type: Boolean, default: true },
    },
    pushTokens: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ createdAt: -1 });

export default mongoose.model<IUser>('User', UserSchema);
