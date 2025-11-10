import mongoose, { Document, Schema } from 'mongoose';

export interface IWeatherHistory extends Document {
  userId: mongoose.Types.ObjectId;
  routeId?: mongoose.Types.ObjectId;
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
  };
  forecast: {
    windSpeed: number;
    windDirection: number;
    gustSpeed: number;
    waveHeight: number;
  };
  actualConditions?: {
    windSpeed: number;
    windDirection: number;
    boatSpeed: number;
    heading: number;
  };
  createdAt: Date;
}

const WeatherHistorySchema = new Schema<IWeatherHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    routeId: {
      type: Schema.Types.ObjectId,
      ref: 'Route',
    },
    timestamp: {
      type: Date,
      required: true,
    },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    forecast: {
      windSpeed: { type: Number, required: true },
      windDirection: { type: Number, required: true },
      gustSpeed: { type: Number, required: true },
      waveHeight: { type: Number, required: true },
    },
    actualConditions: {
      windSpeed: { type: Number },
      windDirection: { type: Number },
      boatSpeed: { type: Number },
      heading: { type: Number },
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
WeatherHistorySchema.index({ userId: 1, timestamp: -1 });
WeatherHistorySchema.index({ routeId: 1, timestamp: -1 });

export default mongoose.model<IWeatherHistory>('WeatherHistory', WeatherHistorySchema);
