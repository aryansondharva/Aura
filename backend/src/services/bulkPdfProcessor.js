import pdfParse from 'pdf-parse';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../utils/supabase.js';

/**
 * Bulk PDF Processor Service
 * Handles batch processing of up to 20 question paper PDFs for exam readiness analysis.
 * Extracts text from each PDF, stores raw content, and prepares data for AI analysis.
 */
class BulkPdfProcessor {
  constructor() {
    this.MAX_PDFS = 20;
    this.BATCH_SIZE = 5; // Process 5 PDFs in parallel
  }

  /**
   * Calculate SHA-256 hash of a file buffer for duplicate detection
   * @param {Buffer} fileBuffer
   * @returns {string}
   */
  calculateHash(fileBuffer) {
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Extract text and metadata from a single PDF
   * @param {string} filePath - Absolute path to the PDF file
   * @returns {Promise<{text: string, buffer: Buffer, pageCount: number}>}
   */
  async extractFromPdf(filePath) {
    const fileBuffer = await fs.readFile(filePath);
    const pdfData = await pdfParse(fileBuffer);
    return {
      text: pdfData.text || '',
      buffer: fileBuffer,
      pageCount: pdfData.numpages || 0,
    };
  }

  /**
   * Process a single PDF file and store it in session_pdfs
   * @param {Object} fileInfo - { path, originalName }
   * @param {string} sessionId - Exam session UUID
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} Processed PDF record
   */
  async processSinglePdf(fileInfo, sessionId, userId) {
    try {
      const { text, buffer, pageCount } = await this.extractFromPdf(fileInfo.path);

      if (!text || !text.trim()) {
        console.warn(`⚠️ Empty/unreadable PDF: ${fileInfo.originalName}`);
        return { success: false, fileName: fileInfo.originalName, error: 'Empty or unreadable PDF' };
      }

      const fileHash = this.calculateHash(buffer);

      // Check for duplicates within this session
      const { data: existing } = await supabase
        .from('session_pdfs')
        .select('pdf_id')
        .eq('session_id', sessionId)
        .eq('file_hash', fileHash)
        .limit(1);

      if (existing && existing.length > 0) {
        return { success: false, fileName: fileInfo.originalName, error: 'Duplicate file in this session' };
      }

      const pdfId = uuidv4();

      // Store in database
      const { error: insertError } = await supabase
        .from('session_pdfs')
        .insert({
          pdf_id: pdfId,
          session_id: sessionId,
          user_id: userId,
          file_name: fileInfo.originalName,
          file_hash: fileHash,
          page_count: pageCount,
          chunk_count: 0,
          raw_text: text,
          processed: true,
        });

      if (insertError) {
        throw new Error(`DB insert failed: ${insertError.message}`);
      }

      return {
        success: true,
        pdfId,
        fileName: fileInfo.originalName,
        pageCount,
        textLength: text.length,
      };
    } catch (error) {
      console.error(`Error processing ${fileInfo.originalName}:`, error.message);
      return { success: false, fileName: fileInfo.originalName, error: error.message };
    }
  }

  /**
   * Process multiple PDFs in parallel batches
   * @param {Array<{path: string, originalName: string}>} files - Array of file info objects
   * @param {string} sessionId - Exam session UUID
   * @param {string} userId - User UUID
   * @returns {Promise<{processed: Array, failed: Array, totalText: string}>}
   */
  async processBatch(files, sessionId, userId) {
    if (files.length > this.MAX_PDFS) {
      throw new Error(`Maximum ${this.MAX_PDFS} PDFs allowed per session.`);
    }

    const processed = [];
    const failed = [];

    // Process in batches of BATCH_SIZE
    for (let i = 0; i < files.length; i += this.BATCH_SIZE) {
      const batch = files.slice(i, i + this.BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((file) => this.processSinglePdf(file, sessionId, userId))
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            processed.push(result.value);
          } else {
            failed.push(result.value);
          }
        } else {
          failed.push({ success: false, error: result.reason?.message || 'Unknown error' });
        }
      }
    }

    // Update session with total PDFs count
    await supabase
      .from('exam_sessions')
      .update({
        total_pdfs: processed.length,
        status: processed.length > 0 ? 'analyzing' : 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId);

    return { processed, failed };
  }

  /**
   * Get all raw text from a session's PDFs (combined)
   * @param {string} sessionId
   * @returns {Promise<{texts: Array<{pdfId: string, fileName: string, text: string}>, combinedText: string}>}
   */
  async getSessionTexts(sessionId) {
    const { data, error } = await supabase
      .from('session_pdfs')
      .select('pdf_id, file_name, raw_text')
      .eq('session_id', sessionId)
      .eq('processed', true);

    if (error) throw new Error(`Failed to fetch session PDFs: ${error.message}`);

    const texts = (data || []).map((row) => ({
      pdfId: row.pdf_id,
      fileName: row.file_name,
      text: row.raw_text || '',
    }));

    const combinedText = texts.map((t) => `\n--- ${t.fileName} ---\n${t.text}`).join('\n\n');

    return { texts, combinedText };
  }

  /**
   * Cleanup uploaded files from disk
   * @param {Array<string>} filePaths - Array of file paths to delete
   */
  async cleanup(filePaths) {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.warn(`Cleanup warning: ${err.message}`);
      }
    }
  }
}

const bulkPdfProcessor = new BulkPdfProcessor();
export default bulkPdfProcessor;
export { BulkPdfProcessor };
