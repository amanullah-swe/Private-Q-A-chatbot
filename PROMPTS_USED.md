# Prompts Used

The following conceptual prompts were used to guide the development of this project:

1.  **Project Initialization**:
    "Create a Next.js App Router project with TypeScript and Tailwind CSS. Configure it for a minimal RAG application structure."

2.  **Backend Logic**:
    "Implement a secure API route for uploading text files. Save them to disk and store their metadata in a JSON file."
    "Create a RAG utility service that uses LangChain to chunk text files, embed them using OpenAI, and store them in an in-memory vector store."

3.  **Frontend Interface**:
    "Build a clean Home page with a sidebar for document uploads and a list of files. The main area should be a chat interface."
    "Ensure the UI handles loading states for uploading and asking questions."

4.  **System Health**:
    "Create a status page that checks the connectivity of the backend, storage system, and OpenAI API."

5.  **Documentation & Deployment**:
    "Generate a Dockerfile optimized for Next.js standalone output to allow easy local containerized execution."
    "Write a README explaining how the RAG pipeline works (Ingest -> Embed -> Retrieve -> Generate)."
