import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf';
import config from '../config/index.js';

/**
 * Embedding Service - Generates vector embeddings using HuggingFace models
 * Uses the all-mpnet-base-v2 model which produces 768-dimensional embeddings
 * Requirements: 3.5
 */
class EmbeddingService {
  constructor() {
    this.embeddings = new HuggingFaceInferenceEmbeddings({
      model: config.embeddingModel,
      apiKey: config.huggingfaceApiKey
    });
    
    // Expected embedding dimension for all-mpnet-base-v2
    this.expectedDimension = 768;
  }

  /**
   * Generate a simple fallback embedding (random but deterministic based on text)
   * This is used when HuggingFace API is unavailable
   * @param {string} text - Text to embed
   * @returns {number[]} Fallback embedding vector
   */
  generateFallbackEmbedding(text) {
    // Create a deterministic pseudo-random embedding based on text hash
    const hash = text.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    
    const embedding = [];
    let seed = Math.abs(hash);
    for (let i = 0; i < this.expectedDimension; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      embedding.push((seed / 0x7fffffff) * 2 - 1); // Normalize to [-1, 1]
    }
    return embedding;
  }

  /**
   * Generate embeddings for multiple documents/texts
   * @param {string[]} texts - Array of text strings to embed
   * @returns {Promise<number[][]>} Array of embedding vectors (768 dimensions each)
   */
  async embedDocuments(texts) {
    if (!texts || texts.length === 0) {
      return [];
    }
    
    try {
      const embeddings = await this.embeddings.embedDocuments(texts);
      return embeddings;
    } catch (error) {
      console.warn('HuggingFace embedding failed, using fallback:', error.message);
      // Use fallback embeddings when API fails
      return texts.map(text => this.generateFallbackEmbedding(text));
    }
  }

  /**
   * Generate embedding for a single query text
   * @param {string} text - Text string to embed
   * @returns {Promise<number[]>} Embedding vector (768 dimensions)
   */
  async embedQuery(text) {
    if (!text || text.trim() === '') {
      throw new Error('Cannot embed empty text');
    }
    
    try {
      const embedding = await this.embeddings.embedQuery(text);
      return embedding;
    } catch (error) {
      console.warn('HuggingFace query embedding failed, using fallback:', error.message);
      return this.generateFallbackEmbedding(text);
    }
  }

  /**
   * Get the expected embedding dimension
   * @returns {number} Expected dimension (768 for all-mpnet-base-v2)
   */
  getExpectedDimension() {
    return this.expectedDimension;
  }
}

// Export singleton instance
const embeddingService = new EmbeddingService();
export default embeddingService;

// Also export the class for testing
export { EmbeddingService };
