import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertAssignmentSchema, insertSubmissionSchema, insertReviewSchema } from "@shared/schema";

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

  // Reviews
  app.post("/api/reviews", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const parsed = insertReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const review = await storage.createReview({
      ...parsed.data,
      reviewerId: req.user.id,
    });
    res.status(201).json(review);
  });

  app.get("/api/reviews/submission/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const reviews = await storage.getReviewsBySubmission(parseInt(req.params.id));
    res.json(reviews);
  });

  const httpServer = createServer(app);
  return httpServer;
}
