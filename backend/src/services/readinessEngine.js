import supabase from '../utils/supabase.js';

/**
 * Readiness Engine — Predictive Scoring Algorithm
 * 
 * Calculates a real-time "Exam Readiness Score" (0-100%) based on:
 *   Coverage  (25%) — What % of syllabus topics have been studied
 *   Mastery   (35%) — How well topics are understood (weighted by importance)
 *   Velocity  (20%) — Rate of improvement over recent attempts
 *   Consistency (20%) — Regularity and recency of study sessions
 */
class ReadinessEngine {

  constructor() {
    this.WEIGHTS = {
      coverage: 0.25,
      mastery: 0.35,
      velocity: 0.20,
      consistency: 0.20,
    };
  }

  /**
   * Calculate the overall readiness score for a session
   * @param {string} sessionId - Exam session UUID
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} Full score breakdown
   */
  async calculateReadiness(sessionId, userId) {
    try {
      // Get session data
      const { data: session } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (!session) throw new Error('Session not found');

      // Calculate each component
      const coverage = await this.calculateCoverage(sessionId, userId);
      const mastery = await this.calculateMastery(sessionId, userId);
      const velocity = await this.calculateVelocity(sessionId, userId);
      const consistency = await this.calculateConsistency(sessionId, userId);

      // Weighted overall score
      const overall = Math.min(100, Math.round(
        (coverage.score * this.WEIGHTS.coverage) +
        (mastery.score * this.WEIGHTS.mastery) +
        (velocity.score * this.WEIGHTS.velocity) +
        (consistency.score * this.WEIGHTS.consistency)
      ));

      // Get topic-level breakdown
      const topicScores = await this.getTopicBreakdown(sessionId, userId);

      // Determine readiness level
      const level = this.getReadinessLevel(overall);

      // Calculate estimated ready date
      const estimatedReadyDate = this.estimateReadyDate(overall, session.exam_date);

      // Store score history
      const scoreRecord = {
        session_id: sessionId,
        user_id: userId,
        overall_score: overall,
        topic_scores: topicScores,
        quiz_velocity: velocity.score,
        coverage_score: coverage.score,
        mastery_score: mastery.score,
        consistency_score: consistency.score,
      };

      await supabase.from('readiness_scores').insert(scoreRecord);

      // Update session readiness score
      await supabase
        .from('exam_sessions')
        .update({
          readiness_score: overall,
          updated_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId);

      return {
        overall,
        level,
        estimatedReadyDate,
        breakdown: {
          coverage: { score: coverage.score, details: coverage.details, weight: '25%' },
          mastery: { score: mastery.score, details: mastery.details, weight: '35%' },
          velocity: { score: velocity.score, details: velocity.details, weight: '20%' },
          consistency: { score: consistency.score, details: consistency.details, weight: '20%' },
        },
        topicScores,
        recommendations: this.generateRecommendations(coverage, mastery, velocity, consistency),
      };
    } catch (error) {
      console.error('Readiness calculation error:', error);
      throw error;
    }
  }

  /**
   * Coverage Score — What % of syllabus topics have quiz attempts
   * Score: (topics with attempts / total selected topics) × 100
   */
  async calculateCoverage(sessionId, userId) {
    const { data: topics } = await supabase
      .from('syllabus_topics')
      .select('syllabus_id, topic_name, is_selected, question_count')
      .eq('session_id', sessionId)
      .eq('is_selected', true);

    if (!topics || topics.length === 0) {
      return { score: 0, details: { total: 0, covered: 0 } };
    }

    // Check which topics have quiz attempts
    const { data: attempts } = await supabase
      .from('readiness_quiz_attempts')
      .select('syllabus_id')
      .eq('session_id', sessionId)
      .eq('user_id', userId);

    const attemptedTopicIds = new Set((attempts || []).map((a) => a.syllabus_id));
    
    // Also consider topics that have question patterns mapped
    const { data: patterns } = await supabase
      .from('question_patterns')
      .select('syllabus_id')
      .eq('session_id', sessionId)
      .not('syllabus_id', 'is', null);

    const patternTopicIds = new Set((patterns || []).map((p) => p.syllabus_id));

    const coveredTopics = topics.filter(
      (t) => attemptedTopicIds.has(t.syllabus_id) || patternTopicIds.has(t.syllabus_id)
    );

    const score = Math.round((coveredTopics.length / topics.length) * 100);

    return {
      score,
      details: {
        total: topics.length,
        covered: coveredTopics.length,
        uncovered: topics.filter((t) => !attemptedTopicIds.has(t.syllabus_id)).map((t) => t.topic_name),
      },
    };
  }

  /**
   * Mastery Score — Weighted average of quiz scores per topic
   * Higher importance questions weigh more
   */
  async calculateMastery(sessionId, userId) {
    const { data: attempts } = await supabase
      .from('readiness_quiz_attempts')
      .select('score, syllabus_id, total_questions, correct_count')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });

