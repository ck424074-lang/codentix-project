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
  Split,
  Github,
  Globe,
  MessageSquare,
  Mic,
  MicOff,
  Send,
  Cpu,
  X,
  Plus,
  FolderTree,
  Network,
  Settings,
  History
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

import { 
  reviewCode, 
  chatWithCode,
  type CodeReviewResult, 
  type CodeIssue, 
  type ReviewMode, 
  type ImplementationStyle,
  type ModelType,
  type VerbosityLevel,
  type ToneStyle
} from "./lib/gemini.ts";
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
  const [showLanding, setShowLanding] = useState(true);
  
  // Workspace State
  const [files, setFiles] = useState<{name: string, content: string}[]>([
    { name: "main.js", content: SAMPLE_CODE },
    { name: "utils.js", content: "// Utility functions\nexport function formatPrice(p) {\n  return `$${p}`;\n}" }
  ]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const code = files[activeFileIndex]?.content || "";
  const setCode = (newContent: string) => {
    const newFiles = [...files];
    newFiles[activeFileIndex].content = newContent;
    setFiles(newFiles);
  };

  const [language, setLanguage] = useState("auto");
  const [targetLanguage, setTargetLanguage] = useState("none");
  const [mode, setMode] = useState<ReviewMode>("industry");
  const [style, setStyle] = useState<ImplementationStyle>("default");
  const [model, setModel] = useState<ModelType>("gemini-3-flash-preview");
  const [isReviewing, setIsReviewing] = useState(false);
  const [result, setResult] = useState<CodeReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorLog, setErrorLog] = useState("");
  const [showErrorLog, setShowErrorLog] = useState(false);
  const [houseStyle, setHouseStyle] = useState("");
  const [verbosity, setVerbosity] = useState<VerbosityLevel>("normal");
  const [tone, setTone] = useState<ToneStyle>("professional");
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<"issues" | "optimized" | "explanation" | "documentation" | "chat">("issues");
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "model", text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // Voice State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

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

  const scrollToLine = (line: number) => {
    if (textareaRef.current) {
      const lineHeight = 24; // leading-[24px]
      // Scroll to the line, centering it slightly if possible
      textareaRef.current.scrollTo({
        top: Math.max(0, (line - 1) * lineHeight - 100),
        behavior: 'smooth'
      });
      setHoveredLine(line);
      
      // Briefly highlight the line
      setTimeout(() => setHoveredLine(null), 2000);
    }
  };

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      setHistoryData(data);
    } catch (e) {
      console.error("Failed to load history", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleReview = async () => {
    if (!code.trim()) return;
    
    setIsReviewing(true);
    setError(null);
    try {
      const res = await reviewCode(code, language, mode, targetLanguage, style, model, errorLog, houseStyle, verbosity, tone);
      setResult(res);
      setActiveTab("issues");

      // Save to history
      try {
        await fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalCode: code,
            improvedCode: res.optimizedCode,
            language: res.detectedLanguage || language,
            complexity: res.complexity
          })
        });
      } catch (e) {
        console.error("Failed to save history:", e);
      }

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

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setIsChatLoading(true);

    try {
      const history = chatMessages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const response = await chatWithCode(code, userMessage, history, model, errorLog);
      setChatMessages(prev => [...prev, { role: "model", text: response }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: "model", text: "Error: Failed to get response from AI." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const toggleListening = async () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    try {
      // Request microphone permission first, which works better in cross-origin iframes
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // We don't need to keep the stream, just needed the permission
      stream.getTracks().forEach(track => track.stop());
    } catch (err: any) {
      console.error("Microphone permission denied:", err);
      if (err.name === 'NotFoundError' || err.message?.includes('device not found')) {
        alert("No microphone found. Please ensure a microphone is connected to your device.");
      } else {
        alert("Microphone access is denied. Please allow microphone access in your browser settings to use voice commands.");
      }
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (event.error === 'not-allowed') {
        alert("Microphone access is denied by Speech Recognition. Please allow microphone access in your browser settings.");
      }
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.toLowerCase().includes("refactor") || transcript.toLowerCase().includes("review")) {
        handleReview();
      } else {
        if (activeTab === "chat") {
          setChatInput(transcript);
        } else {
          console.log("Voice command:", transcript);
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const addFile = () => {
    const newName = `file${files.length + 1}.js`;
    setFiles([...files, { name: newName, content: "" }]);
    setActiveFileIndex(files.length);
  };

  const removeFile = (index: number) => {
    if (files.length <= 1) return;
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    if (activeFileIndex >= newFiles.length) {
      setActiveFileIndex(newFiles.length - 1);
    }
  };

  if (showLanding) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-zinc-300 font-sans selection:bg-emerald-500/30">
        {/* Navbar */}
        <nav className="border-b border-zinc-800/50 bg-[#0A0A0B]/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-white font-bold tracking-tight">CodeRefine</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="https://github.com" target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <button 
                onClick={() => setShowLanding(false)}
                className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-zinc-200 transition-colors"
              >
                Launch App
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="max-w-7xl mx-auto px-6 pt-24 pb-32">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-8"
            >
              <Zap className="w-3.5 h-3.5" />
              AI-Powered Optimization
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-[1.1] mb-6"
            >
              Write better code, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                in any language.
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-zinc-400 mb-10 leading-relaxed max-w-2xl mx-auto"
            >
              CodeRefine is an intelligent code reviewer that transforms raw code into production-ready, optimized, and documented software in seconds.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <button 
                onClick={() => setShowLanding(false)}
                className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
              >
                Start Optimizing <ArrowRight className="w-5 h-5" />
              </button>
              <a 
                href="#features"
                className="w-full sm:w-auto px-8 py-4 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl border border-zinc-800 flex items-center justify-center transition-colors"
              >
                Explore Features
              </a>
            </motion.div>
          </div>

            <div id="features" className="mt-40 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <LandingFeatureCard 
                icon={<Split className="w-6 h-6 text-blue-400" />}
                title="Cross-Language Conversion"
                description="Instantly translate your code between Python, JavaScript, Java, C++, and more while maintaining optimal performance."
              />
            <LandingFeatureCard 
              icon={<BarChart3 className="w-6 h-6 text-purple-400" />}
              title="Complexity Analysis"
              description="Automatically calculate Big-O Time and Space complexity to ensure your algorithms are running at peak efficiency."
            />
            <LandingFeatureCard 
              icon={<FileText className="w-6 h-6 text-amber-400" />}
              title="Auto-Documentation"
              description="Generate professional docstrings and README-style explanations for your functions and classes instantly."
            />
            <LandingFeatureCard 
              icon={<ShieldAlert className="w-6 h-6 text-red-400" />}
              title="Security & Bug Detection"
              description="Identify vulnerabilities, logical flaws, and anti-patterns before they make it into production."
            />
            <LandingFeatureCard 
              icon={<GraduationCap className="w-6 h-6 text-emerald-400" />}
              title="Context-Aware Modes"
              description="Switch between Student, Interview, and Industry modes to get feedback tailored to your specific goals."
            />
            <LandingFeatureCard 
              icon={<Globe className="w-6 h-6 text-cyan-400" />}
              title="Auto Language Detection"
              description="Just paste your code. Our AI engine automatically detects the source language and applies the correct syntax rules."
            />
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-800/50 py-12 text-center text-zinc-500 text-sm">
          <p>© {new Date().getFullYear()} CodeRefine. Built with React, Tailwind, and Gemini AI.</p>
        </footer>
      </div>
    );
  }

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

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Style:</span>
            <select 
              value={style}
              onChange={(e) => setStyle(e.target.value as ImplementationStyle)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500/50 transition-colors"
            >
              <option value="default">Default</option>
              <option value="functional">Functional Style</option>
              <option value="recursive">Recursive Style</option>
              <option value="flat">No Functions/Recursion</option>
            </select>
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
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Model:</span>
            <select 
              value={model}
              onChange={(e) => setModel(e.target.value as ModelType)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500/50 transition-colors"
            >
              <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
              <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
              <option value="claude-4">Claude 4 (Fast)</option>
              <option value="gpt-5">GPT 5 (Reasoning)</option>
              <option value="microsoft-copilot">Microsoft Copilot</option>
              <option value="github-copilot">GitHub Copilot</option>
            </select>
          </div>

          <button
            onClick={() => { setShowHistory(true); loadHistory(); }}
            className="p-2 rounded-lg transition-all bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
            title="History"
          >
            <History className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg transition-all bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={toggleListening}
            className={cn(
              "p-2 rounded-lg transition-all",
              isListening 
                ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse" 
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
            )}
            title={isListening ? "Stop Listening" : "Voice Commands"}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

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
        {/* Workspace Sidebar */}
        <div className="w-48 bg-[#0A0A0B] border-r border-zinc-800 flex flex-col">
          <div className="p-3 border-b border-zinc-800 flex justify-between items-center">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <FolderTree className="w-3 h-3" /> Workspace
            </span>
            <button onClick={addFile} className="text-zinc-500 hover:text-white" title="Add File">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {files.map((f, i) => (
              <div 
                key={i} 
                onClick={() => setActiveFileIndex(i)}
                className={cn(
                  "px-3 py-2 text-sm rounded-lg cursor-pointer flex justify-between items-center group transition-colors", 
                  activeFileIndex === i ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-900"
                )}
              >
                <span className="truncate">{f.name}</span>
                {files.length > 1 && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }} 
                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Editor & Results */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Input Panel */}
          <div className="flex-1 flex flex-col border-r border-zinc-800 bg-[#0A0A0B]">
            <div className="h-10 border-b border-zinc-800 flex items-center px-4 justify-between bg-[#0D0D0E]/50">
              <div className="flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[11px] font-mono text-zinc-400">
                  {files[activeFileIndex]?.name}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowErrorLog(!showErrorLog)}
                  className={cn(
                    "text-[10px] uppercase tracking-wider font-bold transition-colors flex items-center gap-1",
                    showErrorLog || errorLog ? "text-red-400" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <ShieldAlert className="w-3 h-3" />
                  {errorLog ? "Error Log Added" : "Add Error Log"}
                </button>
                <button 
                  onClick={() => { setCode(""); setErrorLog(""); }}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-wider font-bold"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="flex-1 relative overflow-hidden flex flex-col">
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
              
              {/* Error Log Pane */}
              <AnimatePresence>
                {showErrorLog && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 160, opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-zinc-800 bg-[#0D0D0E]/80 flex flex-col"
                  >
                    <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/50">
                      <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                        <AlertCircle className="w-3 h-3" />
                        Error / Bug Log
                      </span>
                      <button onClick={() => setShowErrorLog(false)} className="text-zinc-500 hover:text-zinc-300">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <textarea
                      value={errorLog}
                      onChange={(e) => setErrorLog(e.target.value)}
                      placeholder="Paste your error log, stack trace, or bug description here..."
                      className="flex-1 w-full bg-transparent text-red-300/80 font-mono text-xs p-4 resize-none outline-none custom-scrollbar"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Results Panel */}
          <div className="flex-1 flex flex-col bg-[#0D0D0E]/30 overflow-hidden">
            {!result && !isReviewing && !error && activeTab !== "chat" && (
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
                  <FeatureCard icon={BarChart3} title="Complexity" desc="Time & Space analysis" />
                  <FeatureCard icon={FileText} title="Documentation" desc="Auto-generate docstrings" />
                  <FeatureCard icon={ShieldAlert} title="Security" desc="Find vulnerabilities" />
                </div>
                <button
                  onClick={() => setActiveTab("chat")}
                  className="mt-8 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl border border-zinc-800 flex items-center gap-2 transition-all"
                >
                  <MessageSquare className="w-5 h-5" />
                  Chat with Code
                </button>
              </div>
            )}

            {isReviewing && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-6 border-bottom border-zinc-800 bg-[#0D0D0E]/50">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex gap-6">
                      <SkeletonCircle label="Quality" />
                      <SkeletonCircle label="Readability" />
                      <SkeletonCircle label="Optimization" />
                      <SkeletonCircle label="Security" />
                      <SkeletonCircle label="Tech Debt" />
                      <SkeletonCircle label="Style" />
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse mb-2" />
                      <div className="flex gap-3">
                        <div className="h-6 w-16 bg-zinc-800 rounded-lg animate-pulse" />
                        <div className="h-6 w-16 bg-zinc-800 rounded-lg animate-pulse" />
                        <div className="h-6 w-16 bg-zinc-800 rounded-lg animate-pulse" />
                      </div>
                    </div>
                  </div>
                  <div className="h-10 w-full bg-zinc-900/50 rounded-xl border border-zinc-800 animate-pulse" />
                </div>
                <div className="flex-1 p-6 space-y-4 overflow-hidden">
                  <div className="h-32 w-full bg-zinc-900/30 border border-zinc-800 rounded-2xl animate-pulse" />
                  <div className="h-32 w-full bg-zinc-900/30 border border-zinc-800 rounded-2xl animate-pulse" />
                  <div className="h-32 w-full bg-zinc-900/30 border border-zinc-800 rounded-2xl animate-pulse" />
                </div>
                <div className="p-8 text-center">
                  <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin mx-auto mb-4" />
                  <p className="text-sm text-zinc-500 font-medium">AI is analyzing your code using {mode} mode...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-20 h-20 bg-red-500/5 rounded-full flex items-center justify-center mb-6 border border-red-500/10">
                  <ShieldAlert className="w-10 h-10 text-red-500/40" />
                </div>
                <h2 className="text-xl font-bold text-white mb-3 tracking-tight">Analysis Interrupted</h2>
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 max-w-md mb-8">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-widest mb-2">
                    <AlertCircle className="w-4 h-4" />
                    Error Details
                  </div>
                  <p className="text-sm text-red-300/80 leading-relaxed">{error}</p>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={handleReview}
                    className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry Analysis
                  </button>
                  <button 
                    onClick={() => setError(null)}
                    className="px-8 py-3 bg-zinc-900 text-white font-bold rounded-xl border border-zinc-800 hover:bg-zinc-800 transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {result && !isReviewing && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Result Header */}
                <div className="p-6 border-bottom border-zinc-800 bg-[#0D0D0E]/50">
                  <div className="flex items-start justify-between mb-6">
                    <>
                      <div className="flex gap-6">
                        <ScoreDisplay label="Quality" score={result.detailedScores.quality} />
                        <ScoreDisplay label="Readability" score={result.detailedScores.readability} />
                        <ScoreDisplay label="Optimization" score={result.detailedScores.optimization} />
                        <ScoreDisplay label="Security" score={result.detailedScores.security} />
                        <ScoreDisplay label="Tech Debt" score={result.detailedScores.technicalDebt} />
                        <ScoreDisplay label="Style" score={result.detailedScores.styleConsistency} />
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Complexity</div>
                        <div className="flex gap-3">
                          <ComplexityBadge label="Time" value={result.complexity.time} />
                          <ComplexityBadge label="Space" value={result.complexity.space} />
                          <ComplexityBadge label="Cyclomatic" value={result.complexity.cyclomatic.toString()} />
                        </div>
                      </div>
                    </>
                  </div>

                  <div className="flex gap-1 p-1 bg-zinc-900/50 rounded-xl border border-zinc-800">
                    <>
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
                    </>
                    <TabButton 
                      active={activeTab === "chat"} 
                      onClick={() => setActiveTab("chat")}
                      label="Chat"
                    />
                  </div>
                </div>

                {/* Result Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  <AnimatePresence mode="wait">
                    {activeTab === "chat" && (
                      <motion.div 
                        key="chat"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex flex-col h-full"
                      >
                        <div className="flex-1 space-y-4 mb-4">
                          {chatMessages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center opacity-50 py-12">
                              <MessageSquare className="w-12 h-12 mb-4" />
                              <p className="text-sm">Ask anything about the code above.</p>
                              <p className="text-xs mt-2 italic">"Why did you use this pattern?" or "Can we optimize this further?"</p>
                            </div>
                          )}
                          {chatMessages.map((msg, i) => (
                            <div key={i} className={cn(
                              "flex flex-col max-w-[85%]",
                              msg.role === "user" ? "ml-auto items-end" : "items-start"
                            )}>
                              <div className={cn(
                                "p-3 rounded-2xl text-sm",
                                msg.role === "user" 
                                  ? "bg-emerald-600 text-white rounded-tr-none" 
                                  : "bg-zinc-800 text-zinc-200 rounded-tl-none border border-zinc-700"
                              )}>
                                <div className="markdown-body text-inherit">
                                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                                </div>
                              </div>
                            </div>
                          ))}
                          {isChatLoading && (
                            <div className="flex items-start">
                              <div className="bg-zinc-800 p-3 rounded-2xl rounded-tl-none border border-zinc-700">
                                <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="relative mt-auto">
                          <input 
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                            placeholder="Ask a question..."
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 pr-12 text-sm text-white outline-none focus:border-emerald-500/50 transition-colors"
                          />
                          <button 
                            onClick={handleSendMessage}
                            disabled={isChatLoading || !chatInput.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-zinc-500 hover:text-emerald-500 disabled:opacity-50 transition-colors"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === "issues" && result && (
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
                              onClick={() => issue.line && scrollToLine(issue.line)}
                            />
                          ))
                        )}
                      </motion.div>
                    )}

                    {activeTab === "optimized" && result && (
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

                    {activeTab === "explanation" && result && (
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

                    {activeTab === "documentation" && result && (
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

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-zinc-400" />
                  Settings
                </h3>
                <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-zinc-300 mb-2">House Style Guidelines</h4>
                  <p className="text-xs text-zinc-500 mb-4">
                    Define your team's specific coding style, naming conventions, and architectural preferences. The AI will enforce these rules during refactoring.
                  </p>
                  <textarea
                    value={houseStyle}
                    onChange={(e) => setHouseStyle(e.target.value)}
                    placeholder="e.g., Use camelCase for variables, prefer functional components, always use async/await over promises..."
                    className="w-full bg-black/50 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 min-h-[120px] outline-none focus:border-emerald-500/50 transition-colors resize-none"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-300 mb-2">Verbosity</h4>
                    <select 
                      value={verbosity}
                      onChange={(e) => setVerbosity(e.target.value as VerbosityLevel)}
                      className="w-full bg-black/50 border border-zinc-800 text-zinc-300 text-sm rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 transition-colors"
                    >
                      <option value="concise">Concise (Short & Direct)</option>
                      <option value="normal">Normal (Balanced)</option>
                      <option value="detailed">Detailed (In-depth)</option>
                    </select>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-300 mb-2">Tone</h4>
                    <select 
                      value={tone}
                      onChange={(e) => setTone(e.target.value as ToneStyle)}
                      className="w-full bg-black/50 border border-zinc-800 text-zinc-300 text-sm rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 transition-colors"
                    >
                      <option value="professional">Professional (Objective)</option>
                      <option value="casual">Casual (Conversational)</option>
                      <option value="encouraging">Encouraging (Supportive)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-zinc-800 flex justify-end bg-black/20">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition-all"
                >
                  Save & Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-black/20">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-400" />
                  Review History
                </h3>
                <button onClick={() => setShowHistory(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {isLoadingHistory ? (
                  <div className="flex justify-center items-center h-40">
                    <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
                  </div>
                ) : historyData.length === 0 ? (
                  <div className="text-center text-zinc-500 py-12">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No history found yet.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {historyData.map((item) => (
                      <div key={item.id} className="bg-black/30 border border-zinc-800 rounded-xl overflow-hidden">
                        <div className="bg-zinc-800/50 px-4 py-3 border-b border-zinc-800 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-zinc-300">
                              {new Date(item.timestamp).toLocaleString()}
                            </span>
                            <span className="text-xs font-mono bg-zinc-900 border border-zinc-700 px-2 py-1 rounded text-emerald-400">
                              {item.language}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 bg-zinc-900 px-2 py-1 rounded">
                              O({item.timeComplexity}) Time
                            </span>
                            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 bg-zinc-900 px-2 py-1 rounded">
                              O({item.spaceComplexity}) Space
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
                          <div className="p-4">
                            <div className="text-xs font-bold text-zinc-500 uppercase mb-2">Original Code</div>
                            <pre className="text-xs bg-zinc-950/50 p-3 rounded-lg h-48 overflow-auto custom-scrollbar text-zinc-400 font-mono">
                              {item.originalCode}
                            </pre>
                          </div>
                          <div className="p-4">
                            <div className="text-xs font-bold text-emerald-500/70 uppercase mb-2">Improved Code</div>
                            <pre className="text-xs bg-emerald-950/10 p-3 rounded-lg h-48 overflow-auto custom-scrollbar text-emerald-400/80 font-mono">
                              {item.improvedCode}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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

function SkeletonCircle({ label }: { label: string }) {
  return (
    <div>
      <div className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-1">{label}</div>
      <div className="h-6 w-12 bg-zinc-800 rounded animate-pulse" />
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
  onMouseLeave,
  onClick
}: { 
  issue: CodeIssue, 
  onMouseEnter?: () => void, 
  onMouseLeave?: () => void,
  onClick?: () => void
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
      onClick={onClick}
      className={cn(
        "bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5 transition-all group relative overflow-hidden",
        onClick ? "cursor-pointer hover:border-emerald-500/50 hover:bg-zinc-900/50" : "cursor-default hover:border-zinc-700"
      )}
    >
      {/* Highlight accent line */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", severityColor.split(' ')[1])} />
      
      <div className="flex items-start justify-between mb-4 pl-2">
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
          </div>
        </div>
        {issue.line && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Location</span>
            <span className="text-sm font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20 mt-1">
              Line {issue.line}
            </span>
          </div>
        )}
      </div>
      
      <div className="pl-2">
        <div className="mb-4">
          <h4 className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Why this is an issue</h4>
          <p className="text-sm text-zinc-300 leading-relaxed">{issue.description}</p>
        </div>
        
        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800/50">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRight className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">How to fix it</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">"{issue.suggestion}"</p>
        </div>
      </div>
    </div>
  );
}

function LandingFeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800/50 p-8 rounded-3xl hover:bg-zinc-900/80 hover:border-zinc-700/50 transition-all group">
      <div className="w-12 h-12 bg-zinc-800/50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-zinc-400 leading-relaxed text-sm">{description}</p>
    </div>
  );
}
