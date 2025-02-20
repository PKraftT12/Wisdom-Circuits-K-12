import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateCircuitDescription(name: string, grade: string): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured");
    }

    console.log('Calling OpenAI API with:', { name, grade });
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert educational content creator who specializes in creating grade-appropriate descriptions for educational subjects. Keep descriptions concise (2-3 sentences) and engaging for the specified grade level."
        },
        {
          role: "user",
          content: `Create a brief, grade-appropriate description for a ${grade} level course named "${name}". The description should explain what students will learn and why it's exciting.`
        }
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    if (!response.choices[0]?.message?.content) {
      throw new Error("No description generated");
    }

    console.log('OpenAI API response:', response.choices[0].message);
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating description:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate description: ${error.message}`);
    }
    throw new Error("Failed to generate description. Please try again.");
  }
}