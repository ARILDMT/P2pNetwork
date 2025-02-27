import { User, InsertUser, Assignment, InsertAssignment, Submission, InsertSubmission, Review, InsertReview } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Add these methods to the IStorage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPoints(userId: number, points: number): Promise<User>;
  updateUserXP(userId: number, xp: number): Promise<User>;

  // Assignment operations
  createAssignment(assignment: InsertAssignment & { authorId: number }): Promise<Assignment>;
  getAssignment(id: number): Promise<Assignment | undefined>;
  getAssignments(): Promise<Assignment[]>;
  getAssignmentsByCategory(category: string): Promise<Assignment[]>;
  getAssignmentsByDifficulty(difficulty: number): Promise<Assignment[]>;

  // Submission operations
  createSubmission(submission: InsertSubmission & { userId: number }): Promise<Submission>;
  getSubmission(id: number): Promise<Submission | undefined>;
  getSubmissionsByAssignment(assignmentId: number): Promise<Submission[]>;
  getSubmissionsByUser(userId: number): Promise<Submission[]>;
  updateSubmissionStatus(submissionId: number, status: string): Promise<Submission>;

  // Review operations
  createReview(review: InsertReview & { reviewerId: number }): Promise<Review>;
  getReview(id: number): Promise<Review | undefined>;
  getReviewsBySubmission(submissionId: number): Promise<Review[]>;
  getReviewsByReviewer(reviewerId: number): Promise<Review[]>;
  getPendingReviewsForUser(userId: number): Promise<Submission[]>;

  sessionStore: session.Store;

  // Calendar operations
  getCalendarEventsByUser(userId: number): Promise<CalendarEvent[]>;
  createCalendarEvent(event: InsertCalendarEvent & { userId: number }): Promise<CalendarEvent>;
  getCalendarEvent(id: number): Promise<CalendarEvent | undefined>;
  updateCalendarEvent(id: number, event: Partial<InsertCalendarEvent>): Promise<CalendarEvent>;
  deleteCalendarEvent(id: number): Promise<void>;

  // Time slots operations
  getTimeSlotsByUser(userId: number): Promise<TimeSlot[]>;
  createTimeSlot(slot: InsertTimeSlot & { userId: number }): Promise<TimeSlot>;
  updateTimeSlot(id: number, slot: Partial<InsertTimeSlot>): Promise<TimeSlot>;
  deleteTimeSlot(id: number): Promise<void>;

  // Calendar sync operations
  getCalendarSyncRequests(userId: number): Promise<CalendarSync[]>;
  createCalendarSync(sync: InsertCalendarSync & { fromUserId: number }): Promise<CalendarSync>;
  getCalendarSync(id: number): Promise<CalendarSync | undefined>;
  updateCalendarSync(id: number, sync: { status: string }): Promise<CalendarSync>;
  deleteCalendarSync(fromUserId: number, toUserId: number): Promise<void>;
  getSyncedPeers(userId: number): Promise<User[]>;
  searchUsers(query: string): Promise<User[]>;
}

