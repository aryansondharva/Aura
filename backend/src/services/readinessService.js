import { v4 as uuidv4 } from 'uuid';
import supabase from '../utils/supabase.js';
import llmService from './llmService.js';
import bulkPdfProcessor from './bulkPdfProcessor.js';

/**
 * GTU Readiness Service — AI Analysis Engine
 *
 * Fully calibrated to the Gujarat Technological University (GTU) exam system:
 *
 * GTU Paper Pattern (70 Marks SEE):
 *   - Q1: Compulsory short questions covering the full syllabus (14 marks)
 *   - Q2–Q5: Long/descriptive questions with internal OR choice (14 marks each)
 *   - Common sub-question splits: 3+4+7, 7+7, 5+5+4
 *   - Bloom's Taxonomy levels: C1 (Remember), C2 (Understand), C3 (Apply),
 *     C4 (Analyse), C5 (Evaluate), C6 (Create)
 *
 * GTU Grading:
 *   AA=10 (85-100), AB=9 (75-84), BB=8 (65-74), BC=7 (55-64),
 *   CC=6 (45-54), CD=5 (40-44), DD=4 (35-39), FF=0 (<35)
 *
 * Passing: Min 35% in SEE (theory) independently
 */

const GTU_BLOOM_MAP = {
  C1: 'Remember',
  C2: 'Understand',
  C3: 'Apply',
  C4: 'Analyse',
  C5: 'Evaluate',
  C6: 'Create',
};

const GTU_GRADE_MAP = [
  { min: 85, grade: 'AA', gp: 10 },
  { min: 75, grade: 'AB', gp: 9 },
  { min: 65, grade: 'BB', gp: 8 },
  { min: 55, grade: 'BC', gp: 7 },
  { min: 45, grade: 'CC', gp: 6 },
  { min: 40, grade: 'CD', gp: 5 },
  { min: 35, grade: 'DD', gp: 4 },
  { min: 0,  grade: 'FF', gp: 0 },
];

class ReadinessService {

  /**
   * Get GTU grade and grade point from a percentage score
   */
  getGtuGrade(percent) {
    for (const g of GTU_GRADE_MAP) {
      if (percent >= g.min) return g;
    }
    return GTU_GRADE_MAP[GTU_GRADE_MAP.length - 1];
  }

  /**
   * Main analysis pipeline — processes all PDFs in a session
   * @param {string} sessionId
   * @param {string} userId
   */
  async analyzeSession(sessionId, userId) {
    try {
      const { texts } = await bulkPdfProcessor.getSessionTexts(sessionId);

      if (!texts || texts.length === 0) {
        throw new Error('No processed PDFs found in this session');
      }

      // Step 1: Extract GTU-structured questions from each paper
      const allExtractedQuestions = [];
      for (const pdf of texts) {
        const questions = await this.extractGtuQuestions(pdf.text, pdf.fileName);
        allExtractedQuestions.push({ pdfId: pdf.pdfId, fileName: pdf.fileName, questions });
      }

      // Step 2: Find frequency patterns
      const patterns = await this.findGtuPatterns(allExtractedQuestions, sessionId);

      // Step 3: Map to syllabus if set
      const { data: syllabusTopics } = await supabase
        .from('syllabus_topics')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_selected', true);

      if (syllabusTopics && syllabusTopics.length > 0) {
        await this.mapToGtuSyllabus(patterns, syllabusTopics, sessionId);
      }

      // Step 4: Persist patterns
      await this.storePatterns(patterns, sessionId);

      // Step 5: Mark session ready
      await supabase
        .from('exam_sessions')
        .update({ status: 'ready', updated_at: new Date().toISOString() })
        .eq('session_id', sessionId);

      return {
        success: true,
        totalPdfs: texts.length,
        totalPatterns: patterns.length,
        topQuestions: patterns.slice(0, 10),
      };
    } catch (error) {
      console.error('GTU Readiness analysis error:', error);
      throw error;
    }
  }

