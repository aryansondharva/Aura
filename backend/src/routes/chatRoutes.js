import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../utils/supabase.js';
import { getIndex } from '../utils/pinecone.js';
import llmService from '../services/llmService.js';
import embeddingService from '../services/embeddingService.js';
import { syncUserFromAuth } from '../utils/userSync.js';

const router = express.Router();

/**
 * Keywords for routing messages to different handlers
 * Requirements: 4.5
 */
const SUMMARY_KEYWORDS = ['summarize', 'summary', 'overview', 'brief', 'outline', 'recap'];
const QUESTION_KEYWORDS = ['generate questions', 'create questions', 'make questions', 'quiz me', 'test me'];

/**
 * Detect message type based on keywords
 * @param {string} message - User message
 * @returns {'summary' | 'questions' | 'qa'} Message type
 */
export function detectMessageType(message) {
  const lowerMessage = message.toLowerCase();
  
  // Check for summary keywords
  for (const keyword of SUMMARY_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      return 'summary';
    }
  }
  
  // Check for question generation keywords
  for (const keyword of QUESTION_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      return 'questions';
    }
  }
  
  // Default to Q&A
  return 'qa';
}

/**
 * Store chat log in database
 * @param {string} userId - User ID
 * @param {string} conversationId - Conversation ID
 * @param {string} userMessage - User's message
 * @param {string} responseMessage - AI's response
 * @returns {Promise<void>}
 */
async function storeChatLog(userId, conversationId, userMessage, responseMessage) {
  const messageId = uuidv4();
  
  const { error } = await supabase.from('chat_logs').insert({
    user_id: userId,
    conversation_id: conversationId,
    user_message: userMessage,
    response_message: responseMessage,
    created_at: new Date().toISOString(),
    message_id: messageId
  });
  
  if (error) {
    console.error('Error storing chat log:', error);
    throw new Error('Failed to store chat log');
  }
}


/**
 * Create a new conversation
 * @param {string} userId - User ID
 * @param {string} [title] - Optional title
 * @returns {Promise<string>} Conversation ID
 */
async function createConversation(userId, title = 'New Conversation') {
  // Ensure user exists in database
  await syncUserFromAuth(userId);
  
  const conversationId = uuidv4();
  
  const { error } = await supabase.from('conversations').insert({
    conversation_id: conversationId,
    user_id: userId,
    title: title,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  
  if (error) {
    console.error('Error creating conversation:', error);
    throw new Error('Failed to create conversation');
  }
  
  return conversationId;
}

/**
 * Update conversation title
 * @param {string} conversationId - Conversation ID
 * @param {string} title - New title
 * @returns {Promise<void>}
 */
async function updateConversationTitle(conversationId, title) {
  const { error } = await supabase
    .from('conversations')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('conversation_id', conversationId);
  
  if (error) {
    console.error('Error updating conversation title:', error);
  }
}

/**
 * Check if this is the first message in a conversation
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<boolean>}
 */
async function isFirstMessage(conversationId) {
  const { data, error } = await supabase
    .from('chat_logs')
    .select('id')
    .eq('conversation_id', conversationId)
    .limit(1);
  
  if (error) {
    console.error('Error checking first message:', error);
    return true; // Assume first message on error
  }
  
  return !data || data.length === 0;
}

/**
 * Query Pinecone for similar document chunks
 * @param {string} query - User query
 * @param {string} userId - User ID
 * @param {number} [topK=5] - Number of results to return
 * @returns {Promise<Array>} Similar chunks with content
 */
async function queryDocuments(query, userId, topK = 5) {
  try {
    // Generate embedding for the query
    const queryEmbedding = await embeddingService.embedQuery(query);
    
    // Query Pinecone
    const index = await getIndex();
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK,
      filter: { user_id: userId },
      includeMetadata: true
    });
    
    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      return [];
    }
    
    // Get chunk IDs from Pinecone results
    const chunkIds = queryResponse.matches.map(match => match.id);
    
    // Fetch full content from Supabase
    const { data: chunks, error } = await supabase
      .from('documents')
      .select('chunk_id, content, filename')
      .in('chunk_id', chunkIds);
    
    if (error) {
      console.error('Error fetching chunks from Supabase:', error);
      return [];
    }
    
    // Combine Pinecone scores with Supabase content
    return queryResponse.matches.map(match => {
      const chunk = chunks.find(c => c.chunk_id === match.id);
      return {
        id: match.id,
        score: match.score,
        content: chunk?.content || '',
        filename: chunk?.filename || ''
      };
    }).filter(item => item.content);
  } catch (error) {
    console.error('Error querying documents:', error);
    return [];
  }
}


