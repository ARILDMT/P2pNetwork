import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  bio: text("bio"),
  role: text("role").default("student").notNull(),
  prpPoints: integer("prp_points").default(0).notNull(),
  skillLevel: integer("skill_level").default(1).notNull(),
  totalXp: integer("total_xp").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  difficulty: integer("difficulty").default(1).notNull(),
  authorId: integer("author_id").references(() => users.id).notNull(),
  requiredReviews: integer("required_reviews").default(3).notNull(),
  autoVerificationEnabled: boolean("auto_verification_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").references(() => assignments.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  status: text("status").default("pending").notNull(), // pending, reviewing, completed
  reviewsReceived: integer("reviews_received").default(0).notNull(),
  reviewsRequired: integer("reviews_required").default(3).notNull(),
  autoVerificationStatus: text("auto_verification_status"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull()
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").references(() => submissions.id).notNull(),
  reviewerId: integer("reviewer_id").references(() => users.id).notNull(),
  rating: integer("rating").notNull(),
  feedback: text("feedback").notNull(),
  qualityFlag: text("quality_flag").default("basic").notNull(), // basic, quality
  pointsAwarded: integer("points_awarded").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Schema validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  bio: true,
  role: true
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  username: z.string().min(3, "Username must be at least 3 characters")
});

export const insertAssignmentSchema = createInsertSchema(assignments).pick({
  title: true,
  description: true,
  category: true,
  difficulty: true,
  autoVerificationEnabled: true
});

export const insertSubmissionSchema = createInsertSchema(submissions).pick({
  assignmentId: true,
  content: true
});

export const insertReviewSchema = createInsertSchema(reviews).pick({
  submissionId: true,
  rating: true,
  feedback: true
}).extend({
  rating: z.number().min(1).max(5),
  feedback: z.string().min(20, "Feedback must be at least 20 characters")
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;