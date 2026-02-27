import React, { useState, useEffect, useRef } from "react";
import { 
  Code2, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  ShieldAlert, 
  ChevronRight, 
  Copy, 
  RefreshCw,
  LayoutDashboard,
  FileCode,
  Info,
  Sparkles,
  ArrowRight,
  Download,
  GraduationCap,
  Briefcase,
  Terminal,
  BarChart3,
  FileText,
  Split
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-css";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-java";

import { reviewCode, type CodeReviewResult, type CodeIssue, type ReviewMode } from "./lib/gemini.ts";
import { cn } from "./lib/utils.ts";

const SAMPLE_CODE = `function calculateTotal(items) {
  let total = 0;
  for (var i = 0; i < items.length; i++) {
    total = total + items[i].price;
  }
  
  // Potential bug: what if items is null?
  return total;
}

// Performance issue: repeated DOM access in a loop
function updateList(data) {
  for (let i = 0; i < data.length; i++) {
    document.getElementById('list').innerHTML += '<li>' + data[i] + '</li>';
  }
}`;

export default function App() {
  const [code, setCode] = useState(SAMPLE_CODE);
  const [language, setLanguage] = useState("auto");
  const [targetLanguage, setTargetLanguage] = useState("none");
  const [mode, setMode] = useState<ReviewMode>("industry");
  const [isReviewing, setIsReviewing] = useState(false);
  const [result, setResult] = useState<CodeReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"issues" | "optimized" | "explanation" | "documentation">("issues");
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Prism.highlightAll();
  }, [result, activeTab]);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.currentTarget.scrollTop;
      highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleReview = async () => {
    if (!code.trim()) return;
    
    setIsReviewing(true);
    setError(null);
    try {
      const res = await reviewCode(code, language, mode, targetLanguage);
      setResult(res);
      setActiveTab("issues");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsReviewing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadCode = () => {
    if (!result) return;
    const blob = new Blob([result.optimizedCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const lang = targetLanguage !== "none" ? targetLanguage : (result.detectedLanguage || language);
    const ext = {
      javascript: "js",
      typescript: "ts",
      python: "py",
      c: "c",
      cpp: "cpp",
      java: "java",
      css: "css"
    }[lang] || "txt";
    a.href = url;
    a.download = `optimized_code.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0B]">
      {/* Header */}
      <header className="h-16 border-bottom border-zinc-800 flex items-center justify-between px-6 bg-[#0D0D0E] sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">CodeRefine</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">AI Optimization Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Convert to:</span>
            <select 
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500/50 transition-colors"
            >
              <option value="none">None (Review Only)</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="c">C</option>
            </select>
          </div>

          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            <ModeButton 
              active={mode === "student"} 
              onClick={() => setMode("student")} 
              icon={GraduationCap} 
              label="Student" 
            />
            <ModeButton 
              active={mode === "interview"} 
              onClick={() => setMode("interview")} 
              icon={Terminal} 
              label="Interview" 
            />
            <ModeButton 
              active={mode === "industry"} 
              onClick={() => setMode("industry")} 
              icon={Briefcase} 
              label="Industry" 
            />
          </div>

          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500/50 transition-colors"
          >
            <option value="auto">Auto Detect</option>
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="css">CSS</option>
            <option value="c">C</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
          </select>
          
          <button
            onClick={handleReview}
            disabled={isReviewing}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              isReviewing 
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" 
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 active:scale-95"
            )}
          >
            {isReviewing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            {isReviewing ? "Refining..." : "Refactor & Review"}
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-16 border-right border-zinc-800 flex flex-col items-center py-6 gap-6 bg-[#0D0D0E]">
          <SidebarIcon icon={LayoutDashboard} active />
          <SidebarIcon icon={FileCode} />
          <SidebarIcon icon={BarChart3} />
          <SidebarIcon icon={ShieldAlert} />
          <div className="mt-auto">
            <SidebarIcon icon={Info} />
          </div>
        </div>

        {/* Editor & Results */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Input Panel */}
          <div className="flex-1 flex flex-col border-right border-zinc-800 bg-[#0A0A0B]">
            <div className="h-10 border-bottom border-zinc-800 flex items-center px-4 justify-between bg-[#0D0D0E]/50">
              <div className="flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[11px] font-mono text-zinc-400">
                  source_code.{
                    (result?.detectedLanguage || language) === 'python' ? 'py' : 
                    (result?.detectedLanguage || language) === 'javascript' ? 'js' : 
                    (result?.detectedLanguage || language) === 'typescript' ? 'ts' : 
                    (result?.detectedLanguage || language) === 'c' ? 'c' : 
                    (result?.detectedLanguage || language) === 'cpp' ? 'cpp' : 
                    (result?.detectedLanguage || language) === 'java' ? 'java' : 
                    'txt'
                  }
                </span>
              </div>
              <button 
                onClick={() => setCode("")}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-wider font-bold"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 relative overflow-hidden flex">
              {/* Line Numbers Gutter */}
              <div 
                ref={gutterRef}
                className="w-12 bg-[#0D0D0E]/30 border-r border-zinc-800/50 flex flex-col pt-6 text-right pr-3 select-none font-mono text-[10px] text-zinc-600 leading-[24px] overflow-hidden"
              >
                {code.split('\n').map((_, i) => {
                  const hasIssue = result?.issues.some(issue => issue.line === i + 1);
                  return (
                    <div key={i} className={cn(
                      "h-[24px]",
                      hasIssue && "text-emerald-500 font-bold"
                    )}>
                      {i + 1}
                    </div>
                  );
                })}
              </div>

              <div className="flex-1 relative overflow-hidden">
                {/* Highlights Layer */}
                <div 
                  ref={highlightRef}
                  className="absolute inset-0 p-6 pointer-events-none font-mono text-sm leading-[24px] whitespace-pre overflow-hidden text-transparent"
                >
                  {code.split('\n').map((line, i) => {
                    const lineIssues = result?.issues.filter(issue => issue.line === i + 1) || [];
                    const hasIssue = lineIssues.length > 0;
                    const severity = hasIssue ? [...lineIssues].sort((a, b) => {
                      const order: Record<string, number> = { critical: 3, high: 2, medium: 1, low: 0 };
                      return order[b.severity] - order[a.severity];
                    })[0].severity : null;

                    return (
                      <div 
                        key={i} 
                        className={cn(
                          "h-[24px] w-full rounded-sm transition-colors duration-200",
                          severity === 'critical' && "bg-red-500/15",
                          severity === 'high' && "bg-orange-500/15",
                          severity === 'medium' && "bg-amber-500/15",
                          severity === 'low' && "bg-blue-500/15",
                          hoveredLine === i + 1 && "bg-zinc-700/30 border-y border-zinc-700/50"
                        )}
                      >
                        {line || ' '}
                      </div>
                    );
                  })}
                </div>

                <textarea
                  ref={textareaRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onScroll={handleScroll}
                  spellCheck={false}
                  className="absolute inset-0 w-full h-full p-6 bg-transparent text-zinc-300 font-mono text-sm resize-none outline-none leading-[24px] code-editor z-10"
                  placeholder="Paste your code here..."
                />
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="flex-1 flex flex-col bg-[#0D0D0E]/30 overflow-hidden">
            {!result && !isReviewing && !error && (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-20 h-20 bg-emerald-500/5 rounded-full flex items-center justify-center mb-6 border border-emerald-500/10">
                  <Sparkles className="w-10 h-10 text-emerald-500/40" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">CodeRefine AI</h2>
                <p className="text-zinc-500 max-w-sm text-sm mb-8">
                  Transform raw code into production-ready, optimized, and documented software in seconds.
                </p>
                <div className="grid grid-cols-2 gap-4 max-w-md w-full">
                  <FeatureCard icon={Zap} title="Optimization" desc="Improve time complexity" />
                  <FeatureCard icon={Info} title="Explanation" desc="Beginner-friendly logic" />
                  <FeatureCard icon={BarChart3} title="Complexity" desc="Time & Space analysis" />
                  <FeatureCard icon={FileText} title="Documentation" desc="Auto-generate docstrings" />
                </div>
              </div>
            )}

            {isReviewing && (
              <div className="flex-1 flex flex-col items-center justify-center p-12">
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-emerald-500 animate-pulse" />
                  </div>
                </div>
                <h2 className="text-lg font-medium text-white mt-8 mb-2">Analyzing & Refactoring</h2>
                <p className="text-zinc-500 text-sm animate-pulse">Running {mode} mode analysis...</p>
              </div>
            )}

            {error && (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">Analysis Failed</h2>
                <p className="text-red-400/80 text-sm max-w-sm mb-6">{error}</p>
                <button 
                  onClick={handleReview}
                  className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {result && !isReviewing && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Result Header */}
                <div className="p-6 border-bottom border-zinc-800 bg-[#0D0D0E]/50">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex gap-6">
                      <ScoreDisplay label="Quality" score={result.detailedScores.quality} />
                      <ScoreDisplay label="Readability" score={result.detailedScores.readability} />
                      <ScoreDisplay label="Optimization" score={result.detailedScores.optimization} />
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Complexity</div>
                      <div className="flex gap-3">
                        <ComplexityBadge label="Time" value={result.complexity.time} />
                        <ComplexityBadge label="Space" value={result.complexity.space} />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1 p-1 bg-zinc-900/50 rounded-xl border border-zinc-800">
                    <TabButton 
                      active={activeTab === "issues"} 
                      onClick={() => setActiveTab("issues")}
                      label="Issues"
                      count={result.issues.length}
                    />
                    <TabButton 
                      active={activeTab === "optimized"} 
                      onClick={() => setActiveTab("optimized")}
                      label={targetLanguage !== "none" ? "Converted" : "Optimized"}
                    />
                    <TabButton 
                      active={activeTab === "explanation"} 
                      onClick={() => setActiveTab("explanation")}
                      label="Explanation"
                    />
                    <TabButton 
                      active={activeTab === "documentation"} 
                      onClick={() => setActiveTab("documentation")}
                      label="Docs"
                    />
                  </div>
                </div>

                {/* Result Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  <AnimatePresence mode="wait">
                    {activeTab === "issues" && (
                      <motion.div 
                        key="issues"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                      >
                        {result.issues.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500/40 mb-4" />
                            <h3 className="text-white font-medium">No issues found!</h3>
                            <p className="text-zinc-500 text-sm">Your code looks clean and well-optimized.</p>
                          </div>
                        ) : (
                          result.issues.map((issue, idx) => (
                            <IssueCard 
                              key={idx} 
                              issue={issue} 
                              onMouseEnter={() => issue.line && setHoveredLine(issue.line)}
                              onMouseLeave={() => setHoveredLine(null)}
                            />
                          ))
                        )}
                      </motion.div>
                    )}

                    {activeTab === "optimized" && (
                      <motion.div 
                        key="optimized"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="relative"
                      >
                        <div className="absolute top-4 right-4 flex gap-2 z-10">
                          <button 
                            onClick={() => copyToClipboard(result.optimizedCode)}
                            className="p-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition-colors"
                            title="Copy Code"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={downloadCode}
                            className="p-2 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded-lg border border-emerald-500/20 transition-colors"
                            title="Download Code"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                        <pre className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-x-auto">
                          <code className={`language-${targetLanguage !== "none" ? targetLanguage : (result.detectedLanguage || language)}`}>
                            {result.optimizedCode}
                          </code>
                        </pre>
                      </motion.div>
                    )}

                    {activeTab === "explanation" && (
                      <motion.div 
                        key="explanation"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="markdown-body"
                      >
                        <ReactMarkdown>{result.explanation}</ReactMarkdown>
                      </motion.div>
                    )}

                    {activeTab === "documentation" && (
                      <motion.div 
                        key="documentation"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="markdown-body"
                      >
                        <ReactMarkdown>{result.documentation}</ReactMarkdown>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ModeButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all",
        active 
          ? "bg-zinc-800 text-white shadow-sm" 
          : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      <Icon className={cn("w-3.5 h-3.5", active ? "text-emerald-400" : "text-zinc-600")} />
      {label}
    </button>
  );
}

function ScoreDisplay({ label, score }: { label: string, score: number }) {
  return (
    <div>
      <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={cn(
          "text-xl font-bold tabular-nums",
          score >= 8 ? "text-emerald-400" : score >= 5 ? "text-amber-400" : "text-red-400"
        )}>{score}</span>
        <span className="text-[10px] text-zinc-600">/10</span>
      </div>
    </div>
  );
}

function ComplexityBadge({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[9px] text-zinc-600 uppercase font-bold">{label}</span>
      <span className="text-xs font-mono text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">{value}</span>
    </div>
  );
}

function SidebarIcon({ icon: Icon, active = false }: { icon: any, active?: boolean }) {
  return (
    <div className={cn(
      "w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer",
      active 
        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
        : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50"
    )}>
      <Icon className="w-5 h-5" />
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-left hover:border-zinc-700 transition-colors">
      <Icon className="w-5 h-5 text-emerald-500/60 mb-3" />
      <h3 className="text-sm font-medium text-zinc-200 mb-1">{title}</h3>
      <p className="text-[11px] text-zinc-500 leading-tight">{desc}</p>
    </div>
  );
}

function TabButton({ active, onClick, label, count }: { active: boolean, onClick: () => void, label: string, count?: number }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all",
        active 
          ? "bg-zinc-800 text-white shadow-sm" 
          : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      {label}
      {count !== undefined && (
        <span className={cn(
          "px-1.5 py-0.5 rounded-md text-[10px] font-bold",
          active ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-600"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

function IssueCard({ 
  issue, 
  onMouseEnter, 
  onMouseLeave 
}: { 
  issue: CodeIssue, 
  onMouseEnter?: () => void, 
  onMouseLeave?: () => void 
}) {
  const severityColors: Record<string, string> = {
    low: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    medium: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    high: "text-orange-400 bg-orange-400/10 border-orange-400/20",
    critical: "text-red-400 bg-red-400/10 border-red-400/20",
  };

  const typeIcons: Record<string, any> = {
    bug: AlertCircle,
    performance: Zap,
    "best-practice": CheckCircle2,
    security: ShieldAlert,
  };

  const Icon = typeIcons[issue.type?.toLowerCase()] || AlertCircle;
  const severityColor = severityColors[issue.severity?.toLowerCase()] || severityColors.medium;

  return (
    <div 
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all group cursor-default"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", severityColor)}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">{issue.type?.replace('-', ' ') || 'Issue'}</span>
              <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border", severityColor)}>
                {issue.severity || 'Medium'}
              </span>
            </div>
            {issue.line && (
              <span className="text-[10px] text-zinc-600 font-mono mt-0.5 block">Line {issue.line}</span>
            )}
          </div>
        </div>
      </div>
      
      <p className="text-sm text-zinc-300 mb-4 leading-relaxed">{issue.description}</p>
      
      <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800/50">
        <div className="flex items-center gap-2 mb-2">
          <ArrowRight className="w-3 h-3 text-emerald-400" />
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Recommendation</span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed italic">"{issue.suggestion}"</p>
      </div>
    </div>
  );
}
