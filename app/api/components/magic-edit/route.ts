
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { with_auth } from "@/lib/api-auth";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const POST = async (request: Request) => {
  return with_auth(async () => {
    try {
      const { current_json, instructions, category_name } = await request.json();

      if (!instructions) {
        return NextResponse.json({ error: "Instructions are required" }, { status: 400 });
      }

      const model = process.env.GEMINI_ANALYSIS_MODEL || "gemini-1.5-pro-latest";
      
      const prompt = `
You are an expert JSON editor for an image generation prompt builder.
Your task is to modify the provided JSON object based on the user's natural language instructions.

CONTEXT:
- Category: ${category_name}
- Current JSON:
${JSON.stringify(current_json, null, 2)}

INSTRUCTIONS:
${instructions}

RULES:
1. Return ONLY the modified valid JSON object. Do not include markdown formatting (like \`\`\`json).
2. Maintain the existing structure and keys unless explicitly asked to change them.
3. If the instructions imply adding new visual details, add them to appropriate fields (e.g., "description", "details", "appearance").
4. Ensure the result is valid JSON.
`;

      const result = await genAI.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      let response_text = "";
      if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts) {
          for (const part of result.candidates[0].content.parts) {
              if (part.text) {
                  response_text += part.text;
              }
          }
      }

      if (!response_text) {
          throw new Error("No text response from Gemini");
      }
      
      // Clean up potential markdown formatting
      const clean_json = response_text.replace(/```json\n?|\n?```/g, "").trim();
      
      let modified_json;
      try {
        modified_json = JSON.parse(clean_json);
      } catch (e) {
        console.error("JSON Parse Error:", e);
        console.log("Raw Response:", response_text);
        
        // Fallback: try to find JSON object if there's extra text
        const jsonMatch = response_text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                modified_json = JSON.parse(jsonMatch[0]);
            } catch (e2) {
                 return NextResponse.json(
                    { error: "Failed to parse LLM response as JSON", raw: response_text },
                    { status: 500 }
                 );
            }
        } else {
             return NextResponse.json(
                { error: "Failed to parse LLM response as JSON", raw: response_text },
                { status: 500 }
             );
        }
      }

      return NextResponse.json({ json: modified_json });
    } catch (error) {
      console.error("Magic Edit Error:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      );
    }
  });
};
