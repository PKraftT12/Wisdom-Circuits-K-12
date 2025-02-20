import express from 'express';
import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { insertWisdomCircuitSchema, insertCircuitContentSchema } from "@shared/schema";
import { ZodError } from "zod";
import { setupAuth } from "./auth";
import OpenAI from "openai";
import { Readable } from 'stream';
import { File } from '@web-std/file';
import wisdomCircuitsRouter from './routes/wisdom-circuits';
import circuitChatRouter from './routes/circuit-chat';
import { generateCircuitDescription } from './openai';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

if (!process.env.OPENAI_API_KEY) {
  console.error('Missing OpenAI API key. Audio transcription and chat features will not work.');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Register the routers
  app.use('/api', wisdomCircuitsRouter);
  app.use('/api', circuitChatRouter);

  // Add endpoint to generate circuit descriptions
  app.post("/api/generate-description", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isTeacher) {
      return res.status(403).json({ error: "Only teachers can generate descriptions" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: "OpenAI API key is not configured. Please contact support." 
      });
    }

    try {
      const { title, grade } = req.body;
      if (!title || title.trim() === '') {
        return res.status(400).json({ error: "Title is required for description generation" });
      }

      const validGrades = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
      if (!grade || !validGrades.includes(grade)) {
        return res.status(400).json({ error: "Valid grade level is required (K-12)" });
      }

      console.log('Attempting to generate description for:', { name: title, grade });
      const description = await generateCircuitDescription(title, grade);
      console.log('Generated description:', description);
      res.json({ description });
    } catch (error) {
      console.error('Error generating description:', error);
      if (error instanceof Error) {
        res.status(500).json({ 
          error: error.message 
        });
      } else {
        res.status(500).json({ 
          error: "An unexpected error occurred while generating description" 
        });
      }
    }
  });

  app.post("/api/transcribe", upload.single('audio'), async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isTeacher) {
      return res.status(403).json({ message: "Only teachers can upload recordings" });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file provided" });
      }

      const circuitId = parseInt(req.body.circuitId);
      if (isNaN(circuitId)) {
        return res.status(400).json({ message: "Invalid circuit ID" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ 
          message: "Transcription service is not configured. Please contact support."
        });
      }

      console.log('Processing audio file for transcription...');
      console.log('File details:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      const audioBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
      const file = new File([audioBlob], req.file.originalname, { type: req.file.mimetype });

      // Transcribe using OpenAI Whisper API
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
        language: "en"
      });

      console.log('Transcription successful:', transcription);

      // Create content entry for the transcript
      const contentData = {
        circuitId,
        title: `Class Recording Transcript - ${new Date().toLocaleString()}`,
        description: 'Automatically generated transcript from class recording',
        contentUrl: '', // This would be the URL if we were storing the file
        fileType: 'txt',
        category: 'transcript',
        content: transcription.text
      };

      console.log('Saving transcript to database...');
      const validatedContent = insertCircuitContentSchema.parse(contentData);
      const content = await storage.createCircuitContent(validatedContent);

      console.log('Transcript saved successfully:', content);
      res.json(content);
    } catch (error) {
      console.error('Transcription error details:', error);

      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Invalid content data", 
          errors: error.errors 
        });
      }

      // Handle OpenAI API errors
      if (error instanceof Error && 'status' in error) {
        const apiError = error as any;
        if (apiError.status === 401) {
          return res.status(500).json({ 
            message: "Authentication error with transcription service. Please check API key."
          });
        }
        return res.status(500).json({
          message: `OpenAI API error: ${apiError.message || 'Unknown error'}`,
          status: apiError.status
        });
      }

      res.status(500).json({ 
        message: "Failed to process audio recording. Please try again.",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Circuit content upload endpoint
  app.post("/api/circuit-content/:circuitId", upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isTeacher) {
      return res.status(403).json({ message: "Only teachers can upload content" });
    }

    try {
      const circuitId = parseInt(req.params.circuitId);
      if (isNaN(circuitId)) {
        return res.status(400).json({ message: "Invalid circuit ID" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Get the file extension and map it to allowed types
      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      let fileType: string;

      switch (fileExtension) {
        case '.pdf':
          fileType = 'pdf';
          break;
        case '.doc':
        case '.docx':
          fileType = 'docx';
          break;
        case '.txt':
          fileType = 'txt';
          break;
        case '.ppt':
        case '.pptx':
          fileType = 'pptx';
          break;
        default:
          return res.status(400).json({ message: "Unsupported file type" });
      }

      // Read file content
      let content = '';
      if (fileType === 'txt') {
        content = await readFile(req.file.path, 'utf-8');
      } else if (fileType === 'pdf') {
        // For PDF files, we'll use OpenAI to extract text content
        try {
          const formData = new FormData();
          formData.append('file', new File([await readFile(req.file.path)], req.file.originalname, { type: 'application/pdf' }));
          formData.append('model', 'whisper-1');

          const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: formData
          });

          if (response.ok) {
            const result = await response.json();
            content = result.text;
          } else {
            console.error(`OpenAI API request failed with status ${response.status}`);
          }
        } catch (error) {
          console.error('Error extracting PDF content:', error);
        }
      }

      let contentData = {
        circuitId,
        title: req.body.title || req.file.originalname,
        description: req.body.description || '',
        contentUrl: `/uploads/${req.file.filename}`,
        fileType,
        category: req.body.category || 'reference_material',
        content: content || '', // Store the extracted content
      };

      console.log('Attempting to create content with data:', contentData);
      const validatedContent = insertCircuitContentSchema.parse(contentData);
      const savedContent = await storage.createCircuitContent(validatedContent);
      console.log('Content created successfully:', savedContent);
      return res.json(savedContent);

    } catch (error) {
      console.error('Content creation error:', error);
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Invalid content data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to upload content" });
    }
  });

  // Get circuit content
  app.get("/api/circuit-content/:circuitId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const circuitId = parseInt(req.params.circuitId);
      if (isNaN(circuitId)) {
        return res.status(400).json({ message: "Invalid circuit ID" });
      }

      console.log(`Fetching content for circuit ${circuitId}`);
      const content = await storage.getCircuitContent(circuitId);
      console.log(`Found ${content?.length || 0} content items:`, content);

      res.json(content);
    } catch (error) {
      console.error('Error in circuit content route:', error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  // Delete (archive) circuit content
  app.delete("/api/circuit-content/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isTeacher) {
      return res.status(403).json({ message: "Only teachers can delete content" });
    }

    try {
      const content = await storage.archiveCircuitContent(parseInt(req.params.id));
      res.json(content);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete content" });
    }
  });

  app.use('/uploads', express.static('uploads'));

  const httpServer = createServer(app);
  return httpServer;
}