"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Source {
    filename: string;
    text: string;
}

interface Doc {
    id: string;
    filename: string;
    uploadedAt: number;
}

interface ChatMessage {
    question: string;
    answer: string;
    sources: Source[];
    isStreaming?: boolean;
}

interface Toast {
    id: number;
    message: string;
    type: 'error' | 'success';
}

// File type emoji helper (client-side)
function getFileTypeEmoji(filename: string): string {
    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    switch (ext) {
        case '.pdf': return '📕';
        case '.docx': return '📘';
        case '.md': return '📗';
        case '.txt': return '📄';
        default: return '📄';
    }
}

function getFileTypeLabel(filename: string): string {
    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    return ext.toUpperCase().replace('.', '');
}

export default function Home() {
    const [docs, setDocs] = useState<Doc[]>([]);
    const [question, setQuestion] = useState("");
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [connectionError, setConnectionError] = useState(false);
    const [sessionId, setSessionId] = useState<string>("");

    const chatEndRef = useRef<HTMLDivElement>(null);
    const toastIdRef = useRef(0);

    // Generate session ID on mount
    useEffect(() => {
        setSessionId(crypto.randomUUID());
    }, []);

    useEffect(() => {
        fetchDocs();
        checkHealth();
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [history, loading]);

    // Auto-dismiss toasts
    useEffect(() => {
        if (toasts.length === 0) return;
        const timer = setTimeout(() => {
            setToasts(prev => prev.slice(1));
        }, 5000);
        return () => clearTimeout(timer);
    }, [toasts]);

    const showToast = useCallback((message: string, type: 'error' | 'success' = 'error') => {
        const id = ++toastIdRef.current;
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const dismissToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const checkHealth = async () => {
        try {
            const res = await fetch("/api/health");
            if (!res.ok) setConnectionError(true);
            else {
                const data = await res.json();
                setConnectionError(data.storage !== 'OK');
            }
        } catch {
            setConnectionError(true);
        }
    };

    const fetchDocs = async () => {
        try {
            const res = await fetch("/api/documents");
            if (res.ok) {
                setDocs(await res.json());
            } else {
                showToast("Failed to fetch documents");
            }
        } catch (e) {
            console.error("Failed to fetch docs", e);
            showToast("Could not connect to the server");
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this document?")) return;

        try {
            const res = await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                await fetchDocs();
                showToast("Document deleted", "success");
            } else {
                const data = await res.json();
                showToast(data.error || "Failed to delete document");
            }
        } catch (err) {
            console.error(err);
            showToast("Error deleting document");
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        setUploading(true);

        const formData = new FormData();
        formData.append("file", e.target.files[0]);

        try {
            const res = await fetch("/api/documents/", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Upload failed");
            }

            await fetchDocs();
            showToast("Document uploaded & embedded successfully", "success");
        } catch (err: any) {
            showToast(err.message || "Upload failed");
        } finally {
            setUploading(false);
            // Reset file input
            e.target.value = '';
        }
    };

    const handleAsk = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim()) return;

        const currentQuestion = question;
        setQuestion("");
        setLoading(true);

        // Add placeholder message
        const msgIndex = history.length;
        setHistory(prev => [...prev, {
            question: currentQuestion,
            answer: "",
            sources: [],
            isStreaming: true,
        }]);

        try {
            const res = await fetch("/api/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: currentQuestion, sessionId }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to get answer");
            }

            const reader = res.body?.getReader();
            if (!reader) throw new Error("No response stream");

            const decoder = new TextDecoder();
            let accumulatedAnswer = "";
            let sources: Source[] = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = decoder.decode(value, { stream: true });
                const lines = text.split('\n\n');

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const jsonStr = line.slice(6);

                    try {
                        const event = JSON.parse(jsonStr);

                        if (event.type === 'text') {
                            accumulatedAnswer += event.content;
                            setHistory(prev => {
                                const updated = [...prev];
                                updated[msgIndex] = {
                                    ...updated[msgIndex],
                                    answer: accumulatedAnswer,
                                    isStreaming: true,
                                };
                                return updated;
                            });
                        } else if (event.type === 'sources') {
                            sources = event.content;
                        } else if (event.type === 'error') {
                            throw new Error(event.content);
                        } else if (event.type === 'done') {
                            setHistory(prev => {
                                const updated = [...prev];
                                updated[msgIndex] = {
                                    ...updated[msgIndex],
                                    answer: accumulatedAnswer,
                                    sources,
                                    isStreaming: false,
                                };
                                return updated;
                            });
                        }
                    } catch (parseErr: any) {
                        if (parseErr.message && parseErr.message !== jsonStr) {
                            // Re-throw actual errors, not JSON parse errors for incomplete chunks
                            if (parseErr.message.includes('Failed')) throw parseErr;
                        }
                    }
                }
            }
        } catch (err: any) {
            console.error(err);
            setHistory(prev => {
                const updated = [...prev];
                updated[msgIndex] = {
                    question: currentQuestion,
                    answer: "⚠️ Error: " + (err.message || "Could not communicate with AI."),
                    sources: [],
                    isStreaming: false,
                };
                return updated;
            });
            showToast(err.message || "Error communicating with AI");
        } finally {
            setLoading(false);
        }
    };

    const handleNewChat = () => {
        setHistory([]);
        setSessionId(crypto.randomUUID());
    };

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-12">
            {/* Toast Notifications */}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 animate-slide-in cursor-pointer transition-all hover:scale-[1.02] ${toast.type === 'error'
                                ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                                : 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                            }`}
                        onClick={() => dismissToast(toast.id)}
                    >
                        <span className="text-lg">{toast.type === 'error' ? '❌' : '✅'}</span>
                        <span className="text-sm font-medium flex-1">{toast.message}</span>
                        <span className="text-xs opacity-60 hover:opacity-100">✕</span>
                    </div>
                ))}
            </div>

            {/* Connection Error Banner */}
            {connectionError && (
                <div className="max-w-6xl mx-auto mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3">
                    <span className="text-2xl">🔌</span>
                    <div>
                        <p className="font-semibold text-amber-700 dark:text-amber-300">Connection Issue</p>
                        <p className="text-sm text-amber-600 dark:text-amber-400">Database might be unavailable. Some features may not work.</p>
                    </div>
                    <button
                        onClick={() => { checkHealth(); fetchDocs(); }}
                        className="ml-auto px-3 py-1 text-sm bg-amber-200 dark:bg-amber-800 rounded-lg hover:bg-amber-300 dark:hover:bg-amber-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            )}

            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">

                {/* Left Sidebar: Controls */}
                <div className="md:col-span-1 space-y-6">
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold mb-4">Knowledge Base</h2>

                        {/* Upload */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-2">Upload Document</label>
                            <p className="text-xs text-gray-400 mb-2">Supports .pdf, .txt, .md, .docx</p>
                            <input
                                type="file"
                                accept=".txt,.pdf,.md,.docx"
                                onChange={handleUpload}
                                disabled={uploading}
                                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  disabled:opacity-50"
                            />
                            {uploading && (
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                                    <p className="text-sm text-blue-600">Parsing & Embedding...</p>
                                </div>
                            )}
                        </div>

                        {/* Document List */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                Documents ({docs.length})
                            </h3>
                            <ul className="space-y-2 max-h-64 overflow-y-auto">
                                {docs.length === 0 ? (
                                    <li className="text-sm text-gray-400 italic">No documents yet.</li>
                                ) : (
                                    docs.map((doc) => (
                                        <li key={doc.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                            <div className="flex items-center gap-2 truncate mr-2">
                                                <span title={getFileTypeLabel(doc.filename)}>
                                                    {getFileTypeEmoji(doc.filename)}
                                                </span>
                                                <span className="truncate">{doc.filename}</span>
                                            </div>
                                            <button
                                                onClick={(e) => handleDelete(doc.id, e)}
                                                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200 shrink-0"
                                                title="Delete"
                                            >
                                                🗑️
                                            </button>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <button
                            onClick={handleNewChat}
                            className="w-full px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium flex items-center gap-2 justify-center"
                        >
                            <span>💬</span> New Chat
                        </button>
                        <a href="/status" className="block text-center text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 flex items-center gap-1 justify-center py-2">
                            <span>📊</span> System Status
                        </a>
                    </div>
                </div>

                {/* Right Area: Chat */}
                <div className="md:col-span-3">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-[700px] flex flex-col">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold">Private Q&A</h1>
                                <p className="text-gray-500 text-sm">Ask questions based on your uploaded documents.</p>
                            </div>
                            {history.length > 0 && (
                                <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                                    {history.length} message{history.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>

                        <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
                            {/* Empty State */}
                            {history.length === 0 && !loading && (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-center">
                                    <div className="text-6xl mb-4">💬</div>
                                    <p className="text-lg">Start a conversation!</p>
                                    <p className="text-sm">Upload a document and ask questions about it.</p>
                                    <div className="mt-4 flex gap-2 flex-wrap justify-center">
                                        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">📕 PDF</span>
                                        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">📄 TXT</span>
                                        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">📗 MD</span>
                                        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">📘 DOCX</span>
                                    </div>
                                </div>
                            )}

                            {history.map((item, idx) => (
                                <div key={idx} className="space-y-4">
                                    {/* User Question */}
                                    <div className="flex justify-end">
                                        <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-tr-none max-w-[80%] shadow-sm">
                                            <p className="font-medium">{item.question}</p>
                                        </div>
                                    </div>

                                    {/* Bot Answer */}
                                    <div className="flex justify-start">
                                        <div className="bg-gray-100 dark:bg-gray-700/50 px-4 py-3 rounded-2xl rounded-tl-none max-w-[90%] shadow-sm">
                                            <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-sm sm:text-base">
                                                {item.answer}
                                                {item.isStreaming && (
                                                    <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse rounded-sm"></span>
                                                )}
                                            </div>

                                            {item.sources && item.sources.length > 0 && !item.isStreaming && (
                                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Sources:</p>
                                                    <div className="space-y-2">
                                                        {item.sources.map((s, i) => (
                                                            <details key={i} className="group text-xs">
                                                                <summary className="cursor-pointer text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-1">
                                                                    <span>{getFileTypeEmoji(s.filename)}</span>
                                                                    {s.filename}
                                                                </summary>
                                                                <div className="mt-1 p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-600 font-mono text-gray-600 dark:text-gray-400">
                                                                    &quot;{s.text}&quot;
                                                                </div>
                                                            </details>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Loading State (only shows when no streaming message yet) */}
                            {loading && history.length > 0 && history[history.length - 1]?.answer === "" && !history[history.length - 1]?.isStreaming && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 dark:bg-gray-700/50 px-6 py-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            )}

                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
                            <form onSubmit={handleAsk} className="flex gap-4">
                                <input
                                    type="text"
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    placeholder="Ask a question about your documents..."
                                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 shadow-sm"
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !question.trim()}
                                    className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2"
                                >
                                    <span>Send</span>
                                    {loading ? (
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    ) : (
                                        <span>➤</span>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

            </div>

            {/* CSS for toast animation */}
            <style jsx>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .animate-slide-in {
                    animation: slideIn 0.3s ease-out;
                }
            `}</style>
        </main>
    );
}
