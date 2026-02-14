"use client";

import { useEffect, useState } from "react";

interface StatusData {
    backend: string;
    storage: string;
    llm: string;
}

export default function StatusPage() {
    const [status, setStatus] = useState<StatusData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchStatus = () => {
        setLoading(true);
        setError(false);
        fetch("/api/health")
            .then((res) => res.json())
            .then((data) => {
                setStatus(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setError(true);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const getStatusColor = (s: string) => (s === "OK" ? "bg-green-500" : "bg-red-500");
    const getStatusLabel = (s: string) => (s === "OK" ? "Healthy" : "Error");

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8 sm:p-20">
            <main className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold mb-2">System Status</h1>
                <p className="text-gray-500 mb-8">Real-time health check of all services.</p>

                {loading ? (
                    <div className="flex items-center gap-3 text-gray-500">
                        <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                        Checking system health...
                    </div>
                ) : error ? (
                    <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl flex items-center justify-between">
                        <span>Failed to fetch status. Backend might be down.</span>
                        <button onClick={fetchStatus} className="px-3 py-1 bg-red-200 dark:bg-red-800 rounded-lg text-sm hover:bg-red-300 dark:hover:bg-red-700 transition-colors">
                            Retry
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        <StatusCard
                            title="Backend API"
                            status={status!.backend}
                            color={getStatusColor(status!.backend)}
                            label={getStatusLabel(status!.backend)}
                        />
                        <StatusCard
                            title="Database (PostgreSQL)"
                            status={status!.storage}
                            color={getStatusColor(status!.storage)}
                            label={getStatusLabel(status!.storage)}
                        />
                        <StatusCard
                            title="LLM Connection (Gemini)"
                            status={status!.llm}
                            color={getStatusColor(status!.llm)}
                            label={getStatusLabel(status!.llm)}
                        />
                    </div>
                )}

                <div className="mt-8 flex gap-4">
                    <a href="/" className="text-blue-600 hover:underline">← Back to Home</a>
                    {!loading && (
                        <button onClick={fetchStatus} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm">
                            🔄 Refresh
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
}

function StatusCard({ title, status, color, label }: { title: string, status: string, color: string, label: string }) {
    return (
        <div className="flex items-center justify-between p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <span className="font-semibold">{title}</span>
            <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${color} ${status === 'OK' ? 'animate-pulse' : ''}`}></span>
                <span className="font-mono text-sm">{label}</span>
            </div>
        </div>
    );
}
