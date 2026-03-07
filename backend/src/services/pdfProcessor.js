import pdfParse from 'pdf-parse';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';
import supabase from '../utils/supabase.js';
import { pineconeIndex } from '../utils/pinecone.js';
import embeddingService from './embeddingService.js';
import llmService from './llmService.js';

/**
 * PDF Processor Service - Handles PDF text extraction, chunking, and storage
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5
 */
class PDFProcessor {
  constructor() {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: config.chunkSize,
      chunkOverlap: config.chunkOverlap
    });
  }

  /**
   * Calculate file hash for duplicate detection
   * @param {Buffer} fileBuffer - File buffer
   * @returns {string} SHA-256 hash of the file
   */
  calculateFileHash(fileBuffer) {
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Extract text from PDF file
   * @param {string} filePath - Path to PDF file
   * @returns {Promise<{text: string, buffer: Buffer}>} Extracted text and file buffer
   */
  async extractText(filePath) {
    const fileBuffer = await fs.readFile(filePath);
    const pdfData = await pdfParse(fileBuffer);
    return { text: pdfData.text, buffer: fileBuffer };
  }

  /**
   * Split text into chunks
   * @param {string} text - Text to split
   * @returns {Promise<string[]>} Array of text chunks
   */
  async chunkText(text) {
    return await this.splitter.splitText(text);
  }


  /**
   * Check if file already exists for user (duplicate detection)
   * @param {string} fileHash - Hash of the file
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if duplicate exists
   */
  async checkDuplicate(fileHash, userId) {
    const { data, error } = await supabase
      .from('documents')
      .select('id')
      .eq('hash_file', fileHash)
      .eq('user_id', userId)
      .limit(1);
    
    if (error) {
      console.error('Error checking duplicate:', error);
      return false;
    }
    
    return data && data.length > 0;
  }

  /**
   * Process PDF for chat - extract, chunk, embed, store, cleanup
   * @param {string} filePath - Path to uploaded PDF file
   * @param {string} userId - User ID
   * @returns {Promise<{success: boolean, chunkCount: number, fileName: string, fileUuid: string}>}
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.7
   */
  async processForChat(filePath, userId) {
    try {
      // Extract text from PDF
      const { text, buffer } = await this.extractText(filePath);
      
      if (!text || !text.trim()) {
        throw new Error('Empty or unreadable PDF');
      }
      
      // Calculate file hash for duplicate detection
      const fileHash = this.calculateFileHash(buffer);
      
      // Check for duplicates
      const isDuplicate = await this.checkDuplicate(fileHash, userId);
      if (isDuplicate) {
        await this.cleanup(filePath);
        return { success: false, duplicate: true, message: 'You have already uploaded this file earlier.' };
      }
      
      // Split text into chunks
      const chunks = await this.chunkText(text);
      const fileUuid = uuidv4();
      const fileName = path.basename(filePath);
      
      // Generate embeddings for all chunks
      const embeddings = await embeddingService.embedDocuments(chunks);
      
      // Store chunks in Supabase (without embeddings - stored in Pinecone)
      const rows = chunks.map((chunk, i) => ({
        chunk_id: `${fileUuid}_chunk_${i}`,
        content: chunk,
        filename: fileName,
        file_uuid: fileUuid,
        user_id: userId,
        uploaded_at: new Date().toISOString(),
        hash_file: fileHash
      }));
      
      const { error: insertError } = await supabase.from('documents').insert(rows);
      if (insertError) {
        throw new Error(`Failed to store chunks: ${insertError.message}`);
      }
      
      // Upsert vectors to Pinecone
      const vectors = embeddings.map((embedding, i) => ({
        id: `${fileUuid}_chunk_${i}`,
        values: embedding,
        metadata: { user_id: userId, file_name: fileName, file_uuid: fileUuid }
      }));
      
      await pineconeIndex.upsert(vectors);
      
      // Cleanup - delete uploaded file
      await this.cleanup(filePath);
      
      return { success: true, chunkCount: chunks.length, fileName, fileUuid };
    } catch (error) {
      // Ensure cleanup on error
      await this.cleanup(filePath);
      throw error;
    }
  }


  /**
   * Calculate string similarity (Jaccard similarity)
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score between 0 and 1
   */
  calculateSimilarity(str1, str2) {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Simple agglomerative clustering based on embeddings
   * @param {number[][]} embeddings - Array of embedding vectors
   * @param {number} threshold - Distance threshold for clustering
   * @returns {number[]} Cluster assignments for each embedding
   */
  clusterEmbeddings(embeddings, threshold = 0.5) {
    const n = embeddings.length;
    const clusters = Array(n).fill(0).map((_, i) => i);
    
    // Calculate cosine similarity between embeddings
    const cosineSimilarity = (a, b) => {
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }
      return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    };
    
    // Simple agglomerative clustering
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const similarity = cosineSimilarity(embeddings[i], embeddings[j]);
        if (similarity > threshold) {
          // Merge clusters
          const oldCluster = clusters[j];
          const newCluster = clusters[i];
          for (let k = 0; k < n; k++) {
            if (clusters[k] === oldCluster) {
              clusters[k] = newCluster;
            }
          }
        }
      }
    }
    
    return clusters;
  }

  /**
   * Process PDF for quiz - extract, cluster, generate topics
   * @param {string} filePath - Path to uploaded PDF file
   * @param {string} userId - User ID
   * @param {string} documentForQuizId - Document for quiz ID
   * @returns {Promise<{success: boolean, topics: Array}>}
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
   */
  async processForQuiz(filePath, userId, documentForQuizId) {
    try {
      // Extract text from PDF
      const { text, buffer } = await this.extractText(filePath);
      
      if (!text || !text.trim()) {
        throw new Error('Empty or unreadable PDF');
      }
      
      const fileHash = this.calculateFileHash(buffer);
      const fileName = path.basename(filePath);
      
      // Split text into chunks
      const chunks = await this.chunkText(text);
      
      // Generate embeddings for clustering
      const embeddings = await embeddingService.embedDocuments(chunks);
      
      // Cluster chunks into topics
      const clusterAssignments = this.clusterEmbeddings(embeddings);
      
      // Group chunks by cluster
      const clusterGroups = {};
      clusterAssignments.forEach((cluster, i) => {
        if (!clusterGroups[cluster]) {
          clusterGroups[cluster] = [];
        }
        clusterGroups[cluster].push(chunks[i]);
      });
      
      const clusterKeys = Object.keys(clusterGroups);
      
      // Check rate limit warning
      if (clusterKeys.length > 30) {
        console.warn('Warning: More than 30 topic groups detected. Rate limits may apply.');
      }
      
      // Generate topics from clusters
      const topics = [];
      const existingTitles = [];
      
      for (const clusterKey of clusterKeys) {
        const mergedContent = clusterGroups[clusterKey].join('\n\n');
        
        // Generate title and summary using AI
        const titlePrompt = `Generate a short topic title (maximum 5 words) for this content:\n\n${mergedContent.substring(0, 1000)}`;
        const title = await llmService.generate(titlePrompt);
        const cleanTitle = title.replace(/["']/g, '').trim().split(' ').slice(0, 5).join(' ');
        
        // Check for similar titles (>80% similarity)
        const isSimilar = existingTitles.some(
          existingTitle => this.calculateSimilarity(cleanTitle, existingTitle) > 0.8
        );
        
        if (isSimilar) {
          continue; // Skip similar topics
        }
        
        existingTitles.push(cleanTitle);
        
        // Generate summary
        const summaryPrompt = `Summarize this content in 2-3 sentences:\n\n${mergedContent.substring(0, 2000)}`;
        const summary = await llmService.generate(summaryPrompt);
        
        const topicId = uuidv4();
        topics.push({
          topic_id: topicId,
          user_id: userId,
          document_for_quiz_id: documentForQuizId,
          title: cleanTitle,
          merged_content: mergedContent,
          topic_summary: summary.trim(),
          topic_status: 'Not Started',
          file_name: fileName,
          hash_file: fileHash,
          archive_status: 'not_archived'
        });
      }
      
      // Store topics in Supabase
      if (topics.length > 0) {
        const { error: insertError } = await supabase.from('topics').insert(topics);
        if (insertError) {
          throw new Error(`Failed to store topics: ${insertError.message}`);
        }
      }
      
      // Cleanup
      await this.cleanup(filePath);
      
      return { 
        success: true, 
        topics, 
        warning: clusterKeys.length > 30 ? 'Rate limits may apply due to large number of topics' : null 
      };
    } catch (error) {
      await this.cleanup(filePath);
      throw error;
    }
  }

  /**
   * Cleanup - delete uploaded file
   * @param {string} filePath - Path to file to delete
   */
  async cleanup(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // File may already be deleted or not exist
      console.warn('Cleanup warning:', error.message);
    }
  }
}

// Export singleton instance
const pdfProcessor = new PDFProcessor();
export default pdfProcessor;

// Also export the class for testing
export { PDFProcessor };
