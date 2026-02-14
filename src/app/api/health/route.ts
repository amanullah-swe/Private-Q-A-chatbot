import { NextResponse } from "next/server";
import { getStatus as getStorageStatus } from "@/lib/storage";
import { checkLLMConnectivity } from "@/lib/rag";

export const dynamic = 'force-dynamic'; // Ensure this is not cached

export async function GET() {
    // Check all systems
    const storageStatus = await getStorageStatus();

    // This connects to OpenAI, so it validates API key basically
    const llmStatus = await checkLLMConnectivity();

    // Backend is 'OK' because we are here responding
    const backendStatus = 'OK';

    return NextResponse.json({
        backend: backendStatus,
        storage: storageStatus,
        llm: llmStatus
    });
}
