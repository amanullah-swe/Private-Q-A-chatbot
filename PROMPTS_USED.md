# Prompts Used

The following conceptual prompts were used to guide the development of this project.

## 🚀 The Master Prompt
> "Build a high-performance, private Knowledge Q&A application using the Next.js App Router, TypeScript, and Tailwind CSS. The core functionality must include a robust RAG (Retrieval Augmented Generation) pipeline orchestrated by LangChain.js.
> 
> **Key Technical Requirements:**
> 1. **Multi-Format Ingestion**: Support for .pdf (using dynamic imports for `pdf-parse`), .docx (mammoth), and .md files.
> 2. **Persistent Vector Storage**: Use PostgreSQL with the `pgvector` extension instead of in-memory stores to ensure data persists across restarts.
> 3. **AI Core**: Integrate Google Gemini (`gemini-3-flash-preview` for answers and `gemini-embedding-001` for vectors) for its speed and context window.
> 4. **Real-time UX**: Implement Server-Sent Events (SSE) for token-streaming responses and a polished, dark-themed chat interface with Framer Motion animations.
> 5. **Contextual Memory**: Maintain multi-turn conversations using a SQL-backed chat history.
> 6. **Deployment Ready**: Containerize the app with an optimized Multi-stage Dockerfile for standalone output."

## 🧱 Why Antigravity & Gemini?

### Antigravity IDE
I chose **Antigravity** as the primary IDE for this project because it is architected for AI-native development. Unlike traditional IDEs with AI plugins, Antigravity provides:
- **Deep Agentic Integration**: The IDE understands the entire workspace context, allowing it to execute complex, multi-file refactors autonomously.
- **Workflow Automation**: Built-in support for `.agent/workflows` allowed me to automate repetitive setup tasks during development.
- **Enhanced Debugging**: The integrated terminal and browser tools within the agentic loop made debugging the RAG pipeline significantly faster.

### Google Gemini API
I opted for **Google Gemini** over other architectures (like OpenAI or self-hosted models) for several strategic reasons:
- **Native Multimodality**: Gemini's architecture is natively multimodal, making it exceptionally good at parsing structured and unstructured data from mixed-format documents.
- **Flash Performance**: The `gemini-3-flash-preview` model offers near-instant response times for streaming, which is critical for a smooth chat experience.
- **Cost-Effective Scalability**: Gemini provides a generous free tier and competitive pricing for high-volume embedding and generation tasks, making it ideal for independent developers.

---

## 📝 Development Phases (12 Granular Prompts)

1.  **Project Initialization & Architecture**:
    "Initialize a Next.js 15 project with TypeScript and Tailwind CSS 4. Setup a modular folder structure separating `/lib` for services, `/app/api` for routes, and `/components` for atomic UI elements."

2.  **Persistent Vector Infrastructure**:
    "Configure a PostgreSQL database with the `pgvector` extension. Create a schema that includes a `documents` table for embeddings and a `chat_sessions` table for persistent message history."

3.  **PDF Extraction Engine**:
    "Implement a robust PDF parsing utility using `pdf-parse`. Ensure the library is dynamically imported to avoid native dependency issues during the Next.js build process."

4.  **Multi-Format Document Support**:
    "Extend the ingestion pipeline to support `.docx` using `mammoth` and `.md` files. Create a unified `parseFile` service that returns normalized text and metadata for any supported file type."

5.  **Vector Store Integration**:
    "Create a LangChain-compatible `PGVectorStore` service. Configure it to use `gemini-embedding-001` for high-dimensional text vectorization and PostgreSQL for persistent storage."

6.  **Contextual RAG Pipeline**:
    "Develop a retrieval service that takes a user query, embeds it, and performs a similarity search against the vector store. Implement semantic chunking with overlap to preserve technical context."

7.  **Real-Time Streaming API (SSE)**:
    "Build a Next.js API route (`/api/ask`) that uses Server-Sent Events (SSE) to stream AI responses token-by-token. Use `gemini-3-flash-preview` for low-latency delivery."

8.  **Multi-Turn Conversation Memory**:
    "Implement a chat history manager that fetches previous messages from the database based on a `sessionId`. Inject this history into the LLM prompt to enable context-aware follow-up questions."

9.  **Premium Frontend Workspace**:
    "Design a dark-themed chat interface using Tailwind CSS and Framer Motion. Include a sidebar for document management and a main chat area with smooth typing animations."

10. **System Health Monitoring**:
    "Create a `/health` API and a corresponding dashboard component. It should verify the status of the PostgreSQL connection, Gemini API latency, and local storage availability."

11. **Enterprise Error Handling**:
    "Implement a global React Error Boundary and a central notification system using `react-hot-toast`. Ensure the UI gracefully handles API timeouts and database connection drops."

12. **Production Deployment (Docker)**:
    "Write a multi-stage `Dockerfile` optimized for standalone Next.js output. Configure `docker-compose.yml` to orchestrate the application and a persistent PostgreSQL container with health checks."
