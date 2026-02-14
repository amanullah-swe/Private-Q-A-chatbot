import { query } from './db';
import { v4 as uuidv4 } from 'uuid';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    created_at?: string;
}

export async function createSession(): Promise<string> {
    return uuidv4();
}

export async function addMessage(sessionId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    await query(
        'INSERT INTO chat_sessions (session_id, role, content) VALUES ($1, $2, $3)',
        [sessionId, role, content]
    );
}

export async function getHistory(sessionId: string, limit: number = 20): Promise<ChatMessage[]> {
    try {
        const res = await query(
            'SELECT role, content, created_at FROM chat_sessions WHERE session_id = $1 ORDER BY created_at ASC LIMIT $2',
            [sessionId, limit]
        );
        return res.rows.map((row: any) => ({
            role: row.role as 'user' | 'assistant',
            content: row.content,
            created_at: row.created_at,
        }));
    } catch (e) {
        console.error("Error fetching chat history:", e);
        return [];
    }
}

export async function clearSession(sessionId: string): Promise<void> {
    await query('DELETE FROM chat_sessions WHERE session_id = $1', [sessionId]);
}
