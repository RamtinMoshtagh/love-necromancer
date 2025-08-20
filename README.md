# Love Necromancer
<img width="1265" height="644" alt="Screenshot 2025-08-20 at 11 03 58" src="https://github.com/user-attachments/assets/37fe5ccf-2de8-4c12-abe0-60e944317aad" />
<img width="898" height="1083" alt="Screenshot 2025-08-20 at 11 04 15" src="https://github.com/user-attachments/assets/06130e76-1809-48f5-9119-5cdbfe5af43d" />


*A grief-safe ritual for talking to a memory of someone you loved.*  
Built with **Next.js (App Router)**, **Supabase**, and **RAG** over your encrypted memories.

## What it is
- **Persona of a loved one**: language, tone, boundaries, and optional TTS.
- **Encrypted memories**: upload files or paste raw text; content is encrypted before storage.
- **Auto-indexed recall**: pgvector + embeddings to ground replies in real memories.
- **Streaming chat**: fast, token-by-token responses inside time-boxed “ritual sessions.”
- **Guardrails**: never claims to be the real person; clear session endings.

## How it works (brief)
1. Magic-link auth → create a **Relationship** (who the persona represents).  
2. Build a **Persona** (style, boundaries, language).  
3. **Upload** or **paste** memories → encrypted → auto-indexed into chunks + vectors.  
4. **Chat** → retrieves top memories per turn → replies in the chosen voice.

## Tech
- **Next.js 15**, **TypeScript**, **Tailwind**
- **Supabase** (Auth, Postgres, Storage, RPC) + **pgvector**
- **OpenAI** (embeddings + chat)
- Server-internal indexer (service role) gated by an internal secret

## Privacy & Safety
- Files are **encrypted before upload** with a server key.
- Row Level Security: users can only access their own data.
- Assistant is a **simulation**, not the real person.
