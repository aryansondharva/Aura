import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import llmService from './llmService.js';
import config from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JAVA_PRACTICE_DIR = path.resolve(__dirname, '../../../OBJECT ORIENTED PROGRAMMING');

class JavaPracticeService {
  constructor() {
    this.cache = null;
    this.cacheKey = null;
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 700,
      chunkOverlap: 100,
    });
  }

  async getPdfFiles() {
    const entries = await fs.readdir(JAVA_PRACTICE_DIR, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.pdf')
      .map((entry) => path.join(JAVA_PRACTICE_DIR, entry.name));
  }

  async buildCacheKey(files) {
    const stats = await Promise.all(
      files.map(async (filePath) => {
        const stat = await fs.stat(filePath);
        return `${path.basename(filePath)}:${stat.mtimeMs}:${stat.size}`;
      })
    );

    return stats.sort().join('|');
  }

  scoreChunk(question, chunk) {
    const normalize = (value) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((token) => token.length > 2);

    const queryTerms = normalize(question);
    const chunkTerms = normalize(chunk.content);
    const chunkSet = new Set(chunkTerms);

    let score = 0;

    for (const term of queryTerms) {
      if (chunkSet.has(term)) {
        score += 3;
      }
    }

    const exactQuestion = question.trim().toLowerCase();
    if (exactQuestion && chunk.content.toLowerCase().includes(exactQuestion)) {
      score += 8;
    }

    const importantPhrases = [
      'java',
      'object oriented',
      'inheritance',
      'polymorphism',
      'abstraction',
      'encapsulation',
      'exception',
      'array',
      'string',
      'collection',
      'thread',
      'jdbc',
      'interface',
      'class',
      'object',
    ];

    for (const phrase of importantPhrases) {
      if (
        exactQuestion.includes(phrase) &&
        chunk.content.toLowerCase().includes(phrase)
      ) {
        score += 2;
      }
    }

    return score;
  }

  isCodeStyleQuestion(question) {
    const q = question.toLowerCase();
    const codeHints = [
      'code',
      'program',
      'write',
      'syntax',
      'example',
      'implement',
      'output',
      'run',
      'compile',
      'method',
      'class',
      'java',
    ];

    return codeHints.some((hint) => q.includes(hint));
  }

  async loadDocuments() {
    const files = await this.getPdfFiles();

    if (files.length === 0) {
      throw new Error('No PDF files found in OBJECT ORIENTED PROGRAMMING folder');
    }

    const nextCacheKey = await this.buildCacheKey(files);
    if (this.cache && this.cacheKey === nextCacheKey) {
      return this.cache;
    }

    const allChunks = [];

    for (const filePath of files) {
      const buffer = await fs.readFile(filePath);
      const parsed = await pdfParse(buffer);
      const text = parsed.text?.trim();

      if (!text) {
        continue;
      }

      const pieces = await this.splitter.splitText(text);
      pieces.forEach((content, index) => {
        allChunks.push({
          id: `${path.basename(filePath)}-${index}`,
          fileName: path.basename(filePath),
          content,
        });
      });
    }

    this.cache = {
      files: files.map((filePath) => path.basename(filePath)),
      chunks: allChunks,
    };
    this.cacheKey = nextCacheKey;

    return this.cache;
  }

  async answerQuestion(question) {
    const trimmedQuestion = question?.trim();
    if (!trimmedQuestion) {
      throw new Error('Question is required');
    }

    const { chunks, files } = await this.loadDocuments();
    const ranked = chunks
      .map((chunk) => ({
        ...chunk,
        score: this.scoreChunk(trimmedQuestion, chunk),
      }))
      .sort((a, b) => b.score - a.score);

    const topChunks = ranked.filter((chunk) => chunk.score > 0).slice(0, 6);

    if (topChunks.length === 0) {
      return {
        answer:
          'I could not find support for that question in the OOP PDF set. Ask about topics covered in these PDFs only, such as Java basics, OOP concepts, arrays, strings, exception handling, collections, assignments, practicals, or the GTU paper.',
        sources: [],
        pdfCount: files.length,
      };
    }

    const context = topChunks
      .map(
        (chunk, index) =>
          `[Source ${index + 1}: ${chunk.fileName}]\n${chunk.content}`
      )
      .join('\n\n');

    const isCodeQuestion = this.isCodeStyleQuestion(trimmedQuestion);

    const formattingInstruction = isCodeQuestion
      ? `If the question asks for code/program/output, follow this exact markdown structure:
## Code
\`\`\`java
// code here
\`\`\`
## Output
\`\`\`text
// expected output here
\`\`\`
## Explanation
- short explanation in 2-4 points
If output is not clearly present in PDFs, write "Output not explicitly given in the provided PDFs." in Output block.`
      : `Use clear markdown with short headings and concise explanation.`;

    const systemPrompt = `You are Aura's Java Practice assistant for GTU students.
Answer ONLY from the provided PDF context.
If the answer is not clearly supported by the context, say that it is not available in the provided PDFs.
Do not use outside knowledge.
Keep the answer clear and study-friendly.
${formattingInstruction}
End with a short line starting with "Sources:" and list the PDF filenames you relied on.`;

    const prompt = `Question: ${trimmedQuestion}

PDF Context:
${context}`;

    const answer = await llmService.generate(prompt, systemPrompt);
    const uniqueSources = [...new Set(topChunks.map((chunk) => chunk.fileName))];

    return {
      answer,
      sources: uniqueSources,
      pdfCount: files.length,
    };
  }
}

const javaPracticeService = new JavaPracticeService();
export default javaPracticeService;
