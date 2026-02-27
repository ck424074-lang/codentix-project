import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export interface CodeIssue {
  type: "bug" | "performance" | "best-practice" | "security";
  severity: "low" | "medium" | "high" | "critical";
  line?: number;
  description: string;
  suggestion: string;
}

export interface ComplexityAnalysis {
  time: string;
  space: string;
  cyclomatic: number;
}

export interface DetailedScores {
  quality: number;
  readability: number;
  optimization: number;
  security: number;
  technicalDebt: number;
  styleConsistency: number;
}

export interface CodeReviewResult {
  issues: CodeIssue[];
  optimizedCode: string;
  explanation: string;
  documentation: string;
  overallScore: number;
  detailedScores: DetailedScores;
  complexity: ComplexityAnalysis;
  detectedLanguage: string;
}

export interface VibeCodingResult {
  explanation: string;
  modifiedFiles: { name: string; content: string }[];
  dependencyGraph: string;
}

export type ReviewMode = "student" | "interview" | "industry";
export type ImplementationStyle = "default" | "functional" | "recursive" | "flat";
export type ModelType = "gemini-3-flash-preview" | "gemini-3.1-pro-preview" | "claude-4" | "gpt-5";
export type VerbosityLevel = "concise" | "normal" | "detailed";
export type ToneStyle = "professional" | "casual" | "encouraging";

function mapModel(model: ModelType): string {
  switch (model) {
    case "claude-4": return "gemini-3-flash-preview";
    case "gpt-5": return "gemini-3.1-pro-preview";
    default: return model;
  }
}