  /**
   * Extract GTU-formatted questions from a question paper.
   * Understands the specific GTU structure:
   *  - Q1: Short questions (2–5 parts, covering all units)
   *  - Q2–Q5: Long questions with A/B sub-parts and OR choices
   *  - Marks per sub-question: 3, 4, 5, 7
   *  - Bloom's level annotation (C1–C6)
   */
  async extractGtuQuestions(text, fileName) {
    const truncatedText = text.substring(0, 14000);

    const prompt = `You are an expert at analyzing Gujarat Technological University (GTU) B.E. semester exam question papers.

GTU exam paper format (70 marks):
- Q1: Compulsory short questions (14 marks total, ~7 sub-parts of 2 marks each) — covers full syllabus
- Q2 to Q5: Each question is 14 marks, has an "OR" option (choose either Q.Xa or Q.Xb)
  - Sub-questions split like: 3+4+7 marks, or 7+7 marks, or 7+(3+4) marks
- Marks per question are specified (e.g., [7 marks], [3 marks])
- Bloom's level may be noted (C1 to C6): C1=Remember, C2=Understand, C3=Apply, C4=Analyse, C5=Evaluate, C6=Create
- Units covered are usually labelled (Unit 1, Unit 2, etc.)

Extract EVERY question and sub-question from this GTU paper. For EACH question provide:
1. "question": the exact question text
2. "question_number": e.g. "Q1.a", "Q2.a", "Q2.b (OR)", "Q3.b"
3. "type": one of "short_answer", "long_theory", "numerical", "definition", "derive", "prove", "explain", "example"
4. "marks": exact marks (2, 3, 4, 5, 7, 14)
5. "bloom_level": "C1"/"C2"/"C3"/"C4"/"C5"/"C6" (guess if not stated)
6. "unit": unit number (1-5) if identifiable, else null
7. "topic": specific topic/concept the question tests
8. "is_or_choice": true if it is the alternate "OR" option

Return ONLY a valid JSON array. No preamble, no markdown.

GTU PAPER TEXT:
${truncatedText}`;

    try {
      const response = await llmService.generate(prompt);
      return this.parseJsonArray(response);
    } catch (error) {
      console.error(`GTU extraction failed for ${fileName}:`, error.message);
      return [];
    }
  }

  /**
   * Find GTU-specific question patterns across multiple question papers.
   * Considers:
   * - Same concept asked in Q1, Q2, Q3 positions (indicates exam importance)
   * - Recurring topics with same marks allocation
   * - OR-choice pairs that appear repeatedly
   * - Bloom's level distribution across papers
   */
  async findGtuPatterns(allPaperQuestions, sessionId) {
    const flatQuestions = [];
    for (const paper of allPaperQuestions) {
      for (const q of paper.questions) {
        if (q && q.question) {
          flatQuestions.push({
            ...q,
            sourcePdf: paper.fileName,
            pdfId: paper.pdfId,
          });
        }
      }
    }

    if (flatQuestions.length === 0) return [];

    const questionsJson = JSON.stringify(
      flatQuestions.map((q, i) => ({
        id: i,
        question: q.question,
        source: q.sourcePdf,
        type: q.type,
        marks: q.marks,
        bloom_level: q.bloom_level,
        unit: q.unit,
        topic: q.topic,
        question_number: q.question_number,
        is_or_choice: q.is_or_choice,
      }))
    ).substring(0, 18000);

    const prompt = `You are a GTU exam expert analyzing ${allPaperQuestions.length} past question papers.

GTU exam context:
- Total: 70 marks (5 questions × 14 marks each)
- Q1: Compulsory short questions (2 marks each, entire syllabus)
- Q2-Q5: Long answer with internal OR choice
- Each question covers 1 or 2 units of the syllabus
- A question appearing in multiple years = HIGH importance for exam

Your task:
1. GROUP questions asking the SAME or very similar concept (even if worded differently)
2. COUNT how many different papers (years) each concept appeared in
3. Identify the TYPICAL marks for each concept in GTU papers
4. Identify if it commonly appears in Q1 (short) or Q2-Q5 (long)
5. Rate GTU exam importance: 0.0 to 1.0 (frequency/total papers)

Return ONLY a valid JSON array. No other text. No markdown.

Format:
[
  {
    "question": "Best canonical wording of the question",
    "type": "long_theory",
    "typical_marks": 7,
    "bloom_level": "C3",
    "frequency": 3,
    "importance": 0.75,
    "appears_in_q1": false,
    "appears_in_long": true,
    "sources": ["2021.pdf", "2022.pdf", "2023.pdf"],
    "unit": 2,
    "topic": "Laplace Transform",
    "difficulty": "medium",
    "is_or_choice_pattern": false
  }
]

QUESTIONS FROM ALL ${allPaperQuestions.length} PAPERS:
${questionsJson}`;

    try {
      const response = await llmService.generate(prompt);
      const patterns = this.parseJsonArray(response);

      // Sort: most frequent first, then by importance
      patterns.sort((a, b) => {
        const freqDiff = (b.frequency || 0) - (a.frequency || 0);
        if (freqDiff !== 0) return freqDiff;
        return (b.importance || 0) - (a.importance || 0);
      });

      return patterns.map((p) => ({
        question_text: p.question || '',
        question_type: p.type || 'long_theory',
        frequency_count: p.frequency || 1,
        importance_score: Math.min(1, Math.max(0, p.importance || 0.5)),
        source_pdfs: p.sources || [],
        year_appearances: p.sources || [],
        difficulty: p.difficulty || 'medium',
        marks: p.typical_marks || null,
        bloom_level: p.bloom_level || 'C3',
        unit: p.unit || null,
        topic: p.topic || 'General',
        appears_in_q1: p.appears_in_q1 || false,
        appears_in_long: p.appears_in_long !== false,
        is_or_choice_pattern: p.is_or_choice_pattern || false,
      }));
    } catch (error) {
      console.error('GTU pattern analysis failed:', error.message);
      // Fallback
      return flatQuestions.map((q) => ({
        question_text: q.question,
        question_type: q.type || 'long_theory',
        frequency_count: 1,
        importance_score: 0.5,
        source_pdfs: [q.sourcePdf],
        year_appearances: [q.sourcePdf],
        difficulty: q.difficulty || 'medium',
        marks: q.marks || null,
        bloom_level: q.bloom_level || 'C3',
        unit: q.unit || null,
        topic: q.topic || 'General',
        appears_in_q1: false,
        appears_in_long: true,
      }));
    }
  }

