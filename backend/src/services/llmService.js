import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatGroq } from '@langchain/groq';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import config from '../config/index.js';

/**
 * LLM Service - Manages AI model interactions using LangChain.js
 * Supports Google Gemini and Groq models with conversation history management
 */
class LLMService {
  constructor() {
    // Initialize Google Gemini model
    this.gemini = new ChatGoogleGenerativeAI({
      model: config.geminiModel,
      apiKey: config.geminiApiKey,
      temperature: 0.7
    });

    // Initialize Groq Llama model
    this.groq = new ChatGroq({
      model: config.groqLlamaModel,
      apiKey: config.groqApiKey,
      temperature: 0.3
    });

    // Initialize Groq Gemma model
    this.groqGemma = new ChatGroq({
      model: config.groqGemmaModel,
      apiKey: config.groqApiKey,
      temperature: 0.3
    });

    // Message history storage - Map of sessionId to array of messages
    this.messageHistories = new Map();
  }

  /**
   * Get or create message history for a session
   * @param {string} sessionId - Unique session identifier
   * @returns {Array} Array of message objects
   */
  getMessageHistory(sessionId) {
    if (!this.messageHistories.has(sessionId)) {
      this.messageHistories.set(sessionId, []);
    }
    return this.messageHistories.get(sessionId);
  }


  /**
   * Add a message to the history
   * @param {string} sessionId - Session identifier
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content - Message content
   */
  addToHistory(sessionId, role, content) {
    const history = this.getMessageHistory(sessionId);
    history.push({ role, content });
  }

  /**
   * Get recent messages with sliding window of 10
   * @param {string} sessionId - Session identifier
   * @returns {Array} Array of LangChain message objects (max 10)
   */
  getRecentMessages(sessionId) {
    const history = this.getMessageHistory(sessionId);
    // Keep only last 10 messages (sliding window)
    const recentHistory = history.slice(-config.maxConversationHistory);
    
    return recentHistory.map(msg => {
      if (msg.role === 'user') {
        return new HumanMessage(msg.content);
      } else if (msg.role === 'assistant') {
        return new AIMessage(msg.content);
      } else if (msg.role === 'system') {
        return new SystemMessage(msg.content);
      }
      return new HumanMessage(msg.content);
    });
  }

  /**
   * Clear message history for a session
   * @param {string} sessionId - Session identifier
   */
  clearHistory(sessionId) {
    this.messageHistories.delete(sessionId);
  }

  /**
   * Chat with AI using Groq model with conversation history (primary)
   * Falls back to Gemini if Groq fails
   * @param {string} message - User message
   * @param {string} sessionId - Session identifier for history management
   * @param {string} [systemPrompt] - Optional system prompt
   * @returns {Promise<string>} AI response content
   */
  async chat(message, sessionId, systemPrompt = null) {
    const recentMessages = this.getRecentMessages(sessionId);
    
    const messages = [];
    
    // Add system prompt if provided
    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt));
    }
    
    // Add conversation history
    messages.push(...recentMessages);
    
    // Add current user message
    messages.push(new HumanMessage(message));
    
    let responseContent;
    
    try {
      // Try Groq first (faster and no quota issues)
      const response = await this.groq.invoke(messages);
      responseContent = response.content;
    } catch (groqError) {
      console.warn('Groq failed, trying Gemini:', groqError.message);
      try {
        const response = await this.gemini.invoke(messages);
        responseContent = response.content;
      } catch (geminiError) {
        console.error('Both Groq and Gemini failed:', geminiError.message);
        throw new Error('AI service temporarily unavailable. Please try again later.');
      }
    }
    
    // Update history with user message and AI response
    this.addToHistory(sessionId, 'user', message);
    this.addToHistory(sessionId, 'assistant', responseContent);
    
    return responseContent;
  }


  /**
   * Chat with Groq Llama model (without history)
   * @param {string} message - User message
   * @param {string} [systemPrompt] - Optional system prompt
   * @returns {Promise<string>} AI response content
   */
  async chatWithGroq(message, systemPrompt = null) {
    const messages = [];
    
    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt));
    }
    
    messages.push(new HumanMessage(message));
    
    const response = await this.groq.invoke(messages);
    return response.content;
  }

  /**
   * Chat with Groq Gemma model (without history)
   * @param {string} message - User message
   * @param {string} [systemPrompt] - Optional system prompt
   * @returns {Promise<string>} AI response content
   */
  async chatWithGroqGemma(message, systemPrompt = null) {
    const messages = [];
    
    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt));
    }
    
    messages.push(new HumanMessage(message));
    
    const response = await this.groqGemma.invoke(messages);
    return response.content;
  }

  /**
   * Generate a smart title for a conversation based on first exchange
   * @param {string} userMessage - First user message
   * @param {string} aiResponse - First AI response
   * @returns {Promise<string>} Generated title (3-6 words)
   */
  async generateTitle(userMessage, aiResponse) {
    const prompt = `Generate a short title (3-6 words) for this conversation. Return ONLY the title, no quotes or extra text:
User: ${userMessage}
Assistant: ${aiResponse}`;

    try {
      const response = await this.groq.invoke([
        new HumanMessage(prompt)
      ]);
      return response.content.replace(/["']/g, '').trim();
    } catch (error) {
      console.warn('Title generation failed:', error.message);
      // Return a default title if generation fails
      return 'New Conversation';
    }
  }

  /**
   * Generate content using Groq without history (for one-off generations)
   * Falls back to Gemini if Groq fails
   * @param {string} prompt - The prompt to send
   * @param {string} [systemPrompt] - Optional system prompt
   * @returns {Promise<string>} Generated content
   */
  async generate(prompt, systemPrompt = null) {
    const messages = [];
    
    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt));
    }
    
    messages.push(new HumanMessage(prompt));
    
    try {
      const response = await this.groq.invoke(messages);
      return response.content;
    } catch (groqError) {
      console.warn('Groq generate failed, trying Gemini:', groqError.message);
      try {
        const response = await this.gemini.invoke(messages);
        return response.content;
      } catch (geminiError) {
        console.error('Both Groq and Gemini generate failed:', geminiError.message);
        throw new Error('AI service temporarily unavailable');
      }
    }
  }
}

// Export singleton instance
const llmService = new LLMService();
export default llmService;

// Also export the class for testing
export { LLMService };
