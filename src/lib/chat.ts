import { query } from './db';
import { v4 as uuidv4 } from 'uuid';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    created_at?: string;
}

export interface Chat {
    id: string;
    title: string;
    created_at: string;
}

export async function createChat(title: string = "New Chat"): Promise<string> {
    const id = uuidv4();
    await query(
        'INSERT INTO chats (id, title) VALUES ($1, $2)',
        [id, title]
    );
    return id;
}

export async function getChats(): Promise<Chat[]> {
    try {
        const res = await query('SELECT id, title, created_at FROM chats ORDER BY created_at DESC');
        return res.rows;
    } catch (e) {
        console.error("Error fetching chats:", e);
        return [];
    }
}

export async function updateChatTitle(id: string, title: string): Promise<void> {
    await query('UPDATE chats SET title = $1 WHERE id = $2', [title, id]);
}

export async function deleteChat(id: string): Promise<void> {
    // Delete messages first (if no cascade)
    await query('DELETE FROM chat_sessions WHERE session_id = $1', [id]);
    await query('DELETE FROM chats WHERE id = $1', [id]);
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
            'SELECT role, content, created_at FROM chat_sessions WHERE session_id = $1 ORDER BY created_at ASC', // Removing LIMIT for now to show full context in UI
            [sessionId]
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
