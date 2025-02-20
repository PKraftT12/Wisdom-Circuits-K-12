import OpenAI from "openai";
import { Router } from "express";
import { db } from "../db";
import { wisdomCircuits } from "@shared/schema";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { storage } from "../storage";

const router = Router();

// Initialize OpenAI with API key from environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Add description generation endpoint
router.post("/generate-description", async (req, res) => {
  try {
    const { title, grade } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    // Validate grade level
    const validGrades = ['K', ...Array(12).fill(0).map((_, i) => String(i + 1))];
    if (!validGrades.includes(grade)) {
      return res.status(400).json({ error: "Invalid grade level" });
    }

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a specialized education AI focused on generating grade-appropriate course descriptions.

For each grade level, you MUST follow these exact patterns:

Kindergarten (K):
- Use ONLY these sentence starters: "Let's learn", "We will explore", "Come discover"
- Use ONLY 1-2 syllable words
- Focus on fun and play
- Example: "Let's learn about shapes and colors in a fun way!"

Grades 1-3:
- Use ONLY these sentence starters: "Find out", "Learn how", "Discover why"
- Connect to daily life
- Keep words simple
- Example: "Find out how rain helps plants grow in our garden!"

Grades 4-6:
- Use ONLY these sentence starters: "Explore", "Investigate", "Study"
- Include one scientific term
- Link to real examples
- Example: "Explore ecosystems by watching how plants and animals work together!"

Grades 7-8:
- Use ONLY these sentence starters: "Analyze", "Examine", "Discover the science of"
- Include scientific concepts
- Mention experiments
- Example: "Analyze force and motion through exciting physics experiments!"

Grades 9-12:
- Use ONLY these sentence starters: "Master", "Learn to apply", "Study advanced"
- Include complex terminology
- Connect to careers
- Example: "Master calculus concepts used by real engineers and scientists!"

Target grade level: ${grade === 'K' ? 'Kindergarten' : `Grade ${grade}`}`
        },
        {
          role: "user",
          content: `Write a description for "${title}" that matches EXACTLY the pattern and complexity shown for ${grade === 'K' ? 'Kindergarten' : `Grade ${grade}`} level. Use ONLY the allowed sentence starters for this grade level.`
        }
      ],
      max_tokens: 100,
      temperature: 1.5, // Maximum temperature for highest variation
    });

    const description = response.choices[0].message.content?.trim();
    res.json({ description });
  } catch (error: any) {
    console.error("Error generating description:", error);

    // Handle different types of errors
    if (error?.status === 401) {
      return res.status(401).json({ 
        error: "Unable to access AI services. Please check your OpenAI API key.",
        isAuthError: true
      });
    }

    if (error?.status === 429) {
      return res.status(429).json({ 
        error: "AI description generation is temporarily unavailable. Please try again later.",
        isRateLimitError: true
      });
    }

    // Generic error handling
    res.status(500).json({ 
      error: "Failed to generate description. Please try again or enter a description manually.",
      details: error.message
    });
  }
});

// Add create circuit endpoint
router.post("/wisdom-circuits", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user.isTeacher) {
      return res.status(403).json({ error: "Only teachers can create circuits" });
    }

    console.log('Received create circuit request:', req.body);
    const { 
      name, 
      description, 
      teachingStyles,
      homeworkPolicies,
      responseTypes,
      stateAlignment,
      grade = 'K' // Default to Kindergarten if not provided
    } = req.body;

    // Validate required fields
    if (!name || !description) {
      return res.status(400).json({ 
        error: "Missing required fields", 
        details: "Name and description are required" 
      });
    }

    // Generate a unique 8-character code
    const code = nanoid(8).toUpperCase();

    // Create the circuit with all required fields
    const [circuit] = await db.insert(wisdomCircuits).values({
      name,
      description,
      code,
      teacherId: req.user.id, // Use the authenticated user's ID
      teacherName: req.user.displayName || "Unknown Teacher", // Use display name from user profile
      grade,
      teachingStyles: teachingStyles || ['hybrid'],
      homeworkPolicies: homeworkPolicies || ['guide'],
      responseTypes: responseTypes || ['detailed'],
      stateAlignment: stateAlignment || 'California'
    }).returning();

    console.log('Created circuit:', circuit);
    res.status(201).json(circuit);
  } catch (error: any) {
    console.error("Error creating circuit:", error);
    res.status(500).json({ 
      error: "Failed to create circuit",
      details: error.message
    });
  }
});

// Add endpoint to add circuit by code
router.post("/wisdom-circuits/add/:code", async (req, res) => {
  try {
    const code = req.params.code;
    if (!code) {
      return res.status(400).json({ error: "Circuit code is required" });
    }

    // Find circuit by code
    const [circuit] = await db
      .select()
      .from(wisdomCircuits)
      .where(eq(wisdomCircuits.code, code.toUpperCase()));

    if (!circuit) {
      return res.status(404).json({ error: "Invalid circuit code" });
    }

    res.json(circuit);
  } catch (error: any) {
    console.error("Error adding circuit:", error);
    res.status(500).json({ 
      error: "Failed to add circuit",
      details: error.message
    });
  }
});

// Add chat endpoint
router.post("/chat", async (req, res) => {
  try {
    const {
      message,
      subject,
      grade,
      stateStandards,
      teachingStyle,
      learningObjectives
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Validate grade level
    const validGrades = ['K', ...Array(12).fill(0).map((_, i) => String(i + 1))];
    if (!validGrades.includes(grade)) {
      return res.status(400).json({ error: "Invalid grade level" });
    }

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert educator specializing in ${subject} for ${grade === 'K' ? 'Kindergarten' : `Grade ${grade}`} students.
${stateStandards ? `You must align all responses with ${stateStandards} state educational standards.` : ''}
${teachingStyle ? `Your teaching style should be ${teachingStyle}.` : ''}

Follow these grade-specific guidelines:

${grade === 'K' ? `
Kindergarten Guidelines:
- Use only simple words (1-2 syllables)
- Keep sentences very short and simple
- Use lots of encouragement and positive reinforcement
- Relate concepts to familiar objects and experiences
- Focus on basic concepts and concrete examples
` : grade >= 1 && grade <= 3 ? `
Grades 1-3 Guidelines:
- Use simple vocabulary with occasional new words (explained clearly)
- Use short, clear sentences
- Include simple explanations of cause and effect
- Connect learning to daily life experiences
- Use engaging, descriptive language
` : grade >= 4 && grade <= 6 ? `
Grades 4-6 Guidelines:
- Introduce academic vocabulary with clear explanations
- Use compound sentences and basic complex sentences
- Include more detailed explanations of concepts
- Reference real-world applications
- Encourage critical thinking
` : grade >= 7 && grade <= 8 ? `
Grades 7-8 Guidelines:
- Use grade-appropriate academic language
- Include scientific/technical terms with context
- Encourage analytical thinking
- Reference practical applications
- Guide students through logical problem-solving
` : `
Grades 9-12 Guidelines:
- Use advanced academic vocabulary
- Include complex concepts and theories
- Encourage deep analytical thinking
- Connect concepts to career applications
- Foster independent problem-solving
`}

Learning Objectives: ${learningObjectives ? learningObjectives.join(', ') : 'General subject mastery'}

Remember to:
1. Always maintain grade-appropriate language and concepts
2. Connect responses to the subject matter
3. Support state standards when applicable
4. Use examples relevant to the grade level
5. Encourage critical thinking appropriate for the grade`
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 200,
      temperature: 0.7
    });

    const aiResponse = response.choices[0].message.content?.trim();
    res.json({ response: aiResponse });
  } catch (error: any) {
    console.error("Error in chat response:", error);

    if (error?.status === 401) {
      return res.status(401).json({ 
        error: "Unable to access AI services. Please check your OpenAI API key.",
        isAuthError: true
      });
    }

    if (error?.status === 429) {
      return res.status(429).json({ 
        error: "AI chat is temporarily unavailable. Please try again later.",
        isRateLimitError: true
      });
    }

    res.status(500).json({ 
      error: "Failed to generate response. Please try again.",
      details: error.message
    });
  }
});

