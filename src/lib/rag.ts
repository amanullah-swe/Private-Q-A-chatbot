import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "@langchain/core/documents";
import { query } from "./db";

export interface RAGStatus {
    llm: 'OK' | 'ERROR';
}

// Configuration for PGVector
const pgConfig = {
    postgresConnectionOptions: {
        connectionString: process.env.POSTGRES_URL,
    },
    tableName: "document_vectors",
    columns: {
        idColumnName: "id",
        vectorColumnName: "vector",
        contentColumnName: "content",
        metadataColumnName: "metadata",
    },
};

export async function getVectorStore() {
    const embeddings = new GoogleGenerativeAIEmbeddings({
        modelName: "models/gemini-embedding-001",
        apiKey: process.env.GOOGLE_API_KEY,
    });

    return PGVectorStore.initialize(embeddings, pgConfig);
}

export async function deleteDocumentFromStore(id: string) {
    try {
        await query("DELETE FROM document_vectors WHERE cmetadata->>'doc_id' = $1", [id]);
        console.log(`Deleted vectors for doc ${id}`);
    } catch (e) {
        console.error("Error deleting vectors:", e);
    }
}

export async function addDocumentToStore(id: string, text: string, metadata: any) {
    try {
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 500,
            chunkOverlap: 100,
        });

        const docs = await splitter.createDocuments(
            [text],
            [{ ...metadata, doc_id: id }]
        );

        const store = await getVectorStore();
        await store.addDocuments(docs);
        console.log(`Added ${docs.length} chunks to vector store for ${metadata.filename}`);
    } catch (error) {
        console.error("Error adding document to vector store:", error);
        throw error;
    }
}

export async function queryDocuments(question: string) {
    const store = await getVectorStore();
    const results = await store.similaritySearch(question, 3);
    return results;
}

export async function checkLLMConnectivity(): Promise<'OK' | 'ERROR'> {
    try {
        const embeddings = new GoogleGenerativeAIEmbeddings({
            modelName: "models/gemini-embedding-001",
            apiKey: process.env.GOOGLE_API_KEY,
            maxRetries: 1,
        });
        // Actually call the API to verify connectivity
        await embeddings.embedQuery("test");
        return 'OK';
    } catch (e) {
        return 'ERROR';
    }
}
