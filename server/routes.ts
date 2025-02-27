import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertAssignmentSchema, insertSubmissionSchema, insertReviewSchema } from "@shared/schema";
import { insertCalendarEventSchema, insertCalendarSyncSchema } from "@shared/schema"; // Added import


export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Assignments
  app.get("/api/assignments", async (req, res) => {
    const assignments = await storage.getAssignments();
    res.json(assignments);
  });

  app.get("/api/assignments/category/:category", async (req, res) => {
    const assignments = await storage.getAssignmentsByCategory(req.params.category);
    res.json(assignments);
  });

  app.get("/api/assignments/difficulty/:level", async (req, res) => {
    const assignments = await storage.getAssignmentsByDifficulty(parseInt(req.params.level));
    res.json(assignments);
  });

  app.post("/api/assignments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = insertAssignmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const assignment = await storage.createAssignment({
      ...parsed.data,
      authorId: req.user.id,
    });
    res.status(201).json(assignment);
  });

  // Submissions
  app.post("/api/submissions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = insertSubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const submission = await storage.createSubmission({
      ...parsed.data,
      userId: req.user.id,
    });
    res.status(201).json(submission);
  });

  app.get("/api/submissions/assignment/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const submissions = await storage.getSubmissionsByAssignment(
      parseInt(req.params.id),
    );
    res.json(submissions);
  });

  app.get("/api/submissions/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const submissions = await storage.getSubmissionsByUser(req.user.id);
    res.json(submissions);
  });

  app.get("/api/submissions/to-review", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const submissions = await storage.getPendingReviewsForUser(req.user.id);
    res.json(submissions);
  });

  // Reviews
  app.post("/api/reviews", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = insertReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    // Check if the submission exists and needs reviews
    const submission = await storage.getSubmission(parsed.data.submissionId);
    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    if (submission.reviewsReceived >= submission.reviewsRequired) {
      return res.status(400).json({ message: "This submission already has enough reviews" });
    }

    // Calculate review quality and points
    const qualityFlag = parsed.data.feedback.length >= 100 ? "quality" : "basic";
    const pointsAwarded = qualityFlag === "quality" ? 15 : 10;

    const review = await storage.createReview({
      ...parsed.data,
      reviewerId: req.user.id,
      qualityFlag,
      pointsAwarded,
    });

    // Award PRP points to the reviewer
    await storage.updateUserPoints(req.user.id, pointsAwarded);

    // If this was the last required review, update submission status
    if (submission.reviewsReceived + 1 >= submission.reviewsRequired) {
      await storage.updateSubmissionStatus(submission.id, "completed");

      // Calculate average rating and award XP to the submission author
      const reviews = await storage.getReviewsBySubmission(submission.id);
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      const xpAwarded = Math.floor(avgRating * 20); // 20-100 XP based on rating
      await storage.updateUserXP(submission.userId, xpAwarded);
    }

    res.status(201).json(review);
  });

  app.get("/api/reviews/submission/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const reviews = await storage.getReviewsBySubmission(parseInt(req.params.id));
    res.json(reviews);
  });

  // User stats
  app.get("/api/user/stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const user = await storage.getUser(req.user.id);
    const submissions = await storage.getSubmissionsByUser(req.user.id);
    const reviews = await storage.getReviewsByReviewer(req.user.id);

    res.json({
      prpPoints: user?.prpPoints || 0,
      skillLevel: user?.skillLevel || 1,
      totalXp: user?.totalXp || 0,
      submissionsCount: submissions.length,
      reviewsCount: reviews.length,
      averageRating: reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length || 0
    });
  });

  // Calendar routes
  app.get("/api/calendar", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const [events, timeSlots, syncRequests, syncedPeers] = await Promise.all([
      storage.getCalendarEventsByUser(req.user.id),
      storage.getTimeSlotsByUser(req.user.id),
      storage.getCalendarSyncRequests(req.user.id),
      storage.getSyncedPeers(req.user.id)
    ]);

    res.json({
      events,
      timeSlots,
      syncRequests,
      syncedPeers
    });
  });

  app.post("/api/calendar/events", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = insertCalendarEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const event = await storage.createCalendarEvent({
      ...parsed.data,
      userId: req.user.id
    });

    res.status(201).json(event);
  });

  app.patch("/api/calendar/events/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const event = await storage.getCalendarEvent(parseInt(req.params.id));
    if (!event || event.userId !== req.user.id) {
      return res.status(404).json({ message: "Event not found" });
    }

    const parsed = insertCalendarEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const updatedEvent = await storage.updateCalendarEvent(event.id, parsed.data);
    res.json(updatedEvent);
  });

  app.delete("/api/calendar/events/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const event = await storage.getCalendarEvent(parseInt(req.params.id));
    if (!event || event.userId !== req.user.id) {
      return res.status(404).json({ message: "Event not found" });
    }

    await storage.deleteCalendarEvent(event.id);
    res.sendStatus(200);
  });

  // Calendar sync routes
  app.post("/api/calendar/sync-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = insertCalendarSyncSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const syncRequest = await storage.createCalendarSync({
      ...parsed.data,
      fromUserId: req.user.id
    });

    res.status(201).json(syncRequest);
  });

  app.patch("/api/calendar/sync-requests/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const syncRequest = await storage.getCalendarSync(parseInt(req.params.id));
    if (!syncRequest || syncRequest.toUserId !== req.user.id) {
      return res.status(404).json({ message: "Sync request not found" });
    }

    const status = req.body.status;
    if (status !== "accepted" && status !== "rejected") {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updatedSync = await storage.updateCalendarSync(syncRequest.id, { status });
    res.json(updatedSync);
  });

  app.delete("/api/calendar/sync/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    await storage.deleteCalendarSync(req.user.id, parseInt(req.params.userId));
    res.sendStatus(200);
  });

  // User search route for sync
  app.get("/api/users/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const query = req.query.q as string;
    if (!query) {
      return res.json([]);
    }

    const users = await storage.searchUsers(query);
    res.json(users);
  });

  const httpServer = createServer(app);
  return httpServer;
}