import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
});

export async function query(text: string, params?: any[]) {
    return pool.query(text, params);
}

export async function initDB() {
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

export default pool;
