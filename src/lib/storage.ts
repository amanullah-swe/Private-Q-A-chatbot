import { initDB, query } from './db';
import { v4 as uuidv4 } from 'uuid';

// Initialize DB on first import
initDB().catch(console.error);

export interface DocumentMetadata {
    id: string;
    filename: string;
    uploadedAt: number;
}

// Helper to map DB row to metadata
function mapRowToMetadata(row: any): DocumentMetadata {
    return {
        id: row.id,
        filename: row.filename,
        uploadedAt: parseInt(row.uploaded_at),
    };
}

export async function getDocuments(): Promise<DocumentMetadata[]> {
    try {
        const res = await query('SELECT id, filename, uploaded_at FROM documents ORDER BY uploaded_at DESC');
        return res.rows.map(mapRowToMetadata);
    } catch (e) {
        console.error("Error fetching documents:", e);
        return [];
    }
}

export async function saveFile(filename: string, content: string): Promise<DocumentMetadata> {
    const id = uuidv4();
    const uploadedAt = Date.now();

    await query(
        'INSERT INTO documents (id, filename, uploaded_at, content) VALUES ($1, $2, $3, $4)',
        [id, filename, uploadedAt, content]
    );

    return {
        id,
        filename,
        uploadedAt
    };
}

export async function deleteDocument(id: string): Promise<DocumentMetadata | null> {
    try {
        const res = await query('DELETE FROM documents WHERE id = $1 RETURNING id, filename, uploaded_at', [id]);
        if (res.rows.length === 0) return null;
        return mapRowToMetadata(res.rows[0]);
    } catch (e) {
        console.error("Error deleting document:", e);
        return null;
    }
}

export async function getDocumentContent(id: string): Promise<string | null> {
    try {
        const res = await query('SELECT content FROM documents WHERE id = $1', [id]);
        if (res.rows.length === 0) return null;
        return res.rows[0].content;
    } catch (e) {
        console.error("Error fetching content:", e);
        return null;
    }
}

export async function getStatus() {
    try {
        await query('SELECT 1');
        return 'OK';
    } catch (e) {
        return 'ERROR';
    }
}