// Add endpoint to get all circuits for the current teacher
router.get("/wisdom-circuits/added", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    console.log('Fetching circuits for teacher:', req.user.id);
    const circuits = await storage.getWisdomCircuitsByTeacher(req.user.id);
    console.log('Retrieved circuits:', circuits);
    res.json(circuits);
  } catch (error: any) {
    console.error("Error fetching circuits:", error);
    res.status(500).json({ 
      error: "Failed to fetch circuits",
      details: error.message
    });
  }
});

// Add endpoint to get all circuits
router.get("/wisdom-circuits", async (req, res) => {
  try {
    const circuits = await db.select().from(wisdomCircuits);
    res.json(circuits);
  } catch (error: any) {
    console.error("Error fetching circuits:", error);
    res.status(500).json({ 
      error: "Failed to fetch circuits",
      details: error.message
    });
  }
});

// Add archive circuit endpoint
router.post("/wisdom-circuits/:id/archive", async (req, res) => {
  try {
    console.log('Archive request received:', {
      user: req.user,
      isAuthenticated: req.isAuthenticated(),
      isTeacher: req?.user?.isTeacher,
      circuitId: req.params.id
    });

    if (!req.isAuthenticated() || !req.user.isTeacher) {
      console.log('Authorization failed:', {
        isAuthenticated: req.isAuthenticated(),
        isTeacher: req?.user?.isTeacher
      });
      return res.status(403).json({ error: "Only teachers can archive circuits" });
    }

    const circuitId = parseInt(req.params.id);
    if (isNaN(circuitId)) {
      return res.status(400).json({ error: "Invalid circuit ID" });
    }

    // Get the circuit first to verify ownership
    const circuit = await storage.getWisdomCircuit(circuitId);
    if (!circuit) {
      return res.status(404).json({ error: "Circuit not found" });
    }

    // Verify ownership
    if (circuit.teacherId !== req.user.id) {
      return res.status(403).json({ error: "You can only archive your own circuits" });
    }

    // Archive the circuit
    const archivedCircuit = await storage.archiveWisdomCircuit(circuitId);
    console.log('Circuit archived successfully:', archivedCircuit);
    res.json(archivedCircuit);
  } catch (error: any) {
    console.error("Error archiving circuit:", error);
    res.status(500).json({ 
      error: "Failed to archive circuit",
      details: error.message
    });
  }
});

