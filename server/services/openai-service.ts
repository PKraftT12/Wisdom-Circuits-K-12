import OpenAI from "openai";
import type { WisdomCircuit } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface CircuitContext {
  circuit: WisdomCircuit;
  teachingStyles: string[];
  homeworkPolicies: string[];
  responseTypes: string[];
  stateAlignment: string;
  uploadedContent?: string[];
}

export class OpenAIService {
  private static generateSystemPrompt(context: CircuitContext): string {
    const gradeLevel = context.circuit.grade === 'K' ? 'Kindergarten' : `Grade ${context.circuit.grade}`;
    
    // Build teaching style description
    const teachingStyleDesc = context.teachingStyles
      .map(style => {
        switch (style) {
          case 'authority': return 'direct and structured instruction';
          case 'demonstrator': return 'demonstration and guided practice';
          case 'facilitator': return 'guided inquiry and discussion';
          case 'delegator': return 'independent learning and group work';
          case 'hybrid': return 'flexible combination of teaching methods';
          default: return '';
        }
      })
      .filter(Boolean)
      .join(', ');

    // Build homework approach
    const homeworkApproach = context.homeworkPolicies
      .map(policy => {
        switch (policy) {
          case 'guide': return 'provide guidance without direct solutions';
          case 'verify': return 'verify and confirm answer correctness';
          case 'examples': return 'offer relevant examples';
          case 'no_solutions': return 'encourage independent problem-solving';
          default: return '';
        }
      })
      .filter(Boolean)
      .join(', ');

    // Build response style
    const responseStyle = context.responseTypes
      .map(type => {
        switch (type) {
          case 'detailed': return 'provide comprehensive explanations';
          case 'concise': return 'give brief, focused answers';
          case 'step_by_step': return 'break down concepts into clear steps';
          case 'conceptual': return 'emphasize underlying principles';
          default: return '';
        }
      })
      .filter(Boolean)
      .join(', ');

    return `You are an educational AI assistant for ${gradeLevel} students, specializing in ${context.circuit.name}.
Teaching Approach: Utilize ${teachingStyleDesc}.
Homework Guidance: ${homeworkApproach}.
Communication Style: ${responseStyle}.
State Alignment: Follow ${context.stateAlignment} educational standards.

Key Guidelines:
1. Always communicate at a ${gradeLevel} comprehension level
2. Use age-appropriate examples and analogies
3. Maintain a supportive and encouraging tone
4. Follow the specified teaching styles and response formats
5. Reference relevant uploaded content when applicable

Knowledge Base:
${context.uploadedContent ? context.uploadedContent.join('\n') : 'No specific content uploaded yet.'}

Remember to:
- Keep explanations appropriate for ${gradeLevel} students
- Use the teaching styles specified: ${teachingStyleDesc}
- Follow the homework policy: ${homeworkApproach}
- Maintain the response style: ${responseStyle}`;
  }

  static async processChatMessage(
    message: string,
    context: CircuitContext
  ): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: this.generateSystemPrompt(context),
          },
          {
            role: "user",
            content: message,
          },
        ],
        temperature: 0.7, // Balanced between creativity and consistency
        max_tokens: 500, // Reasonable length for educational responses
      });

      return response.choices[0].message.content || "I apologize, but I couldn't generate a response. Please try rephrasing your question.";
    } catch (error) {
      console.error("OpenAI API Error:", error);
      throw new Error("Failed to process your message. Please try again later.");
    }
  }

  static async processUploadedContent(
    content: string,
    context: CircuitContext
  ): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an educational content processor for ${context.circuit.grade === 'K' ? 'Kindergarten' : `Grade ${context.circuit.grade}`} material. 
            Extract key concepts, vocabulary, and learning objectives from the provided content. 
            Format the information in a way that can be used as reference material for student interactions.`,
          },
          {
            role: "user",
            content: content,
          },
        ],
        temperature: 0.3, // Lower temperature for more focused content processing
        max_tokens: 1000,
      });

      return response.choices[0].message.content || "";
    } catch (error) {
      console.error("OpenAI Content Processing Error:", error);
      throw new Error("Failed to process uploaded content. Please try again later.");
    }
  }
}
