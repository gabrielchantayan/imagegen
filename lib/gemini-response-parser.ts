import type { GenerateContentResponse } from "@google/genai";

/**
 * Result type for JSON extraction from Gemini responses
 */
export type JsonExtractionResult<T = Record<string, unknown>> = {
  success: true;
  data: T;
  raw_text: string;
} | {
  success: false;
  data?: undefined;
  raw_text: string;
  error: string;
};

/**
 * Extracts text content from a Gemini API response.
 * Concatenates text from all candidates and parts.
 *
 * @param result - The GenerateContentResponse from the Gemini API
 * @returns The concatenated text content
 */
export const extract_text_from_response = (
  result: GenerateContentResponse
): string => {
  let text = "";
  for (const candidate of result.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (part.text) {
        text += part.text;
      }
    }
  }
  return text;
};

/**
 * Attempts to find and parse a balanced JSON object from text.
 * Tracks brace nesting to find complete objects.
 */
const find_balanced_json = (text: string): string | null => {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let in_string = false;
  let escape_next = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (escape_next) {
      escape_next = false;
      continue;
    }

    if (char === "\\") {
      escape_next = true;
      continue;
    }

    if (char === '"') {
      in_string = !in_string;
      continue;
    }

    if (in_string) continue;

    if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
};

/**
 * Extracts and parses JSON from a Gemini API response.
 * First extracts all text content, then finds and parses JSON object within.
 * Handles markdown code blocks and finds balanced JSON objects.
 *
 * @param result - The GenerateContentResponse from the Gemini API
 * @returns Object with success status, parsed data (if successful), raw text, and error (if failed)
 */
export const extract_json_from_response = <T = Record<string, unknown>>(
  result: GenerateContentResponse
): JsonExtractionResult<T> => {
  const raw_text = extract_text_from_response(result);

  // First, try to extract from markdown code blocks (```json or ```)
  const code_block_match = raw_text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const text_to_parse = code_block_match ? code_block_match[1] : raw_text;

  // Find balanced JSON object
  const json_string = find_balanced_json(text_to_parse);
  if (!json_string) {
    console.error("[gemini-response-parser] No JSON found in response");
    console.error("[gemini-response-parser] Raw text:", raw_text);
    console.error("[gemini-response-parser] Text to parse:", text_to_parse);
    return {
      success: false,
      raw_text,
      error: "No JSON found in response",
    };
  }

  try {
    const data = JSON.parse(json_string) as T;
    return {
      success: true,
      data,
      raw_text,
    };
  } catch (parse_error) {
    // Include the actual parse error for debugging
    const error_msg =
      parse_error instanceof Error ? parse_error.message : "Unknown parse error";
    console.error("[gemini-response-parser] Failed to parse JSON:", error_msg);
    console.error("[gemini-response-parser] JSON string attempted:", json_string);
    console.error("[gemini-response-parser] Raw text:", raw_text);
    return {
      success: false,
      raw_text,
      error: `Failed to parse JSON from response: ${error_msg}`,
    };
  }
};