// Add unarchive circuit endpoint
router.post("/wisdom-circuits/:id/unarchive", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user.isTeacher) {
      return res.status(403).json({ error: "Only teachers can unarchive circuits" });
    }

    const circuitId = parseInt(req.params.id);
    if (isNaN(circuitId)) {
      return res.status(400).json({ error: "Invalid circuit ID" });
    }

    // Get the circuit first to verify ownership
    const circuit = await storage.getWisdomCircuit(circuitId);
    if (!circuit) {
      return res.status(404).json({ error: "Circuit not found" });
    }

    // Verify ownership
    if (circuit.teacherId !== req.user.id) {
      return res.status(403).json({ error: "You can only unarchive your own circuits" });
    }

    const archivedCircuit = await storage.unarchiveWisdomCircuit(circuitId);
    res.json(archivedCircuit);
  } catch (error: any) {
    console.error("Error unarchiving circuit:", error);
    res.status(500).json({ 
      error: "Failed to unarchive circuit",
      details: error.message
    });
  }
});

// Add endpoint to get archived circuits for the current teacher
router.get("/wisdom-circuits/archived", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user.isTeacher) {
      return res.status(403).json({ error: "Only teachers can view archived circuits" });
    }

    console.log('Fetching archived circuits for teacher:', req.user.id);
    const archivedCircuits = await storage.getArchivedWisdomCircuitsByTeacher(req.user.id);
    console.log('Retrieved archived circuits:', archivedCircuits);
    res.json(archivedCircuits);
  } catch (error: any) {
    console.error("Error fetching archived circuits:", error);
    res.status(500).json({ 
      error: "Failed to fetch archived circuits",
      details: error.message
    });
  }
});

// Add DELETE endpoint for wisdom circuits
router.delete("/wisdom-circuits/:id", async (req, res) => {
  try {
    console.log('Delete request received:', {
      user: req.user,
      isAuthenticated: req.isAuthenticated(),
      isTeacher: req?.user?.isTeacher,
      isAdmin: req?.user?.isAdmin,
      circuitId: req.params.id
    });

    if (!req.isAuthenticated() || (!req.user.isTeacher && !req.user.isAdmin)) {
      console.log('Authorization failed:', {
        isAuthenticated: req.isAuthenticated(),
        isTeacher: req?.user?.isTeacher,
        isAdmin: req?.user?.isAdmin
      });
      return res.status(403).json({ error: "Only teachers or admins can delete circuits" });
    }

    const circuitId = parseInt(req.params.id);
    if (isNaN(circuitId)) {
      return res.status(400).json({ error: "Invalid circuit ID" });
    }

    // Get the circuit first to verify ownership
    const circuit = await storage.getWisdomCircuit(circuitId);
    if (!circuit) {
      return res.status(404).json({ error: "Circuit not found" });
    }

    // Allow deletion if user is the owner OR if user is an admin
    if (circuit.teacherId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: "You can only delete your own circuits or you need admin rights" });
    }

    // Delete the circuit
    const deletedCircuit = await storage.deleteWisdomCircuit(circuitId);
    console.log('Circuit deleted successfully:', deletedCircuit);
    res.json(deletedCircuit);
  } catch (error: any) {
    console.error("Error deleting circuit:", error);
    res.status(500).json({ 
      error: "Failed to delete circuit",
      details: error.message
    });
  }
});

export default router;