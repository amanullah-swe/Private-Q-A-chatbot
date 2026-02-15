# 🤖 Private Knowledge Q&A: Your Secure AI Workspace

A sophisticated, high-performance RAG (Retrieval Augmented Generation) workspace built with **Next.js 14**, **LangChain**, and **Google Gemini 3.0**. This application transforms your private documents into an interactive, context-aware knowledge base, ensuring all data processing remains secure and efficient.

---

## 🌟 Premium Features

### 📁 Advanced Multi-Format Ingestion
Seamlessly process diverse document types with specialized parsers for high-fidelity extraction:
- **PDF Extraction**: Optimized using `pdf-parse` with dynamic loading.
- **DOCX Processing**: High-fidelity text recovery via `mammoth`.
- **Markdown & Text**: Native support for structured and unstructured data.

### ⚡ Real-Time Streaming AI
Experience instantaneous feedback with **Server-Sent Events (SSE)**. Answers stream token-by-token directly from the Gemini 2.0/3.0 Flash models, providing a fluid, conversational experience.

### 🧠 Semantic Memory & Chat History
The system doesn't just answer; it remembers. 
- **Contextual Follow-ups**: Ask questions like "Can you explain that in more detail?" or "How does this relate to the previous point?".
- **Session Management**: Persistent chat history stored in PostgreSQL for seamless continuity.

### 🐘 Engineered Storage (pgvector)
Discard ephemeral stores for a robust, persistent vector database.
- **PostgreSQL Core**: Industrial-grade metadata management.
- **pgvector Extension**: Native high-dimensional vector similarity search.

### 🚀 Industrial-Grade UX
- **Global Error Boundaries**: Robust crash prevention and recovery.
- **Service Health Dashboard**: Real-time monitoring of API (Gemini), Storage (PostgreSQL), and Backend connectivity.
- **Micro-Animations**: Blinking cursors, hover effects, and loading states for a premium feel.

---

## 🛠️ The Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Next.js 14 (App Router), React, Tailwind CSS |
| **Orchestration** | LangChain.js |
| **LLM** | Google Gemini 2.0 Flash / Gemini 3.0 Preview |
| **Embeddings** | Google Generative AI (gemini-embedding-001) |
| **Database** | PostgreSQL + **pgvector** |
| **Deployment** | Docker & Docker Compose (Standalone Optimization) |

---

## 🚀 Live Demo
Check out the live application here: **[private-q-a-chatbot.vercel.app](https://private-q-a-chatbot.vercel.app/)**

---

## 🚀 Quick Start (Dockerized)

Ensure you have your **Google API Key** ready.

1.  **Initialize Environment**
    ```bash
    cp .env.example .env
    # Edit .env and paste your GOOGLE_API_KEY
    ```

2.  **Launch Workspace**
    ```bash
    docker compose up --build
    ```
    Visit [http://localhost:3000](http://localhost:3000) once ready.

---

## 📖 The Architecture

1.  **Ingest**: Documents are loaded and parsed into raw text using specialized Node.js libraries.
2.  **Chunk**: Text is segmented into chunks (~500 chars) with semantic overlap to maintain context.
3.  **Embed**: Chunks are converted into 768-dimensional vectors using Google's embedding model.
4.  **Store**: Vectors and source text are stored in a pgvector-enabled PostgreSQL database.
5.  **Retrieve**: User questions are embedded and compared against the store using cosine similarity.
6.  **Augment**: Top-k relevant chunks are injected into the LLM prompt alongside chat history.
7.  **Generate**: Gemini streams a grounded, context-aware response to the user.

---

## 👤 About the Developer

Developed by **Shaikh Amanullah**, a Full-Stack Developer and AI Solutions Architect specializing in Agentic AI and sophisticated web applications. 

<!-- - **Portfolio**: [amanullah.dev](#) -->
- **Specialization**: RAG Systems, MERN Stack, Next.js, and Agentic AI Workflows.