//Assuming necessary types are defined elsewhere (CalendarEvent, InsertCalendarEvent etc.)
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private assignments: Map<number, Assignment>;
  private submissions: Map<number, Submission>;
  private reviews: Map<number, Review>;
  private currentId: number;
  sessionStore: session.Store;
  private calendarEvents: Map<number, CalendarEvent>;
  private timeSlots: Map<number, TimeSlot>;
  private calendarSyncs: Map<number, CalendarSync>;

  constructor() {
    this.users = new Map();
    this.assignments = new Map();
    this.submissions = new Map();
    this.reviews = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    this.calendarEvents = new Map();
    this.timeSlots = new Map();
    this.calendarSyncs = new Map();
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = {
      ...insertUser,
      id,
      bio: insertUser.bio || null,
      role: insertUser.role || "student",
      prpPoints: 0,
      skillLevel: 1,
      totalXp: 0,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserPoints(userId: number, points: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    user.prpPoints += points;
    this.users.set(userId, user);
    return user;
  }

  async updateUserXP(userId: number, xp: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    user.totalXp += xp;
    // Level up logic: every 1000 XP is a new level
    user.skillLevel = Math.floor(user.totalXp / 1000) + 1;
    this.users.set(userId, user);
    return user;
  }

  async createAssignment(insertAssignment: InsertAssignment & { authorId: number }): Promise<Assignment> {
    const id = this.currentId++;
    const assignment: Assignment = {
      ...insertAssignment,
      id,
      requiredReviews: 3,
      autoVerificationEnabled: true,
      createdAt: new Date(),
    };
    this.assignments.set(id, assignment);
    return assignment;
  }

  async getAssignment(id: number): Promise<Assignment | undefined> {
    return this.assignments.get(id);
  }

  async getAssignments(): Promise<Assignment[]> {
    return Array.from(this.assignments.values());
  }

  async getAssignmentsByCategory(category: string): Promise<Assignment[]> {
    return Array.from(this.assignments.values()).filter(
      (assignment) => assignment.category === category,
    );
  }

  async getAssignmentsByDifficulty(difficulty: number): Promise<Assignment[]> {
    return Array.from(this.assignments.values()).filter(
      (assignment) => assignment.difficulty === difficulty,
    );
  }

  async createSubmission(insertSubmission: InsertSubmission & { userId: number }): Promise<Submission> {
    const id = this.currentId++;
    const submission: Submission = {
      ...insertSubmission,
      id,
      status: "pending",
      reviewsReceived: 0,
      reviewsRequired: 3,
      autoVerificationStatus: null,
      submittedAt: new Date(),
    };
    this.submissions.set(id, submission);
    return submission;
  }

  async getSubmission(id: number): Promise<Submission | undefined> {
    return this.submissions.get(id);
  }

  async getSubmissionsByAssignment(assignmentId: number): Promise<Submission[]> {
    return Array.from(this.submissions.values()).filter(
      (submission) => submission.assignmentId === assignmentId,
    );
  }

  async getSubmissionsByUser(userId: number): Promise<Submission[]> {
    return Array.from(this.submissions.values()).filter(
      (submission) => submission.userId === userId,
    );
  }

  async updateSubmissionStatus(submissionId: number, status: string): Promise<Submission> {
    const submission = await this.getSubmission(submissionId);
    if (!submission) throw new Error("Submission not found");

    submission.status = status;
    this.submissions.set(submissionId, submission);
    return submission;
  }

  async createReview(insertReview: InsertReview & { reviewerId: number }): Promise<Review> {
    const id = this.currentId++;
    const review: Review = {
      ...insertReview,
      id,
      qualityFlag: "basic",
      pointsAwarded: 10, // Default points for basic review
      createdAt: new Date(),
    };
    this.reviews.set(id, review);

    // Update submission review count
    const submission = await this.getSubmission(review.submissionId);
    if (submission) {
      submission.reviewsReceived += 1;
      if (submission.reviewsReceived >= submission.reviewsRequired) {
        submission.status = "completed";
      }
      this.submissions.set(submission.id, submission);
    }

    return review;
  }

  async getReview(id: number): Promise<Review | undefined> {
    return this.reviews.get(id);
  }

  async getReviewsBySubmission(submissionId: number): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter(
      (review) => review.submissionId === submissionId,
    );
  }

  async getReviewsByReviewer(reviewerId: number): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter(
      (review) => review.reviewerId === reviewerId,
    );
  }

  async getPendingReviewsForUser(userId: number): Promise<Submission[]> {
    const userReviews = await this.getReviewsByReviewer(userId);
    const reviewedSubmissionIds = new Set(userReviews.map(r => r.submissionId));

    return Array.from(this.submissions.values()).filter(submission => 
      submission.status === "pending" &&
      submission.userId !== userId && // Can't review own submissions
      !reviewedSubmissionIds.has(submission.id) && // Haven't reviewed it yet
      submission.reviewsReceived < submission.reviewsRequired // Still needs reviews
    );
  }

  // Calendar Events
  async getCalendarEventsByUser(userId: number): Promise<CalendarEvent[]> {
    return Array.from(this.calendarEvents.values()).filter(
      (event) => event.userId === userId
    );
  }

  async createCalendarEvent(insertEvent: InsertCalendarEvent & { userId: number }): Promise<CalendarEvent> {
    const id = this.currentId++;
    const event: CalendarEvent = {
      ...insertEvent,
      id,
      createdAt: new Date(),
    };
    this.calendarEvents.set(id, event);
    return event;
  }

  async getCalendarEvent(id: number): Promise<CalendarEvent | undefined> {
    return this.calendarEvents.get(id);
  }

  async updateCalendarEvent(id: number, updateEvent: Partial<InsertCalendarEvent>): Promise<CalendarEvent> {
    const event = await this.getCalendarEvent(id);
    if (!event) throw new Error("Event not found");

    const updatedEvent = { ...event, ...updateEvent };
    this.calendarEvents.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteCalendarEvent(id: number): Promise<void> {
    this.calendarEvents.delete(id);
  }

  // Time Slots
  async getTimeSlotsByUser(userId: number): Promise<TimeSlot[]> {
    return Array.from(this.timeSlots.values()).filter(
      (slot) => slot.userId === userId
    );
  }

  async createTimeSlot(insertSlot: InsertTimeSlot & { userId: number }): Promise<TimeSlot> {
    const id = this.currentId++;
    const slot: TimeSlot = {
      ...insertSlot,
      id,
      createdAt: new Date(),
    };
    this.timeSlots.set(id, slot);
    return slot;
  }

  async updateTimeSlot(id: number, updateSlot: Partial<InsertTimeSlot>): Promise<TimeSlot> {
    const slot = this.timeSlots.get(id);
    if (!slot) throw new Error("Time slot not found");

    const updatedSlot = { ...slot, ...updateSlot };
    this.timeSlots.set(id, updatedSlot);
    return updatedSlot;
  }

  async deleteTimeSlot(id: number): Promise<void> {
    this.timeSlots.delete(id);
  }

  // Calendar Sync
  async getCalendarSyncRequests(userId: number): Promise<CalendarSync[]> {
    return Array.from(this.calendarSyncs.values()).filter(
      (sync) => sync.toUserId === userId && sync.status === "pending"
    );
  }

  async createCalendarSync(insertSync: InsertCalendarSync & { fromUserId: number }): Promise<CalendarSync> {
    const id = this.currentId++;
    const sync: CalendarSync = {
      ...insertSync,
      id,
      status: "pending",
      createdAt: new Date(),
    };
    this.calendarSyncs.set(id, sync);
    return sync;
  }

  async getCalendarSync(id: number): Promise<CalendarSync | undefined> {
    return this.calendarSyncs.get(id);
  }

  async updateCalendarSync(id: number, updateSync: { status: string }): Promise<CalendarSync> {
    const sync = await this.getCalendarSync(id);
    if (!sync) throw new Error("Sync request not found");

    const updatedSync = { ...sync, ...updateSync };
    this.calendarSyncs.set(id, updatedSync);
    return updatedSync;
  }

  async deleteCalendarSync(fromUserId: number, toUserId: number): Promise<void> {
    for (const [id, sync] of this.calendarSyncs) {
      if (
        (sync.fromUserId === fromUserId && sync.toUserId === toUserId) ||
        (sync.fromUserId === toUserId && sync.toUserId === fromUserId)
      ) {
        this.calendarSyncs.delete(id);
      }
    }
  }

  async getSyncedPeers(userId: number): Promise<User[]> {
    const syncs = Array.from(this.calendarSyncs.values()).filter(
      (sync) =>
        (sync.fromUserId === userId || sync.toUserId === userId) &&
        sync.status === "accepted"
    );

    const peerIds = syncs.map((sync) =>
      sync.fromUserId === userId ? sync.toUserId : sync.fromUserId
    );

    return Promise.all(peerIds.map((id) => this.getUser(id))).then((users) =>
      users.filter((user): user is User => user !== undefined)
    );
  }

  async searchUsers(query: string): Promise<User[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.users.values()).filter((user) =>
      user.username.toLowerCase().includes(lowercaseQuery)
    );
  }
}

export const storage = new MemStorage();