  /**
   * Map question patterns to GTU syllabus units/topics.
   * GTU syllabus is unit-based (typically 5 units per subject).
   */
  async mapToGtuSyllabus(patterns, syllabusTopics, sessionId) {
    const topicNames = syllabusTopics.map((t) => t.topic_name);
    const topicMap = new Map(syllabusTopics.map((t) => [t.topic_name.toLowerCase(), t.syllabus_id]));

    const questionsToMap = patterns.slice(0, 80).map((p, i) => ({
      idx: i,
      question: p.question_text.substring(0, 150),
      topic_hint: p.topic,
      unit_hint: p.unit,
    }));

    const prompt = `You are a GTU syllabus expert.

GTU Syllabus Topics/Units for this subject:
${topicNames.map((t, i) => `${i + 1}. ${t}`).join('\n')}

For each question below, identify which syllabus topic/unit it belongs to.
Use the topic_hint and unit_hint as clues.
If unsure, choose the closest match.

Return ONLY a valid JSON array. No markdown. No other text.
Format: [{"idx": 0, "topic": "Exact Topic Name from list above"}, ...]

QUESTIONS:
${JSON.stringify(questionsToMap)}`;

    try {
      const response = await llmService.generate(prompt);
      const mappings = this.parseJsonArray(response);

      const topicCounts = {};

      for (const mapping of mappings) {
        const idx = mapping.idx;
        if (typeof idx === 'number' && idx >= 0 && idx < patterns.length && mapping.topic) {
          // Try exact match first, then fuzzy
          let syllabusId = topicMap.get(mapping.topic.toLowerCase());

          if (!syllabusId) {
            // Fuzzy: check if any key contains the topic
            for (const [key, id] of topicMap) {
              if (key.includes(mapping.topic.toLowerCase().substring(0, 10)) ||
                  mapping.topic.toLowerCase().includes(key.substring(0, 10))) {
                syllabusId = id;
                break;
              }
            }
          }

          if (syllabusId) {
            patterns[idx].syllabus_id = syllabusId;
            topicCounts[syllabusId] = (topicCounts[syllabusId] || 0) + 1;
          }
        }
      }

      // Update question counts per syllabus topic
      for (const [syllabusId, count] of Object.entries(topicCounts)) {
        await supabase
          .from('syllabus_topics')
          .update({ question_count: count })
          .eq('syllabus_id', syllabusId);
      }
    } catch (error) {
      console.error('GTU syllabus mapping failed:', error.message);
    }
  }

