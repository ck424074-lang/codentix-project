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
}

export interface DetailedScores {
  quality: number;
  readability: number;
  optimization: number;
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

export async function reviewCode(
  code: string, 
  language: string, 
  mode: ReviewMode = "industry",
  targetLanguage?: string
): Promise<CodeReviewResult> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const modeInstructions = {
    student: "Focus on beginner-friendly explanations, explaining basic concepts, and simplifying logic for a 1st-year student.",
    interview: "Focus on FAANG standards, competitive coding style, optimal time/space complexity, and edge case handling.",
    industry: "Focus on production-ready code, clean architecture, scalability, robust error handling, and industry best practices."
  };

  const isAuto = language === "auto";
  const isConversion = targetLanguage && targetLanguage !== "none" && targetLanguage !== language;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Review the following code. 
    ${isAuto ? "First, detect the programming language of the code." : `Source Language: ${language}`}
    ${isConversion ? `TARGET LANGUAGE FOR CONVERSION: ${targetLanguage}. You MUST convert the code to ${targetLanguage} while optimizing it.` : ""}
    Mode: ${mode.toUpperCase()} - ${modeInstructions[mode]}
    
    Tasks:
    1. ${isAuto ? "Identify the source programming language." : ""}
    2. Identify bugs, performance issues, best-practice violations, and security vulnerabilities in the original code.
    3. Provide a CORRECTED and optimized version of the code${isConversion ? ` CONVERTED to ${targetLanguage}` : ""}. **CRITICAL: If the original code contains errors, fix them based on the issues identified. Make the resulting code as small, simple, and effective as possible. Utilize modern language features to reduce verbosity, eliminate redundant logic, and ensure optimal performance without sacrificing readability.**
    4. Provide a detailed explanation of changes and the conversion process. **CRITICAL: Structure the output in a highly readable manner using multiple lines, bullet points, and Markdown headers (###). Break down the conversion step-by-step.**
    5. Generate professional documentation (Docstrings/README format) for the ${isConversion ? targetLanguage : "optimized"} code. **Use structured Markdown with clear sections.**
    6. Analyze Time and Space complexity of the ${isConversion ? "converted" : "optimized"} code.
    7. Provide detailed scores (0-10) for Quality, Readability, and Optimization.

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
            },
            required: ["quality", "readability", "optimization"],
          },
          complexity: {
            type: Type.OBJECT,
            properties: {
              time: { type: Type.STRING },
              space: { type: Type.STRING },
            },
            required: ["time", "space"],
          },
        },
        required: ["detectedLanguage", "issues", "optimizedCode", "explanation", "documentation", "overallScore", "detailedScores", "complexity"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  
  return JSON.parse(text) as CodeReviewResult;
}
