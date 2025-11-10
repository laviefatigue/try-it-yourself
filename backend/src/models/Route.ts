import mongoose, { Document, Schema } from 'mongoose';

export interface IWaypoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  order: number;
  arrived?: boolean;
  arrivalTime?: Date;
}

export interface IRoute extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  waypoints: IWaypoint[];
  active: boolean;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WaypointSchema = new Schema<IWaypoint>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  order: { type: Number, required: true },
  arrived: { type: Boolean, default: false },
  arrivalTime: { type: Date },
});

const RouteSchema = new Schema<IRoute>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    waypoints: [WaypointSchema],
    active: {
      type: Boolean,
      default: false,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
RouteSchema.index({ userId: 1, updatedAt: -1 });
RouteSchema.index({ userId: 1, active: 1 });
RouteSchema.index({ userId: 1, completed: 1 });
RouteSchema.index({ active: 1, completed: 1 });

export default mongoose.model<IRoute>('Route', RouteSchema);
