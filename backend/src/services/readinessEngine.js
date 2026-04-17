import supabase from '../utils/supabase.js';
import { GTU_GRADE_MAP } from './readinessService.js';

/**
 * GTU Readiness Engine — Predictive Scoring
 *
 * Calculates an "Exam Readiness Score" (0-100%) calibrated to GTU's system:
 *
 * GTU SEE (70 marks) pattern:
 *   Q1:  14 marks — compulsory short questions (all units)
 *   Q2–Q5: 14 marks each — long answer with OR choice
 *
 * Score Formula:
 *   Readiness = (UnitCoverage × 0.30) + (Mastery × 0.35) + (Velocity × 0.20) + (Consistency × 0.15)
 *
 * GTU Grades:
 *   AA(85+)=10GP, AB(75+)=9GP, BB(65+)=8GP, BC(55+)=7GP,
 *   CC(45+)=6GP, CD(40+)=5GP, DD(35+)=4GP, FF(<35)=0GP
 *   Passing: min 35% in SEE (external) independently
 */
class ReadinessEngine {

  constructor() {
    // GTU-specific weights
    this.WEIGHTS = {
      coverage:    0.30, // % of 5 GTU units covered — most important
      mastery:     0.35, // weighted quiz performance per topic
      velocity:    0.20, // improvement trajectory
      consistency: 0.15, // regularity of study
    };

    // GTU paper structure
    this.GTU_PASS_MARK_SEE = 35;      // min % in external exam to pass
    this.GTU_PASS_MARK_CIE = 50;      // min % in internal to pass
    this.GTU_SEE_TOTAL = 70;          // total marks in external paper
    this.GTU_CIE_TOTAL = 30;          // total marks in internal
    this.GTU_QUESTIONS = 5;           // Q1-Q5
    this.GTU_MARKS_PER_Q = 14;        // 14 marks per question
  }

  /**
   * Calculate full readiness score for a GTU exam session
   * @param {string} sessionId
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async calculateReadiness(sessionId, userId) {
    try {
      const { data: session } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (!session) throw new Error('Session not found');

      const [coverage, mastery, velocity, consistency] = await Promise.all([
        this.calculateGtuCoverage(sessionId, userId),
        this.calculateGtuMastery(sessionId, userId),
        this.calculateVelocity(sessionId, userId),
        this.calculateConsistency(sessionId, userId),
      ]);

      const overall = Math.min(100, Math.round(
        (coverage.score  * this.WEIGHTS.coverage) +
        (mastery.score   * this.WEIGHTS.mastery) +
        (velocity.score  * this.WEIGHTS.velocity) +
        (consistency.score * this.WEIGHTS.consistency)
      ));

      const level          = this.getReadinessLevel(overall);
      const gtuGrade       = this.getGtuGrade(overall);
      const projectedSEE   = Math.round((overall / 100) * this.GTU_SEE_TOTAL);
      const projectedCIE   = 30; // assume current CIE is good (internally assessed)
      const willPass       = projectedSEE >= Math.round(this.GTU_SEE_TOTAL * 0.35);
      const estimatedDate  = this.estimateReadyDate(overall, session.exam_date);
      const topicScores    = await this.getGtuTopicBreakdown(sessionId, userId);

      // Store score record
      await supabase.from('readiness_scores').insert({
        session_id:        sessionId,
        user_id:           userId,
        overall_score:     overall,
        topic_scores:      topicScores,
        quiz_velocity:     velocity.score,
        coverage_score:    coverage.score,
        mastery_score:     mastery.score,
        consistency_score: consistency.score,
      });

      // Update session
      await supabase
        .from('exam_sessions')
        .update({ readiness_score: overall, updated_at: new Date().toISOString() })
        .eq('session_id', sessionId);

      return {
        overall,
        level,
        gtuGrade,
        projectedSEE,   // e.g. "Projected SEE Score: 52/70"
        projectedCIE,
        willPass,
        estimatedDate,
        breakdown: {
          coverage:    { score: coverage.score,    details: coverage.details,    weight: '30%', label: 'Unit Coverage' },
          mastery:     { score: mastery.score,     details: mastery.details,     weight: '35%', label: 'Topic Mastery' },
          velocity:    { score: velocity.score,    details: velocity.details,    weight: '20%', label: 'Score Velocity' },
          consistency: { score: consistency.score, details: consistency.details, weight: '15%', label: 'Study Consistency' },
        },
        topicScores,
        recommendations: this.generateGtuRecommendations(coverage, mastery, velocity, consistency, willPass),
      };
    } catch (error) {
      console.error('GTU readiness calc error:', error);
      throw error;
    }
  }

  /**
   * Coverage Score — based on GTU's unit structure (typically 5 units)
   * GTU Q2–Q5 each map to 1–2 units, so covering all units = full exam coverage
   */
  async calculateGtuCoverage(sessionId, userId) {
    const { data: topics } = await supabase
      .from('syllabus_topics')
      .select('syllabus_id, topic_name, unit_number, is_optional, question_count')
      .eq('session_id', sessionId)
      .eq('is_selected', true);

    if (!topics || topics.length === 0) {
      return { score: 0, details: { total: 0, covered: 0, uncovered_units: [] } };
    }

    const { data: attempts } = await supabase
      .from('readiness_quiz_attempts')
      .select('syllabus_id')
      .eq('session_id', sessionId)
      .eq('user_id', userId);

    const { data: patterns } = await supabase
      .from('question_patterns')
      .select('syllabus_id')
      .eq('session_id', sessionId)
      .not('syllabus_id', 'is', null);

    const attemptedIds = new Set((attempts || []).map((a) => a.syllabus_id));
    const patternIds   = new Set((patterns || []).map((p) => p.syllabus_id));

    const compulsory  = topics.filter((t) => !t.is_optional);
    const covered     = compulsory.filter((t) => attemptedIds.has(t.syllabus_id) || patternIds.has(t.syllabus_id));
    const uncovered   = compulsory.filter((t) => !attemptedIds.has(t.syllabus_id));

    const score = compulsory.length > 0
      ? Math.round((covered.length / compulsory.length) * 100)
      : 0;

    return {
      score,
      details: {
        total:           compulsory.length,
        covered:         covered.length,
        uncovered_units: uncovered.map((t) => `Unit ${t.unit_number}: ${t.topic_name}`),
      },
    };
  }

