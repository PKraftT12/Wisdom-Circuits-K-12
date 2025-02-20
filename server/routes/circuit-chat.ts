import { Router } from "express";
import { OpenAIService } from "../services/openai-service";
import { storage } from "../storage";

const router = Router();

router.post("/api/circuit/:circuitId/chat", async (req, res) => {
  try {
    const circuitId = parseInt(req.params.circuitId);
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Get circuit data
    const circuit = await storage.getWisdomCircuit(circuitId);
    if (!circuit) {
      return res.status(404).json({ error: "Circuit not found" });
    }

    // Get circuit content
    const content = await storage.getCircuitContent(circuitId);
    const processedContent = content.map(c => `${c.title}:\n${c.content || c.description}`);

    // Create context for OpenAI
    const context = {
      circuit,
      teachingStyles: circuit.teachingStyles || [],
      homeworkPolicies: circuit.homeworkPolicies || [],
      responseTypes: circuit.responseTypes || [],
      stateAlignment: circuit.stateAlignment || "General",
      uploadedContent: processedContent,
    };

    // Process message with OpenAI
    const response = await OpenAIService.processChatMessage(message, context);

    res.json({ response });
  } catch (error) {
    console.error("Chat Processing Error:", error);
    res.status(500).json({ error: "Failed to process chat message" });
  }
});

export default router;