export async function reviewCode(
  code: string, 
  language: string, 
  mode: ReviewMode = "industry",
  targetLanguage?: string,
  style: ImplementationStyle = "default",
  model: ModelType = "gemini-3-flash-preview",
  errorLog: string = "",
  houseStyle: string = "",
  verbosity: VerbosityLevel = "normal",
  tone: ToneStyle = "professional"
): Promise<CodeReviewResult> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({ apiKey });
  const actualModel = mapModel(model);
  
  const modeInstructions = {
    student: "Focus on beginner-friendly explanations, explaining basic concepts, and simplifying logic for a 1st-year student.",
    interview: "Focus on FAANG standards, competitive coding style, optimal time/space complexity, and edge case handling.",
    industry: "Focus on production-ready code, clean architecture, scalability, robust error handling, and industry best practices."
  };

  const isAuto = language === "auto";
  const isConversion = targetLanguage && targetLanguage !== "none" && targetLanguage !== language;

  const styleInstructions = {
    default: "Use the most idiomatic and effective implementation style for the target language.",
    functional: "Prioritize a functional programming style (e.g., pure functions, immutability, higher-order functions like map/filter/reduce).",
    recursive: "Prioritize using recursion for any repetitive or iterative logic where appropriate.",
    flat: "Write the code in a flat, procedural style WITHOUT using any functions or recursions. Use simple loops and global/local variables directly in the main execution flow."
  };

  try {
    const response = await ai.models.generateContent({
      model: actualModel,
      contents: `You are a dual-stage AI Refinement Agent. Your goal is to process a code snippet AND its corresponding error/bug log to produce exactly two distinct sections: CORRECTION and OPTIMIZATION.

      Review the following code. 
      ${isAuto ? "First, detect the programming language of the code." : `Source Language: ${language}`}
      ${isConversion ? `TARGET LANGUAGE FOR CONVERSION: ${targetLanguage}. You MUST convert the code to ${targetLanguage} while optimizing it.` : ""}
      Mode: ${mode.toUpperCase()} - ${modeInstructions[mode]}
      Implementation Style: ${style.toUpperCase()} - ${styleInstructions[style]}
      Verbosity: ${verbosity.toUpperCase()} - ${verbosity === "concise" ? "Keep explanations short and to the point." : verbosity === "detailed" ? "Provide in-depth explanations, covering all edge cases and reasoning." : "Provide standard, balanced explanations."}
      Tone: ${tone.toUpperCase()} - ${tone === "casual" ? "Use a friendly, conversational tone." : tone === "encouraging" ? "Be highly supportive, positive, and encouraging." : "Maintain a formal, objective, and professional tone."}
      
      ${errorLog ? `ERROR/BUG LOG:\n${errorLog}\n` : "No error log provided. Please infer potential errors from the code itself."}
      ${houseStyle ? `HOUSE STYLE GUIDELINES:\n${houseStyle}\n` : "No specific house style provided. Follow general industry best practices."}
      
      Tasks:
      1. ${isAuto ? "Identify the source programming language." : ""}
      2. Identify bugs, performance issues, best-practice violations, and security vulnerabilities (e.g., SQL injection, XSS, hardcoded secrets) in the original code.
      3. Provide the best overall optimized/corrected code in the \`optimizedCode\` field. Ensure it strictly adheres to the HOUSE STYLE GUIDELINES if provided.
      4. In the \`explanation\` field, you MUST follow this exact structure:
         - Phase 1: Mandatory Correction (P0)
           - Provide a 1-sentence "Root Cause Analysis" explaining why it failed (based on the error log or obvious bugs).
           - Provide a block titled "### 🛠️ CORRECTED CODE" containing a hotfix that solves the bug while changing as little of the original logic as possible.
         - Phase 2: Triple Optimization (P1)
           - Provide a block titled "### 🚀 OPTIMIZED VERSIONS" with exactly three variants:
             1. **Option 1: Clean/Readable** (Focus on naming, comments, and simplicity).
             2. **Option 2: High Performance** (Focus on time complexity O(n) and memory).
             3. **Option 3: Modern Agentic** (Focus on 2026 best practices like immutability or specific framework hooks).
      5. Generate professional documentation (Docstrings/README format) for the ${isConversion ? targetLanguage : "optimized"} code. **Use structured Markdown with clear sections.**
      6. Analyze Time, Space, and Cyclomatic complexity of the ${isConversion ? "converted" : "optimized"} code.
      7. Provide detailed scores (0-10) for Quality, Readability, Optimization, Security, Technical Debt (10 = no debt, 0 = high debt), and Style Consistency.

      Code to review:
      \`\`\`
      ${code}
      \`\`\``,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedLanguage: { type: Type.STRING, description: "The programming language of the code (e.g., javascript, python, java, c, cpp, css)" },
            issues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  severity: { type: Type.STRING },
                  line: { type: Type.NUMBER },
                  description: { type: Type.STRING },
                  suggestion: { type: Type.STRING },
                },
                required: ["type", "severity", "description", "suggestion"],
              },
            },
            optimizedCode: { type: Type.STRING },
            explanation: { type: Type.STRING },
            documentation: { type: Type.STRING },
            overallScore: { type: Type.NUMBER },
            detailedScores: {
              type: Type.OBJECT,
              properties: {
                quality: { type: Type.NUMBER },
                readability: { type: Type.NUMBER },
                optimization: { type: Type.NUMBER },
                security: { type: Type.NUMBER },
                technicalDebt: { type: Type.NUMBER },
                styleConsistency: { type: Type.NUMBER },
              },
              required: ["quality", "readability", "optimization", "security", "technicalDebt", "styleConsistency"],
            },
            complexity: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING },
                space: { type: Type.STRING },
                cyclomatic: { type: Type.NUMBER },
              },
              required: ["time", "space", "cyclomatic"],
            },
          },
          required: ["detectedLanguage", "issues", "optimizedCode", "explanation", "documentation", "overallScore", "detailedScores", "complexity"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("The AI model returned an empty response. Please try again.");
    }
    
    try {
      return JSON.parse(text) as CodeReviewResult;
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", text);
      throw new Error("Failed to process the AI's response. The generated content was not in the expected format.");
    }
  } catch (apiError: any) {
    console.error("Gemini API Error:", apiError);
    
    // Handle specific error cases if possible
    if (apiError.message?.includes("API key")) {
      throw new Error("Invalid API key configuration. Please check your environment variables.");
    }
    
    if (apiError.message?.includes("safety")) {
      throw new Error("The code review was blocked by safety filters. Please ensure your code follows safety guidelines.");
    }

    if (apiError.message?.includes("quota") || apiError.message?.includes("429")) {
      throw new Error("API quota exceeded or too many requests. Please wait a moment before trying again.");
    }

    throw new Error(apiError.message || "An error occurred while communicating with the AI. Please check your connection and try again.");
  }
}

