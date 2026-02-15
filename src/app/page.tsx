"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";

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
    role: 'user' | 'assistant';
    content: string;
    created_at?: string;
}

interface Chat {
    id: string;
    title: string;
    created_at: string;
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
    const [chats, setChats] = useState<Chat[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [question, setQuestion] = useState("");
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [connectionError, setConnectionError] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [healthData, setHealthData] = useState<any>(null);
    const [healthLoading, setHealthLoading] = useState(false);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const toastIdRef = useRef(0);

    // Initial data fetch
    useEffect(() => {
        fetchDocs();
        fetchChats();
    }, []);

    // Scroll to bottom
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

    // Load history when chat changes
    useEffect(() => {
        if (currentChatId) {
            fetchHistory(currentChatId);
        } else {
            setHistory([]);
        }
    }, [currentChatId]);

    const showToast = useCallback((message: string, type: 'error' | 'success' = 'error') => {
        const id = ++toastIdRef.current;
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const dismissToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const checkHealth = async () => {
        setHealthLoading(true);
        try {
            const res = await fetch("/api/health");
            if (!res.ok) {
                setConnectionError(true);
                setHealthData(null);
            } else {
                const data = await res.json();
                setHealthData(data);
                setConnectionError(data.storage !== 'OK' || data.db !== 'OK' || data.llm !== 'OK');
            }
        } catch {
            setConnectionError(true);
            setHealthData(null);
        } finally {
            setHealthLoading(false);
        }
    };

    const fetchDocs = async () => {
        try {
            const res = await fetch("/api/documents");
            if (res.ok) setDocs(await res.json());
            else showToast("Failed to fetch documents");
        } catch (e) {
            console.error("Failed to fetch docs", e);
            showToast("Could not connect to the server");
        }
    };

    const fetchChats = async () => {
        try {
            const res = await fetch("/api/chats");
            if (res.ok) {
                const data = await res.json();
                setChats(data);
                if (data.length > 0 && !currentChatId) {
                    // Optionally auto-select first chat
                    // setCurrentChatId(data[0].id);
                }
            }
        } catch (e) {
            console.error("Failed to fetch chats", e);
        }
    };

    const fetchHistory = async (chatId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/chats/${chatId}`);
            if (res.ok) {
                const data = await res.json();
                // Map DB history to UI format
                // The API currently returns raw DB rows, we might need to adapt if the structure matches ChatMessage
                // The API currently returns { role: 'user' | 'assistant', content: string, created_at: string } which matches ChatMessage
                setHistory(data);
            }
        } catch (e) {
            console.error("Failed to fetch history", e);
            showToast("Failed to load chat history");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateChat = async () => {
        try {
            const res = await fetch("/api/chats", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: "New Chat" }),
            });
            if (res.ok) {
                const newChat = await res.json();
                setChats(prev => [newChat, ...prev]);
                setCurrentChatId(newChat.id);
                setHistory([]);
            }
        } catch (e) {
            showToast("Failed to create new chat");
        }
    };

    const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Delete this chat?")) return;

        try {
            const res = await fetch(`/api/chats?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                setChats(prev => prev.filter(c => c.id !== id));
                if (currentChatId === id) setCurrentChatId(null);
                showToast("Chat deleted", "success");
            }
        } catch (e) {
            showToast("Failed to delete chat");
        }
    };

    const handleDeleteDoc = async (id: string, e: React.MouseEvent) => {
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
            e.target.value = '';
        }
    };

