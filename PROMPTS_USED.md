# Prompts Used

The following conceptual prompts were used to guide the development of this project.

## 🚀 The Master Prompt
> "Build a high-performance, private Knowledge Q&A application using the Next.js App Router, TypeScript, and Tailwind CSS. The core functionality must include a robust RAG (Retrieval Augmented Generation) pipeline orchestrated by LangChain.js.
> 
> **Key Technical Requirements:**
> 1. **Multi-Format Ingestion**: Support for .pdf (using dynamic imports for `pdf-parse`), .docx (mammoth), and .md files.
> 2. **Persistent Vector Storage**: Use PostgreSQL with the `pgvector` extension instead of in-memory stores to ensure data persists across restarts.
> 3. **AI Core**: Integrate Google Gemini (`gemini-2.0-flash` for answers and `gemini-embedding-001` for vectors) for its speed and context window.
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
- **Flash Performance**: The `gemini-2.0-flash` model offers near-instant response times for streaming, which is critical for a smooth chat experience.
- **Cost-Effective Scalability**: Gemini provides a generous free tier and competitive pricing for high-volume embedding and generation tasks, making it ideal for independent developers.

---

## 📝 Development Phases (Granular Prompts)

1.  **Project Initialization**:
    "Create a Next.js App Router project with TypeScript and Tailwind CSS. Configure it for a minimal RAG application structure."

2.  **Backend Logic**:
    "Implement a secure API route for uploading text files. Save them to disk and store their metadata in a JSON file."
    "Create a RAG utility service that uses LangChain to chunk text files, embed them using OpenAI, and store them in an in-memory vector store." (Note: Later migrated to PGVector and Gemini).

3.  **Frontend Interface**:
    "Build a clean Home page with a sidebar for document uploads and a list of files. The main area should be a chat interface."
    "Ensure the UI handles loading states for uploading and asking questions."

4.  **System Health**:
    "Create a status page that checks the connectivity of the backend, storage system, and OpenAI API."

5.  **Documentation & Deployment**:
    "Generate a Dockerfile optimized for Next.js standalone output to allow easy local containerized execution."
    "Write a README explaining how the RAG pipeline works (Ingest -> Embed -> Retrieve -> Generate)."
