# AI Implementation Notes

## 🛠️ Verified & Used Tools
- **LangChain.js**: Core orchestration for the RAG pipeline.
- **Google Gemini**:
    - `gemini-2.0-flash` / `gemini-3-flash-preview`: Fast streaming LLMs for conversational answers.
    - `gemini-embedding-001`: High-performance text vectorization.
- **PGVectorStore**: Integrated vector store using PostgreSQL's `pgvector` extension for persistent storage.
- **Parsers**:
    - `pdf-parse`: Local PDF text extraction (dynamically imported for build compatibility).
    - `mammoth`: High-fidelity DOCX text extraction.

## 🏛️ Architecture Decisions
- **Persistent Storage**: Migrated vectors to PostgreSQL to ensure data survives container restarts and app rebuilds.
- **Streaming (SSE)**: Implemented Server-Sent Events to stream AI responses token-by-token, significantly improving user experience.
- **Conversation Memory**: Stored in a `chat_sessions` SQL table, enabling multi-turn conversations and follow-up questions.
- **Build Optimization**: Configured `webpack.externals` and `serverExternalPackages` to handle native Node.js dependencies like `pdf-parse`.

## 📝 Prompt History (Development Stages)

### Phase 1: Foundation
> "Create a Next.js App Router project with TypeScript and Tailwind CSS. Setup a RAG utility that chunks text files, embeds them using Gemini, and stores them in PostgreSQL with pgvector."

### Phase 2: Multi-Format Support
> "Extend the parser to support .pdf (using pdf-parse), .docx (using mammoth), and .md files. Create a unified `parseFile` utility and update the document storage logic to handle blobs."

### Phase 3: Streaming & UI
> "Implement streaming answers from Gemini. Update the React frontend to use a `ReadableStream` and show a typing cursor. Add file-type icons (📕, 📘, 📗) in the document list."

### Phase 4: Chat Memory
> "Create a `chat_sessions` table to store message history. Update the `/api/ask` route to fetch history, include it in the Gemini prompt, and save new messages to enable context-aware follow-ups."

### Phase 5: Error UX & Deployment
> "Implement a global Error Boundary, toast notifications for API success/errors, and a health banner. Optimize the Dockerfile for standalone output and dev volumes."

## 🔬 Technical Nuances
- **hallucination-guard**: Explicitly instructs Gemini to only answer based on provided context and admit when it doesn't know.
- **SSE Parsing**: Handles interleaved text fragments and source metadata in a single stream using typed JSON chunks.
