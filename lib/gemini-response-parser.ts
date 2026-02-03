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
 * Extracts and parses JSON from a Gemini API response.
 * First extracts all text content, then finds and parses JSON object within.
 *
 * @param result - The GenerateContentResponse from the Gemini API
 * @returns Object with success status, parsed data (if successful), raw text, and error (if failed)
 */
export const extract_json_from_response = <T = Record<string, unknown>>(
  result: GenerateContentResponse
): JsonExtractionResult<T> => {
  const raw_text = extract_text_from_response(result);

  // Extract JSON object from response text
  const json_match = raw_text.match(/\{[\s\S]*\}/);
  if (!json_match) {
    return {
      success: false,
      raw_text,
      error: "No JSON found in response",
    };
  }

  try {
    const data = JSON.parse(json_match[0]) as T;
    return {
      success: true,
      data,
      raw_text,
    };
  } catch {
    return {
      success: false,
      raw_text,
      error: "Failed to parse JSON from response",
    };
  }
};
