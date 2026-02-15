import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

export async function query(text: string, params?: any[]) {
    return pool.query(text, params);
}

export async function initDB() {
    // Create chats table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS chats (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
    `);

    // Create documents table if not exists
    await pool.query(`
        CREATE TABLE IF NOT EXISTS documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            filename TEXT NOT NULL,
            uploaded_at BIGINT NOT NULL,
            content TEXT NOT NULL
        );
    `);

    // Create chat_sessions table for conversation memory
    await pool.query(`
        CREATE TABLE IF NOT EXISTS chat_sessions (
            id SERIAL PRIMARY KEY,
            session_id UUID NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
    `);

    await pool.query('CREATE INDEX IF NOT EXISTS idx_chat_session_id ON chat_sessions(session_id, created_at);');

    // PGVector extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');

    console.log("Database initialized");
}

export async function checkDbConnectivity() {
    try {
        await pool.query('SELECT 1');
        return 'OK';
    } catch (e) {
        console.error("Database health check failed:", e);
        return 'Error';
    }
}

export default pool;
