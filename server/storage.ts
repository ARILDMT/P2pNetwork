import { User, InsertUser, Assignment, InsertAssignment, Submission, InsertSubmission, Review, InsertReview } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPoints(userId: number, points: number): Promise<User>;
  updateUserXP(userId: number, xp: number): Promise<User>;

  // Assignment operations
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  getAssignment(id: number): Promise<Assignment | undefined>;
  getAssignments(): Promise<Assignment[]>;
  getAssignmentsByCategory(category: string): Promise<Assignment[]>;
  getAssignmentsByDifficulty(difficulty: number): Promise<Assignment[]>;

  // Submission operations
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmission(id: number): Promise<Submission | undefined>;
  getSubmissionsByAssignment(assignmentId: number): Promise<Submission[]>;
  getSubmissionsByUser(userId: number): Promise<Submission[]>;
  updateSubmissionStatus(submissionId: number, status: string): Promise<Submission>;

  // Review operations
  createReview(review: InsertReview): Promise<Review>;
  getReview(id: number): Promise<Review | undefined>;
  getReviewsBySubmission(submissionId: number): Promise<Review[]>;
  getReviewsByReviewer(reviewerId: number): Promise<Review[]>;
  getPendingReviewsForUser(userId: number): Promise<Submission[]>;

  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private assignments: Map<number, Assignment>;
  private submissions: Map<number, Submission>;
  private reviews: Map<number, Review>;
  private currentId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.assignments = new Map();
    this.submissions = new Map();
    this.reviews = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
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

  async createAssignment(insertAssignment: InsertAssignment): Promise<Assignment> {
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

  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    const id = this.currentId++;
    const submission: Submission = {
      ...insertSubmission,
      id,
      userId: 0, // Will be set by the route handler
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

  async createReview(insertReview: InsertReview): Promise<Review> {
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
}

export const storage = new MemStorage();