    if (!attempts || attempts.length === 0) {
      return { score: 0, details: { totalAttempts: 0, avgScore: 0 } };
    }

    // Get importance weights from patterns
    const { data: patterns } = await supabase
      .from('question_patterns')
      .select('syllabus_id, importance_score')
      .eq('session_id', sessionId);

    // Build topic importance map
    const topicImportance = {};
    if (patterns) {
      for (const p of patterns) {
        if (p.syllabus_id) {
          if (!topicImportance[p.syllabus_id]) topicImportance[p.syllabus_id] = [];
          topicImportance[p.syllabus_id].push(p.importance_score || 0.5);
        }
      }
    }

    // Calculate weighted average
    let totalWeight = 0;
    let weightedSum = 0;

    for (const attempt of attempts) {
      const importance = topicImportance[attempt.syllabus_id];
      const avgImportance = importance
        ? importance.reduce((a, b) => a + b, 0) / importance.length
        : 0.5;

      const scorePercent = attempt.total_questions > 0
        ? (attempt.correct_count / attempt.total_questions) * 100
        : 0;

      weightedSum += scorePercent * avgImportance;
      totalWeight += avgImportance;
    }

    const score = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    const avgScore = attempts.reduce((s, a) => s + (a.score || 0), 0) / attempts.length;

