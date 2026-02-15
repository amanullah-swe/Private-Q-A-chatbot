import { NextRequest, NextResponse } from "next/server";
import { queryDocuments } from "@/lib/rag";
import { addMessage, getHistory } from "@/lib/chat";
import { getDocuments } from "@/lib/storage";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

export async function POST(req: NextRequest) {
    try {
        const { question, sessionId } = await req.json();

        if (!question || typeof question !== 'string' || question.trim().length === 0) {
            return NextResponse.json({ error: "No question provided" }, { status: 400 });
        }

        if (!process.env.GOOGLE_API_KEY) {
            return NextResponse.json({ error: "Google API Key not configured" }, { status: 500 });
        }

        // 0. Check if any documents exist
        const allDocs = await getDocuments();
        if (allDocs.length === 0) {
            return NextResponse.json({ error: "No documents uploaded. Please upload a file first." }, { status: 400 });
        }

        // 1. Retrieve relevant docs via similarity search
        const docs = await queryDocuments(question);

        const context = docs.length > 0
            ? docs.map(d => d.pageContent).join("\n\n---\n\n")
            : "";

        if (!context) {
            return NextResponse.json({
                error: "I couldn't find any relevant information in your documents for this question."
            }, { status: 400 });
        }

        // 2. Build chat history context
        let historyText = "";
        if (sessionId) {
            const history = await getHistory(sessionId, 10);
            if (history.length > 0) {
                historyText = history
                    .map(m => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
                    .join("\n");
            }
        }

        // 3. Save user message to history
        if (sessionId) {
            await addMessage(sessionId, 'user', question);
        }

        // 4. Generate streaming answer
        const model = new ChatGoogleGenerativeAI({
            model: "gemini-3-flash-preview",
            maxOutputTokens: 2048,
            apiKey: process.env.GOOGLE_API_KEY,
            streaming: true,
        });

        const promptTemplate = PromptTemplate.fromTemplate(`
You are a helpful assistant. Use the following pieces of context to answer the question at the end.
If the answer is not in the context, say "I don't know".
Do not try to make up an answer.

Context:
{context}

{history}

Question:
{question}

Answer:
`);

        const historySection = historyText
            ? `Previous conversation:\n${historyText}\n`
            : "";

        const chain = promptTemplate.pipe(model as any).pipe(new StringOutputParser());

        // Prepare sources metadata to send at the end
        const sources = docs.map(d => ({
            filename: d.metadata.filename || "unknown",
            text: d.pageContent
        }));

        // Create a streaming response
        const encoder = new TextEncoder();
        let fullAnswer = "";

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const streamResult = await chain.stream({
                        context: context,
                        history: historySection,
                        question: question
                    });

                    for await (const chunk of streamResult) {
                        if (req.signal.aborted) {
                            controller.close();
                            return;
                        }
                        fullAnswer += chunk;
                        // Send text chunk
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`)
                        );
                    }

                    // Save assistant response to history
                    if (sessionId) {
                        await addMessage(sessionId, 'assistant', fullAnswer);
                    }

                    // Send sources as final event
                    if (!req.signal.aborted) {
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ type: 'sources', content: sources })}\n\n`)
                        );
                    }

                    // Send done signal
                    if (!req.signal.aborted) {
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
                        );
                        controller.close();
                    }
                } catch (error: any) {
                    console.error("Streaming error:", error);
                    // Only try to send error if controller is still valid and client hasn't disconnected
                    if (!req.signal.aborted) {
                        try {
                            controller.enqueue(
                                encoder.encode(`data: ${JSON.stringify({ type: 'error', content: 'Failed to generate answer' })}\n\n`)
                            );
                            controller.close();
                        } catch (e) {
                            // Ignore error if controller is already closed
                        }
                    }
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (e) {
        console.error("Ask error:", e);
        return NextResponse.json({ error: "Failed to generate answer" }, { status: 500 });
    }
}