  /**
   * Generate a GTU-exam-standard answer for a question.
   * Answers are structured per GTU marking schemes.
   */
  async generateAnswer(patternId, sessionId) {
    const { data: pattern } = await supabase
      .from('question_patterns')
      .select('*')
      .eq('pattern_id', patternId)
      .single();

    if (!pattern) throw new Error('Question pattern not found');

    const { combinedText } = await bulkPdfProcessor.getSessionTexts(sessionId);
    const relevantContent = combinedText.substring(0, 8000);

    const bloomDesc = GTU_BLOOM_MAP[pattern.bloom_level] || 'Understand';
    const marks = pattern.marks || 7;

    const prompt = `You are an expert GTU (Gujarat Technological University) B.E. exam tutor.

Write a model answer for the following GTU exam question, calibrated for ${marks} marks.

Question: ${pattern.question_text}
Marks: ${marks}
Bloom's Level: ${pattern.bloom_level || 'C3'} (${bloomDesc})
Type: ${pattern.question_type}
Unit/Topic: ${pattern.topic || 'Not specified'}

GTU marking guidance for ${marks} marks:
${marks <= 2 ? '- 2 marks: 2–3 crisp lines, 1 definition or formula' : ''}
${marks <= 4 && marks > 2 ? '- 3-4 marks: 4–6 lines, with formula/diagram if needed' : ''}
${marks === 7 ? `- 7 marks: Detailed explanation in 8–12 points, include:
  • Definition / Introduction
  • Theory / Derivation / Algorithm
  • Formula with explanation
  • Diagram / Example if applicable
  • Advantages / Applications (if relevant)` : ''}
${marks === 14 ? '- 14 marks: Full answer with all sections of a 7-mark plus extended examples/applications' : ''}

Structure your answer clearly with:
- Heading
- Step-by-step explanation
- Formulas in readable format (use LaTeX-style if needed e.g. e^x, ∫, Σ)
- Example if applicable
- Conclusion (for long answers)

Use this study material for reference:
${relevantContent}

Write the answer now:`;

    const answer = await llmService.generate(prompt);

    await supabase
      .from('question_patterns')
      .update({ ai_answer: answer })
      .eq('pattern_id', patternId);

    return answer;
  }

  /**
   * Auto-extract GTU syllabus units from question papers.
   * Returns unit-wise structured topics as per GTU syllabus format.
   */
  async extractGtuSyllabus(combinedText, sessionId) {
    const truncated = combinedText.substring(0, 12000);

    const prompt = `You are a GTU (Gujarat Technological University) curriculum expert for B.E. programs.

Analyze these GTU exam question papers and identify the SYLLABUS UNITS and topics covered.

GTU syllabus is unit-based (typically 5 units per subject):
- Each unit covers 2–4 major topics
- Questions Q2–Q5 typically map ONE question to ONE unit or two related units
- Q1 short questions cover ALL units

From the question paper text, identify:
1. All major units (Unit 1 through Unit N)
2. The main topic/name for each unit
3. Sub-topics within each unit
4. Whether each unit appears in Q1 only, long questions only, or both

Return ONLY valid JSON. No markdown. No other text.
Format:
[
  {
    "name": "Laplace Transform",
    "unit": 1,
    "sub_topics": ["Definition and Existence", "Properties", "Inverse Laplace Transform", "Applications to ODEs"],
    "is_optional": false,
    "appears_in_q1": true,
    "appears_in_long": true,
    "estimated_marks_weightage": 14
  }
]

QUESTION PAPER TEXT:
${truncated}`;

    try {
      const response = await llmService.generate(prompt);
      return this.parseJsonArray(response);
    } catch (error) {
      console.error('GTU syllabus extraction failed:', error.message);
      return [];
    }
  }

  /**
   * Store extracted patterns in the database
   */
  async storePatterns(patterns, sessionId) {
    await supabase.from('question_patterns').delete().eq('session_id', sessionId);

    const rows = patterns.map((p) => ({
      pattern_id: uuidv4(),
      session_id: sessionId,
      syllabus_id: p.syllabus_id || null,
      question_text: p.question_text,
      question_type: p.question_type,
      frequency_count: p.frequency_count,
      importance_score: p.importance_score,
      source_pdfs: p.source_pdfs,
      year_appearances: p.year_appearances,
      difficulty: p.difficulty,
      marks: p.marks,
    }));

    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const { error } = await supabase.from('question_patterns').insert(batch);
      if (error) console.error('Error storing pattern batch:', error.message);
    }
  }

  /**
   * Parse AI JSON response (strips markdown fences)
   */
  parseJsonArray(text) {
    try {
      let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const startIdx = cleaned.indexOf('[');
      const endIdx = cleaned.lastIndexOf(']') + 1;
      if (startIdx === -1 || endIdx <= 0) return [];
      return JSON.parse(cleaned.substring(startIdx, endIdx));
    } catch (error) {
      console.error('JSON parse error:', error.message);
      return [];
    }
  }
}

const readinessService = new ReadinessService();
export default readinessService;
export { ReadinessService, GTU_GRADE_MAP, GTU_BLOOM_MAP };
