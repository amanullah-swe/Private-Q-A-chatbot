# Deployment Guide: Vercel

This guide provides step-by-step instructions to deploy the **Private Q&A Chatbot** to Vercel.

## 1. Prerequisites

- A [Vercel](https://vercel.com) account.
- A [Neon](https://neon.tech) database with the `pgvector` extension enabled.
- A [Google AI Studio](https://aistudio.google.com/) API Key for Gemini.
- (Optional) An OpenAI API Key if you plan to use OpenAI models.

## 2. Environment Variables

You will need to add the following Environment Variables in your Vercel Project Settings:

| Variable | Description |
| :--- | :--- |
| `POSTGRES_URL` | Your Neon connection string (e.g., `postgresql://user:pass@ep-bold-bar-ailexzv9.aws.neon.tech/neondb?sslmode=require`) |
| `GOOGLE_API_KEY` | Your Google Gemini API Key. |
| `OPENAI_API_KEY` | (Optional) Your OpenAI API Key. |

> [!IMPORTANT]
> Ensure that `POSTGRES_URL` includes `?sslmode=require` to work with Neon.

## 3. Database Setup (Neon)

Before deploying, ensure your Neon database is initialized:

1. Enable PGVector:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
2. The application will automatically create the necessary tables (`chats`, `documents`, `chat_sessions`, `document_vectors`) on the first request to the health API or any other storage-related endpoint.

## 4. Deployment Steps

1. **Push to GitHub/GitLab/Bitbucket**: Ensure your code is in a remote repository.
2. **Import to Vercel**:
   - Go to the Vercel Dashboard and click "Add New" > "Project".
   - Select your repository.
3. **Configure Build Settings**:
   - Framework Preset: **Next.js**
   - Root Directory: `./`
4. **Add Environment Variables**:
   - Expand the "Environment Variables" section and add the keys mentioned in step 2.
5. **Deploy**: Click "Deploy".

## 5. Post-Deployment Verification

1. Once deployed, visit your Vercel URL.
2. Click the **System Status** button in the sidebar.
3. Verify that all components (Database, Vector Storage, Gemini API) show **OK**.

---

### Troubleshooting

- **Serverless Timeout**: If large PDF uploads timeout, ensure `vercel.json` is present with `maxDuration` set to at least 60 seconds (already included in this repository).
- **SSL Issues**: If you get SSL errors, double-check that `POSTGRES_URL` has `sslmode=require`.