/**
 * Generate summary from document chunks
 * @param {Array} chunks - Document chunks
 * @returns {Promise<string>} Summary
 */
async function generateSummary(chunks) {
  const context = chunks.map(c => c.content).join('\n\n');
  const prompt = `Please provide a comprehensive summary of the following content:\n\n${context}`;
  
  return await llmService.generate(prompt);
}

/**
 * Generate questions from document chunks
 * @param {Array} chunks - Document chunks
 * @returns {Promise<string>} Generated questions
 */
async function generateQuestions(chunks) {
  const context = chunks.map(c => c.content).join('\n\n');
  const prompt = `Based on the following content, generate 5 thought-provoking questions that would help someone understand and remember the key concepts:\n\n${context}`;
  
  return await llmService.generate(prompt);
}

/**
 * Answer question using document context
 * @param {string} question - User question
 * @param {Array} chunks - Relevant document chunks
 * @param {string} sessionId - Session ID for conversation history
 * @returns {Promise<string>} Answer
 */
async function answerFromDocuments(question, chunks, sessionId) {
  const context = chunks.map(c => c.content).join('\n\n');
  const systemPrompt = `You are a helpful assistant. Answer the user's question based on the following context from their documents. If the context doesn't contain relevant information, say so and provide a general answer if possible.\n\nContext:\n${context}`;
  
  return await llmService.chat(question, sessionId, systemPrompt);
}

/**
 * POST /chat - General chat with AI
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, user_id, conversation_id } = req.body;
    
    // Validate required fields
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    let currentConversationId = conversation_id;
    let isNewConversation = false;
    
    // Create new conversation if not provided
    if (!currentConversationId && user_id) {
      currentConversationId = await createConversation(user_id);
      isNewConversation = true;
    }
    
    // Use conversation_id as session ID for history management
    const sessionId = currentConversationId || uuidv4();
    
    // Generate AI response
    const response = await llmService.chat(message, sessionId);
    
    // Store chat log if user_id is provided
    if (user_id && currentConversationId) {
      await storeChatLog(user_id, currentConversationId, message, response);
      
      // Generate smart title for first message
      if (isNewConversation || await isFirstMessage(currentConversationId)) {
        const title = await llmService.generateTitle(message, response);
        await updateConversationTitle(currentConversationId, title);
      }
    }
    
    res.json({
      response,
      conversation_id: currentConversationId
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});


/**
 * POST /ask - Document-aware chat with keyword routing
 * Routes to summary, question generation, or document Q&A based on keywords
 * Requirements: 4.5, 15.3, 15.4, 15.5
 */
router.post('/ask', async (req, res) => {
  try {
    const { message, user_id, conversation_id } = req.body;
    
    // Validate required fields
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required for document queries' });
    }
    
    let currentConversationId = conversation_id;
    let isNewConversation = false;
    
    // Create new conversation if not provided
    if (!currentConversationId) {
      currentConversationId = await createConversation(user_id);
      isNewConversation = true;
    }
    
    // Detect message type based on keywords
    const messageType = detectMessageType(message);
    
    // Query relevant documents
    const relevantChunks = await queryDocuments(message, user_id);
    
    let response;
    
    if (relevantChunks.length === 0) {
      // No documents found - provide general response
      response = await llmService.chat(
        message, 
        currentConversationId,
        'You are a helpful assistant. The user has not uploaded any documents yet, or no relevant documents were found. Provide a helpful response and suggest they upload relevant documents for more specific answers.'
      );
    } else {
      // Route based on message type
      switch (messageType) {
        case 'summary':
          response = await generateSummary(relevantChunks);
          break;
        case 'questions':
          response = await generateQuestions(relevantChunks);
          break;
        case 'qa':
        default:
          response = await answerFromDocuments(message, relevantChunks, currentConversationId);
          break;
      }
    }
    
    // Store chat log
    await storeChatLog(user_id, currentConversationId, message, response);
    
    // Generate smart title for first message
    if (isNewConversation || await isFirstMessage(currentConversationId)) {
      const title = await llmService.generateTitle(message, response);
      await updateConversationTitle(currentConversationId, title);
    }
    
    res.json({
      response,
      conversation_id: currentConversationId,
      message_type: messageType,
      documents_found: relevantChunks.length
    });
  } catch (error) {
    console.error('Ask error:', error);
    res.status(500).json({ error: 'Failed to process document query' });
  }
});

export default router;