    const handleAsk = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim()) return;

        // If no chat selected, create one
        let activeChatId = currentChatId;
        if (!activeChatId) {
            try {
                const res = await fetch("/api/chats", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: question.slice(0, 30) + (question.length > 30 ? "..." : "") }),
                });
                if (res.ok) {
                    const newChat = await res.json();
                    setChats(prev => [newChat, ...prev]);
                    activeChatId = newChat.id;
                    setCurrentChatId(activeChatId);
                } else throw new Error("Failed to start chat");
            } catch (e) {
                showToast("Failed to start new chat");
                return;
            }
        }

        const currentQuestion = question;
        setQuestion("");
        setLoading(true);

        // Optimistic update
        const tempMsg: ChatMessage = { role: 'user', content: currentQuestion };
        setHistory(prev => [...prev, tempMsg]);

        try {
            // Update title if it's the first message of a new chat
            if (activeChatId && history.length === 0) {
                const currentChat = chats.find(c => c.id === activeChatId);
                if (currentChat && currentChat.title === "New Chat") {
                    const newTitle = currentQuestion.slice(0, 30) + (currentQuestion.length > 30 ? "..." : "");
                    // Fire and forget title update
                    fetch("/api/chats", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: activeChatId, title: newTitle }),
                    }).then(() => {
                        setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, title: newTitle } : c));
                    });
                }
            }

            const res = await fetch("/api/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: currentQuestion, sessionId: activeChatId }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to get answer");
            }

            const reader = res.body?.getReader();
            if (!reader) throw new Error("No response stream");

            const decoder = new TextDecoder();
            let accumulatedAnswer = "";
            let sources: Source[] = []; // Keep track if sources are sent

            // Add placeholder for assistant
            setHistory(prev => [...prev, { role: 'assistant', content: "" }]);

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
                                const newHistory = [...prev];
                                const lastMsg = newHistory[newHistory.length - 1];
                                if (lastMsg.role === 'assistant') {
                                    lastMsg.content = accumulatedAnswer;
                                }
                                return newHistory;
                            });
                        } else if (event.type === 'sources') {
                            sources = event.content;
                            // Append sources to answer if desired, or handle separately
                            // For now, let's append them to the markdown content for simplicity since our ChatMessage structure is simple
                            if (sources.length > 0) {
                                let sourcesMd = "\n\n**Sources:**\n" + sources.map(s => `- ${s.filename}`).join("\n");
                                accumulatedAnswer += sourcesMd;
                                setHistory(prev => {
                                    const newHistory = [...prev];
                                    const lastMsg = newHistory[newHistory.length - 1];
                                    if (lastMsg.role === 'assistant') {
                                        lastMsg.content = accumulatedAnswer;
                                    }
                                    return newHistory;
                                });
                            }
                        } else if (event.type === 'error') {
                            throw new Error(event.content);
                        }
                    } catch (e: any) {
                        if (e.message?.includes('Failed')) throw e;
                    }
                }
            }
        } catch (err: any) {
            console.error(err);
            // Update last assistant message to show error
            setHistory(prev => {
                const newHistory = [...prev];
                // If last was user (failed before stream start), add assistant error
                if (newHistory[newHistory.length - 1].role === 'user') {
                    newHistory.push({ role: 'assistant', content: `⚠️ Error: ${err.message}` });
                } else {
                    newHistory[newHistory.length - 1].content = `⚠️ Error: ${err.message}`;
                }
                return newHistory;
            });
            showToast(err.message || "Error generating response");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
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

            {/* Left Sidebar */}
            <aside className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                {/* Top: New Chat & Upload */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
                    <button
                        onClick={handleCreateChat}
                        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                        <span>+</span> New Chat
                    </button>

                    <div className="relative">
                        <label htmlFor="file-upload" className="flex items-center justify-center w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl cursor-pointer transition-colors border border-dashed border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 gap-2">
                            <span>📂</span> {uploading ? "Uploading..." : "Upload Document"}
                        </label>
                        <input
                            id="file-upload"
                            type="file"
                            accept=".txt,.pdf,.md,.docx"
                            onChange={handleUpload}
                            disabled={uploading}
                            className="hidden"
                        />
                    </div>

                    {/* Collapsible Doc List? Or just show count? Let's show mini list */}
                    <div className="max-h-32 overflow-y-auto space-y-1">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase">Documents ({docs.length})</h3>
                        {docs.map(doc => (
                            <div key={doc.id} className="flex justify-between items-center text-xs group p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                                <span className="truncate flex-1" title={doc.filename}>{getFileTypeEmoji(doc.filename)} {doc.filename}</span>
                                <button onClick={(e) => handleDeleteDoc(doc.id, e)} className="text-red-500 opacity-0 group-hover:opacity-100 p-1">✕</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Middle: Chat List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    <h3 className="px-2 text-xs font-semibold text-gray-400 uppercase mb-1">Your Chats</h3>
                    {chats.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">No chats yet.</p>
                    ) : (
                        chats.map(chat => (
                            <div
                                key={chat.id}
                                onClick={() => setCurrentChatId(chat.id)}
                                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${currentChatId === chat.id
                                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800"
                                    : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                                    }`}
                            >
                                <div className="flex items-center gap-3 truncate">
                                    <span className="text-lg">💬</span>
                                    <span className="text-sm font-medium truncate">{chat.title}</span>
                                </div>
                                <button
                                    onClick={(e) => handleDeleteChat(chat.id, e)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    🗑️
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Bottom: Status */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <button
                        onClick={() => {
                            checkHealth();
                            setShowStatusModal(true);
                        }}
                        className="w-full text-left group transition-colors"
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${connectionError ? 'bg-red-500' : 'bg-green-500'}`}></div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                                System Status: {connectionError ? "Error" : "Operational"}
                            </span>
                        </div>
                        <span className="block text-xs text-blue-500 group-hover:underline">View Detailed Status</span>
                    </button>
                </div>
            </aside>

            {/* Status Modal */}
            {showStatusModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold">System Status</h3>
                            <button onClick={() => setShowStatusModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl">
                                &times;
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {healthLoading ? (
                                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                                    <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
                                    <p className="text-sm text-gray-500">Checking system health...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        <span className="font-medium">Database (Neon)</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2.5 h-2.5 rounded-full ${healthData?.db === 'OK' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                            <span className="text-sm font-semibold">{healthData?.db || 'Error'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        <span className="font-medium">Vector Storage</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2.5 h-2.5 rounded-full ${healthData?.storage === 'OK' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                            <span className="text-sm font-semibold">{healthData?.storage || 'Error'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        <span className="font-medium">Google Gemini API</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2.5 h-2.5 rounded-full ${healthData?.llm === 'OK' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                            <span className="text-sm font-semibold">{healthData?.llm || 'Error'}</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 text-center text-xs text-gray-500">
                            Last checked: {new Date().toLocaleTimeString()}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Chat Area */}
            <section className="flex-1 flex flex-col h-full relative">
                {/* Header */}
                <header className="h-16 border-b border-gray-200 dark:border-gray-700 flex items-center px-6 bg-white dark:bg-gray-900/50 backdrop-blur-sm z-10 sticky top-0">
                    <h2 className="font-semibold text-lg">
                        {chats.find(c => c.id === currentChatId)?.title || "Select a chat"}
                    </h2>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {!currentChatId ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                            <div className="text-6xl">👋</div>
                            <h3 className="text-xl font-semibold">Welcome to Private Q&A</h3>
                            <p>Select a chat from the sidebar or start a new one.</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <p>Start the conversation by asking a question.</p>
                        </div>
                    ) : (
                        history.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-3xl rounded-2xl px-6 py-4 shadow-sm ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-sm'
                                    : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-tl-sm'
                                    }`}>
                                    {msg.role === 'assistant' ? (
                                        <div className="prose dark:prose-invert max-w-none text-sm">
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        </div>
                                    ) : (
                                        <p className="text-sm">{msg.content}</p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    {loading && history.length > 0 && history[history.length - 1].role === 'user' && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 dark:bg-gray-800 px-6 py-4 rounded-2xl rounded-tl-sm flex items-center gap-2">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef}></div>
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <form onSubmit={handleAsk} className="max-w-4xl mx-auto relative">
                        <input
                            type="text"
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            placeholder={currentChatId ? "Ask anything..." : "Ask to start a new chat..."}
                            className="w-full pl-5 pr-14 py-4 rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm transition-all"
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={!question.trim() || loading}
                            className="absolute right-2 top-2 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? (
                                <span className="block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <span className="text-lg">➤</span>
                            )}
                        </button>
                    </form>
                </div>
            </section>
        </main>
    );
}
