import { User } from "@shared/schema";

export type CalendarView = "week" | "day";

export type TimeSlot = {
  id: string;
  start: Date;
  end: Date;
  isAvailable: boolean;
  userId: number;
  sharedWith?: number[]; // Array of peer user IDs
};

export type EventType = "study" | "review" | "meeting";

export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  type: EventType;
  start: Date;
  end: Date;
  userId: number;
  isShared: boolean;
  sharedWith?: number[]; // Array of peer user IDs
  color?: string;
};

export type SyncRequest = {
  id: string;
  fromUserId: number;
  toUserId: number;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
};

export type CalendarState = {
  events: CalendarEvent[];
  timeSlots: TimeSlot[];
  syncRequests: SyncRequest[];
  syncedPeers: User[];
  view: CalendarView;
  selectedDate: Date;
  history: Array<{
    id: string;
    action: "create" | "update" | "delete";
    entityType: "event" | "timeSlot" | "sync";
    timestamp: Date;
    description: string;
  }>;
};