  /**
   * Mastery Score — weighted by GTU question importance (marks × frequency)
   * Higher-marks + more-frequent questions weigh more in the score
   */
  async calculateGtuMastery(sessionId, userId) {
    const { data: attempts } = await supabase
      .from('readiness_quiz_attempts')
      .select('score, syllabus_id, total_questions, correct_count')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });

    if (!attempts || attempts.length === 0) {
      return { score: 0, details: { totalAttempts: 0, avgPercent: 0 } };
    }

    // Get importance from patterns (frequency × marks = weight)
    const { data: patterns } = await supabase
      .from('question_patterns')
      .select('syllabus_id, importance_score, marks, frequency_count')
      .eq('session_id', sessionId);

    const topicWeight = {};
    for (const p of (patterns || [])) {
      if (!p.syllabus_id) continue;
      const w = (p.importance_score || 0.5) * ((p.marks || 7) / 7);
      if (!topicWeight[p.syllabus_id]) topicWeight[p.syllabus_id] = [];
      topicWeight[p.syllabus_id].push(w);
    }

    let weightedSum = 0, totalWeight = 0;

    for (const attempt of attempts) {
      const weights = topicWeight[attempt.syllabus_id];
      const avgW = weights
        ? weights.reduce((a, b) => a + b, 0) / weights.length
        : 0.5;

      const pct = attempt.total_questions > 0
        ? (attempt.correct_count / attempt.total_questions) * 100
        : 0;

      weightedSum  += pct * avgW;
      totalWeight  += avgW;
    }

    const score    = totalWeight > 0 ? Math.min(100, Math.round(weightedSum / totalWeight)) : 0;
    const avgRaw   = attempts.reduce((s, a) => s + (a.score || 0), 0) / attempts.length;

    return {
      score,
      details: { totalAttempts: attempts.length, avgPercent: Math.round(avgRaw * 10) / 10 },
    };
  }

  /**
   * Velocity Score — improvement trend over recent attempts
   */
  async calculateVelocity(sessionId, userId) {
    const { data: attempts } = await supabase
      .from('readiness_quiz_attempts')
      .select('score, submitted_at')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(10);

    if (!attempts || attempts.length < 2) {
      return { score: 50, details: { trend: 'neutral', dataPoints: attempts?.length || 0 } };
    }

    const mid    = Math.floor(attempts.length / 2);
    const recent = attempts.slice(0, mid);
    const older  = attempts.slice(mid);

    const recentAvg = recent.reduce((s, a) => s + (a.score || 0), 0) / recent.length;
    const olderAvg  = older.reduce((s, a) => s + (a.score || 0), 0) / older.length;

    const ratio  = olderAvg === 0 ? (recentAvg > 0 ? 1 : 0) : (recentAvg - olderAvg) / olderAvg;
    const score  = Math.max(0, Math.min(100, Math.round(50 + ratio * 100)));
    const trend  = ratio > 0.05 ? 'improving' : ratio < -0.05 ? 'declining' : 'stable';

    return {
      score,
      details: { trend, recentAvg: Math.round(recentAvg * 10) / 10, olderAvg: Math.round(olderAvg * 10) / 10, dataPoints: attempts.length },
    };
  }

  /**
   * Consistency Score — study regularity over last 14 days
   */
  async calculateConsistency(sessionId, userId) {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const { data: attempts } = await supabase
      .from('readiness_quiz_attempts')
      .select('submitted_at')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .gte('submitted_at', since.toISOString());

    if (!attempts || attempts.length === 0) {
      return { score: 0, details: { activeDays: 0, totalDays: 14 } };
    }

    const days = new Set(attempts.map((a) => new Date(a.submitted_at).toISOString().split('T')[0]));
    const score = Math.min(100, Math.round((days.size / 14) * 100));

    return { score, details: { activeDays: days.size, totalDays: 14 } };
  }

  /**
   * Per-topic breakdown with GTU-specific mastery labels
   */
  async getGtuTopicBreakdown(sessionId, userId) {
    const { data: topics } = await supabase
      .from('syllabus_topics')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_selected', true);

    if (!topics) return [];

    const { data: attempts } = await supabase
      .from('readiness_quiz_attempts')
      .select('syllabus_id, score, correct_count, total_questions')
      .eq('session_id', sessionId)
      .eq('user_id', userId);

    const byTopic = {};
    for (const a of (attempts || [])) {
      if (!byTopic[a.syllabus_id]) byTopic[a.syllabus_id] = [];
      byTopic[a.syllabus_id].push(a);
    }

    return topics.map((topic) => {
      const ta     = byTopic[topic.syllabus_id] || [];
      const avgPct = ta.length > 0
        ? ta.reduce((s, a) => s + (a.total_questions > 0 ? (a.correct_count / a.total_questions) * 100 : 0), 0) / ta.length
        : 0;

      const gtuGrade = this.getGtuGrade(avgPct);

      return {
        syllabusId:    topic.syllabus_id,
        unitNumber:    topic.unit_number,
        topicName:     topic.topic_name,
        isOptional:    topic.is_optional,
        questionCount: topic.question_count || 0,
        attempts:      ta.length,
        avgPercent:    Math.round(avgPct * 10) / 10,
        gtuGrade:      gtuGrade.grade,
        gradePoint:    gtuGrade.gp,
        mastery:       avgPct >= 75 ? 'strong' : avgPct >= 50 ? 'moderate' : ta.length > 0 ? 'weak' : 'not_started',
      };
    }).sort((a, b) => (a.unitNumber || 99) - (b.unitNumber || 99));
  }

  /**
   * Map 0-100 readiness to GTU grades
   */
  getGtuGrade(score) {
    for (const g of GTU_GRADE_MAP) {
      if (score >= g.min) return g;
    }
    return GTU_GRADE_MAP[GTU_GRADE_MAP.length - 1];
  }

  /**
   * Readiness level labels
   */
  getReadinessLevel(score) {
    if (score >= 85) return { label: 'Exam Ready! (AA target) 🎉', color: '#22c55e', emoji: '🟢' };
    if (score >= 75) return { label: 'Strong — AB Grade Range 💪', color: '#4ade80', emoji: '🟢' };
    if (score >= 65) return { label: 'Good — BB Grade Range 📈', color: '#eab308', emoji: '🟡' };
    if (score >= 55) return { label: 'Average — BC Grade Range 📚', color: '#f97316', emoji: '🟠' };
    if (score >= 45) return { label: 'Below avg — CC Grade Range ⚠️', color: '#f97316', emoji: '🟠' };
    if (score >= 35) return { label: 'Risk — DD (Just Pass) 🔴', color: '#ef4444', emoji: '🔴' };
    return { label: 'Danger — FF (Fail Risk) ❌', color: '#dc2626', emoji: '⛔' };
  }

  /**
   * Estimate when user will reach passing/target readiness
   */
  estimateReadyDate(currentScore, examDate) {
    if (currentScore >= 85) return 'You\'re targeting AA! 🎉 Keep revising.';
    if (!examDate) return null;

    const exam = new Date(examDate);
    const now  = new Date();
    const daysLeft = Math.ceil((exam - now) / 86400000);

    if (daysLeft <= 0) return 'Exam date has passed';

    const remaining  = 75 - currentScore; // target AB grade range
    const dailyGain  = currentScore > 10 ? Math.max(1, currentScore / 10) : 2;
    const daysNeeded = Math.ceil(remaining / dailyGain);

    if (remaining <= 0) return `On track for AB+ with ${daysLeft} days left 👍`;

    if (daysNeeded <= daysLeft) {
      const readyDate = new Date(now);
      readyDate.setDate(readyDate.getDate() + daysNeeded);
      return `Projected ready by ${readyDate.toDateString()} (${daysLeft} days left)`;
    }

    return `⚠️ Need ${daysNeeded} days of study, only ${daysLeft} days left — increase daily efforts`;
  }

  /**
   * GTU-specific study recommendations
   */
  generateGtuRecommendations(coverage, mastery, velocity, consistency, willPass) {
    const recs = [];

    if (!willPass) {
      recs.push({
        type: 'critical', priority: 'critical',
        message: '🚨 FAIL RISK: Projected SEE score is below GTU passing mark (35%).',
        action: 'Focus immediately on Q1 short-answer topics — they cover the full syllabus and are the fastest path to passing marks.',
      });
    }

    if (coverage.score < 60) {
      const missed = (coverage.details.uncovered_units || []).slice(0, 3);
      recs.push({
        type: 'coverage', priority: 'high',
        message: `Only ${coverage.details.covered}/${coverage.details.total} GTU units covered.`,
        action: `Study ${missed.join(', ')} first — uncovered units = guaranteed lost marks in Q2-Q5.`,
      });
    }

    if (mastery.score < 50) {
      recs.push({
        type: 'mastery', priority: 'high',
        message: `Average score ${mastery.details.avgPercent}% — below GTU passing threshold.`,
        action: 'Attempt more GTU-pattern quizzes. Focus on 7-mark questions (they decide your grade).',
      });
    }

    if (velocity.details?.trend === 'declining') {
      recs.push({
        type: 'velocity', priority: 'medium',
        message: 'Your scores are declining. Take a break, review fundamentals.',
        action: 'Revisit definitions (C1) and formulas (C2) before attempting application questions (C3+).',
      });
    }

    if (consistency.score < 30) {
      recs.push({
        type: 'consistency', priority: 'medium',
        message: `Only ${consistency.details.activeDays} study days in the last 2 weeks.`,
        action: 'GTU exams require daily revision. Aim for at least 1 unit per day.',
      });
    }

    if (recs.length === 0) {
      recs.push({
        type: 'positive', priority: 'low',
        message: '✅ Great progress! You\'re on track for a good GTU grade.',
        action: 'Attempt previous GTU papers in full (70 marks / 2.5 hrs) to simulate the real exam.',
      });
    }

    return recs;
  }
}

const readinessEngine = new ReadinessEngine();
export default readinessEngine;
export { ReadinessEngine };