export async function chatWithCode(
  code: string,
  question: string,
  history: { role: "user" | "model", parts: { text: string }[] }[] = [],
  model: ModelType = "gemini-3-flash-preview",
  errorLog: string = ""
): Promise<string> {
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const ai = new GoogleGenAI({ apiKey });
  const actualModel = mapModel(model);

  const chat = ai.chats.create({
    model: actualModel,
    config: {
      systemInstruction: `You are a dual-stage AI Refinement Agent. Your goal is to process a code snippet AND its corresponding error/bug log to produce exactly two distinct sections: CORRECTION and OPTIMIZATION.
      
      Phase 1: Mandatory Correction (P0)
      1. First, analyze the provided error_log (if any) or the user's issue.
      2. Identify the single line or block causing the failure.
      3. Provide a block titled "### 🛠️ CORRECTED CODE" (hotfix, minimal changes).
      4. Provide a 1-sentence "Root Cause Analysis".
      
      Phase 2: Triple Optimization (P1)
      Only after providing the correction, generate "### 🚀 OPTIMIZED VERSIONS" with exactly three variants:
      1. Option 1: Clean/Readable
      2. Option 2: High Performance
      3. Option 3: Modern Agentic
      
      Guardrails:
      - NEVER skip the Correction phase.
      - If no error log is provided, ask for it before optimizing.
      
      ${errorLog ? `ERROR/BUG LOG:\n${errorLog}\n` : ""}
      
      CONTEXT CODE:
      \`\`\`
      ${code}
      \`\`\``,
    },
    history: history,
  });

  const response = await chat.sendMessage({ message: question });
  return response.text || "I'm sorry, I couldn't generate a response.";
}

export async function vibeCode(
  intent: string,
  files: { name: string; content: string }[],
  model: ModelType = "gemini-3.1-pro-preview"
): Promise<VibeCodingResult> {
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const ai = new GoogleGenAI({ apiKey });
  const actualModel = mapModel(model);

  const filesContext = files.map(f => `--- FILE: ${f.name} ---\n\`\`\`\n${f.content}\n\`\`\``).join("\n\n");

  try {
    const response = await ai.models.generateContent({
      model: actualModel,
      contents: `You are a Repository-Wide Contextual Intelligence Agent.
      Your goal is to perform "Vibe Coding" and Cross-File Refactoring based on the user's high-level intent.
      
      USER INTENT: "${intent}"
      
      WORKSPACE FILES:
      ${filesContext}
      
      Tasks:
      1. Analyze the relationships between the provided files (Graph-Based Code Mapping).
      2. Identify which files need to be modified to fulfill the user's intent.
      3. Perform the necessary cross-file refactoring, ensuring type safety and consistency across the project.
      4. Return a JSON object containing:
         - \`explanation\`: A detailed explanation of the changes made and how they propagate across the files.
         - \`dependencyGraph\`: A markdown representation (e.g., a bulleted list or mermaid.js syntax if applicable) of the dependency graph between the files.
         - \`modifiedFiles\`: An array of objects, each containing the \`name\` of the modified file and its new \`content\`. Only include files that were actually changed or newly created.

      CRITICAL: You MUST return valid JSON matching the schema.`,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING },
            dependencyGraph: { type: Type.STRING },
            modifiedFiles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  content: { type: Type.STRING },
                },
                required: ["name", "content"],
              },
            },
          },
          required: ["explanation", "dependencyGraph", "modifiedFiles"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI.");
    
    return JSON.parse(text) as VibeCodingResult;
  } catch (apiError: any) {
    console.error("Vibe Coding Error:", apiError);
    throw new Error(apiError.message || "An error occurred during Vibe Coding.");
  }
}
