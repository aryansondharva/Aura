import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file in backend-js directory
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Debug: Log the Supabase URL being used
console.log('Loading config from:', envPath);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);

const config = {
  // Server configuration
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // CORS configuration
  corsAllowOrigin: process.env.CORS_ALLOW_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  frontendProd: process.env.FRONTEND_PROD || 'https://recallo.faruqweb.com',
  
  // Supabase configuration
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  
  // AI/LLM API keys
  geminiApiKey: process.env.GEMINI_API_KEY,
  groqApiKey: process.env.GROQ_API_KEY,
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
  huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY,
  
  // Pinecone configuration
  pineconeApiKey: process.env.PINECONE_API_KEY,
  pineconeIndexName: process.env.PINECONE_INDEX_NAME || 'document-index',
  
  // Email configuration
  gmailUser: process.env.GMAIL_USER,
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD,
  
  // File upload configuration
  maxFileSize: 5 * 1024 * 1024, // 5MB
  uploadDir: path.join(__dirname, '../../uploads'),
  allowedFileTypes: ['pdf', 'doc', 'docx', 'txt'],
  
  // LLM model configuration
  geminiModel: 'gemini-2.5-flash',
  groqLlamaModel: 'llama-3.1-8b-instant',
  groqGemmaModel: 'gemma2-9b-it',
  embeddingModel: 'sentence-transformers/all-mpnet-base-v2',
  
  // Conversation settings
  maxConversationHistory: 10,
  
  // Chunking settings
  chunkSize: 500,
  chunkOverlap: 50
};

export default config;