    return {
      score: Math.min(100, score),
      details: {
        totalAttempts: attempts.length,
        avgScore: Math.round(avgScore * 10) / 10,
      },
    };
  }

  /**
   * Velocity Score — Rate of improvement over recent attempts
   * Compares last 5 attempts vs previous 5
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

    const mid = Math.floor(attempts.length / 2);
    const recent = attempts.slice(0, mid);
    const older = attempts.slice(mid);

    const recentAvg = recent.reduce((s, a) => s + (a.score || 0), 0) / recent.length;
    const olderAvg = older.reduce((s, a) => s + (a.score || 0), 0) / older.length;

    // Calculate improvement ratio
    let improvementRatio;
    if (olderAvg === 0) {
      improvementRatio = recentAvg > 0 ? 1 : 0;
    } else {
      improvementRatio = (recentAvg - olderAvg) / olderAvg;
    }

    // Convert to 0-100 score:
    // -50% decline → 0, stable → 50, +50% improvement → 100
    const score = Math.max(0, Math.min(100, Math.round(50 + (improvementRatio * 100))));

    const trend = improvementRatio > 0.05 ? 'improving' :
                  improvementRatio < -0.05 ? 'declining' : 'stable';

    return {
      score,
      details: {
        trend,
        recentAvg: Math.round(recentAvg * 10) / 10,
        olderAvg: Math.round(olderAvg * 10) / 10,
        dataPoints: attempts.length,
      },
    };
  }

  /**
   * Consistency Score — How regularly the user has been studying
   * Based on study days in the last 14 days
   */
  async calculateConsistency(sessionId, userId) {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: attempts } = await supabase
      .from('readiness_quiz_attempts')
      .select('submitted_at')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .gte('submitted_at', fourteenDaysAgo.toISOString());

    if (!attempts || attempts.length === 0) {
      return { score: 0, details: { activeDays: 0, totalDays: 14 } };
    }

    // Count unique study days
    const studyDays = new Set(
      attempts.map((a) => new Date(a.submitted_at).toISOString().split('T')[0])
    );

    const activeDays = studyDays.size;
    const score = Math.round((activeDays / 14) * 100);

    return {
      score: Math.min(100, score),
      details: { activeDays, totalDays: 14 },
    };
  }

  /**
   * Get per-topic score breakdown
   */
  async getTopicBreakdown(sessionId, userId) {
    const { data: topics } = await supabase
      .from('syllabus_topics')
      .select('syllabus_id, topic_name, is_optional, question_count')
      .eq('session_id', sessionId)
      .eq('is_selected', true);

    if (!topics) return [];

    const { data: attempts } = await supabase
      .from('readiness_quiz_attempts')
      .select('syllabus_id, score, correct_count, total_questions')
      .eq('session_id', sessionId)
      .eq('user_id', userId);

    const attemptsByTopic = {};
    if (attempts) {
      for (const a of attempts) {
        if (!attemptsByTopic[a.syllabus_id]) attemptsByTopic[a.syllabus_id] = [];
        attemptsByTopic[a.syllabus_id].push(a);
      }
    }

    return topics.map((topic) => {
      const topicAttempts = attemptsByTopic[topic.syllabus_id] || [];
      const avgScore = topicAttempts.length > 0
        ? topicAttempts.reduce((s, a) => s + (a.score || 0), 0) / topicAttempts.length
        : 0;

      return {
        syllabusId: topic.syllabus_id,
        topicName: topic.topic_name,
        isOptional: topic.is_optional,
        questionCount: topic.question_count,
        attempts: topicAttempts.length,
        avgScore: Math.round(avgScore * 10) / 10,
        mastery: avgScore >= 7 ? 'strong' : avgScore >= 4 ? 'moderate' : topicAttempts.length > 0 ? 'weak' : 'not_started',
      };
    });
  }

  /**
   * Determine readiness level from score
   */
  getReadinessLevel(score) {
    if (score >= 85) return { label: 'Exam Ready! 🎉', color: '#22c55e', emoji: '🟢' };
    if (score >= 70) return { label: 'Almost There! 💪', color: '#eab308', emoji: '🟡' };
    if (score >= 50) return { label: 'Making Progress 📈', color: '#f97316', emoji: '🟠' };
    if (score >= 25) return { label: 'Keep Studying 📚', color: '#ef4444', emoji: '🔴' };
    return { label: 'Just Getting Started 🌱', color: '#94a3b8', emoji: '⚪' };
  }

  /**
   * Estimate when the user will be ready based on current velocity
   */
  estimateReadyDate(currentScore, examDate) {
    if (currentScore >= 85) return 'You are ready now!';
    if (!examDate) return null;

    const exam = new Date(examDate);
    const now = new Date();
    const daysLeft = Math.ceil((exam - now) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) return 'Exam date has passed';

    // Approximate how many days needed at current pace
    const remaining = 85 - currentScore;
    const dailyGain = currentScore > 0 ? currentScore / 7 : 3; // assume ~3pts/day for new users
    const daysNeeded = Math.ceil(remaining / dailyGain);

    if (daysNeeded <= daysLeft) {
      const readyDate = new Date(now);
      readyDate.setDate(readyDate.getDate() + daysNeeded);
      return readyDate.toISOString().split('T')[0];
    }

    return `Need to increase study pace — ${daysNeeded} days needed, only ${daysLeft} days left`;
  }

  /**
   * Generate personalized study recommendations
   */
  generateRecommendations(coverage, mastery, velocity, consistency) {
    const recommendations = [];

    if (coverage.score < 50) {
      const uncovered = coverage.details.uncovered?.slice(0, 3) || [];
      recommendations.push({
        type: 'coverage',
        priority: 'high',
        message: `Cover more topics! You've only studied ${coverage.details.covered}/${coverage.details.total} topics.`,
        action: uncovered.length > 0 ? `Start with: ${uncovered.join(', ')}` : 'Upload more study material',
      });
    }

    if (mastery.score < 60) {
      recommendations.push({
        type: 'mastery',
        priority: 'high',
        message: `Your average score is ${mastery.details.avgScore}/10. Focus on weak areas.`,
        action: 'Retake quizzes on topics scoring below 7/10',
      });
    }

    if (velocity.details.trend === 'declining') {
      recommendations.push({
        type: 'velocity',
        priority: 'medium',
        message: 'Your scores are declining. Take a break and review fundamentals.',
        action: 'Review flashcards and summaries before attempting more quizzes',
      });
    }

    if (consistency.score < 40) {
      recommendations.push({
        type: 'consistency',
        priority: 'medium',
        message: `You've only studied ${consistency.details.activeDays} days in the last 2 weeks.`,
        action: 'Set a daily 30-minute study goal on Aura',
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'positive',
        priority: 'low',
        message: '🎯 You\'re on track! Keep up the excellent work.',
        action: 'Continue your current study rhythm',
      });
    }

    return recommendations;
  }
}

const readinessEngine = new ReadinessEngine();
export default readinessEngine;
export { ReadinessEngine };
