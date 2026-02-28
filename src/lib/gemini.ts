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

export type ReviewMode = "student" | "interview" | "industry";
export type ImplementationStyle = "default" | "functional" | "recursive" | "flat";
export type ModelType = "gemini-3-flash-preview" | "gemini-3.1-pro-preview" | "claude-4" | "gpt-5" | "microsoft-copilot" | "github-copilot";
export type VerbosityLevel = "concise" | "normal" | "detailed";
export type ToneStyle = "professional" | "casual" | "encouraging";

function mapModel(model: ModelType): string {
  switch (model) {
    case "claude-4": return "gemini-3-flash-preview";
    case "gpt-5": return "gemini-3.1-pro-preview";
    case "microsoft-copilot": return "gemini-3.1-pro-preview";
    case "github-copilot": return "gemini-3.1-pro-preview";
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
      4. In the \`explanation\` field, you MUST follow this exact structure using multi-line Markdown:
         
         ### 🔍 Phase 1: Mandatory Correction (P0)
         **Root Cause Analysis:**
         [Provide a detailed, multi-line explanation of why the code failed or is suboptimal.]
         
         **### 🛠️ CORRECTED CODE**
         \`\`\`${targetLanguage && targetLanguage !== "none" ? targetLanguage : language}
         [Provide the hotfix code here]
         \`\`\`
         
         ### 🚀 Phase 2: Triple Optimization (P1)
         
         #### Option 1: Clean/Readable
         [Explain the approach]
         \`\`\`${targetLanguage && targetLanguage !== "none" ? targetLanguage : language}
         [Code for Option 1]
         \`\`\`
         
         #### Option 2: High Performance
         [Explain the approach]
         \`\`\`${targetLanguage && targetLanguage !== "none" ? targetLanguage : language}
         [Code for Option 2]
         \`\`\`
         
         #### Option 3: Modern Agentic
         [Explain the approach]
         \`\`\`${targetLanguage && targetLanguage !== "none" ? targetLanguage : language}
         [Code for Option 3]
         \`\`\`
         
      5. Generate professional documentation (Docstrings/README format) for the ${isConversion ? targetLanguage : "optimized"} code in the \`documentation\` field. **Use structured multi-line Markdown with clear sections (e.g., Overview, Parameters, Returns, Examples).**
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
      systemInstruction: `You are a helpful AI coding assistant. Your goal is to answer the user's questions about the provided code snippet.
      
      Provide clear, concise, and accurate answers. If the user asks for explanations, explain the logic step-by-step. If they ask for improvements, suggest them.
      
      ${errorLog ? `The user also provided the following ERROR/BUG LOG for context:\n${errorLog}\n` : ""}
      
      CURRENT CODE IN EDITOR:
      \`\`\`
      ${code}
      \`\`\``,
    },
    history: history,
  });

  const response = await chat.sendMessage({ message: question });
  return response.text || "I'm sorry, I couldn't generate a response.";
}
