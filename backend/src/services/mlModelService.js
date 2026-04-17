import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ML Model Service - Handles XGBoost model predictions for review scheduling
 * Requirements: 14.1, 14.2, 14.3
 * 
 * Note: Since xgboost-scorer may not be available, this implementation uses
 * a simplified prediction algorithm based on the model's expected behavior.
 * The actual XGBoost model can be loaded when the package is available.
 */
class MLModelService {
  constructor() {
    this.model = null;
    this.modelArtifact = null;
    this.modelLoaded = false;
    this.modelPath = path.join(__dirname, '../../model-artifacts/review-scheduler.v1.json');
    this.modelVersion = 'fallback-v1';
    this.featureSchema = [
      'latestScore',
      'avgScore',
      'attemptsCount',
      'daysSinceLastAttempt',
      'recentTrend',
      'repeatedWrongCount'
    ];
    this.reviewCenterDays = 7;        // kept for backward-compatibility

    // Confidence formula constants
    this.MAX_ATTEMPT_CONFIDENCE  = 0.3;  // maximum contribution from attempt count
    this.ATTEMPT_CONFIDENCE_RATE = 0.04; // confidence gained per attempt
    this.SCORE_CONFIDENCE_WEIGHT = 0.2;  // maximum contribution from score extremity
    this.SCORE_MIDPOINT          = 5;    // midpoint of the 0-10 scoring scale
    this.SCORE_HALF_RANGE        = 5;    // half-range of the 0-10 scoring scale

    // Warm-load model artifact if available
    this.loadModel().catch(() => {});
  }

  /**
   * Load the XGBoost model from JSON file
   * @param {string} [modelPath] - Optional custom path to model file
   * @returns {Promise<boolean>} True if model loaded successfully
   */
  async loadModel(modelPath = null) {
    try {
      const filePath = modelPath || this.modelPath;
      const modelJson = await fs.readFile(filePath, 'utf-8');
      const artifact = JSON.parse(modelJson);
      if (!artifact || artifact.type !== 'linear-regression' || !artifact.weights) {
        throw new Error('Invalid model artifact format');
      }
      this.modelArtifact = artifact;
      this.model = artifact;
      this.modelVersion = artifact.version || 'artifact-v1';
      this.featureSchema = Array.isArray(artifact.featureSchema) && artifact.featureSchema.length > 0
        ? artifact.featureSchema
        : this.featureSchema;
      this.modelLoaded = true;
      console.log(`✅ ML model loaded successfully (${this.modelVersion})`);
      return true;
    } catch (error) {
      console.warn('⚠️ ML model not found, using fallback prediction algorithm');
      this.modelLoaded = false;
      this.modelVersion = 'fallback-v1';
      return false;
    }
  }

  /**
   * Predict the number of days until next review
   * Uses spaced repetition principles based on user performance
   * 
   * @param {number} latestScore - Most recent quiz score (0-10)
   * @param {number} avgScore - Average score across all attempts (0-10)
   * @param {number} attemptsCount - Number of quiz attempts
   * @param {number} daysSinceLastAttempt - Days since last attempt
   * @returns {number} Predicted days until next review (positive integer)
   * Requirements: 14.2, 14.3
   */
  predictNextReviewDays(
    latestScore,
    avgScore,
    attemptsCount,
    daysSinceLastAttempt,
    recentTrend = 0,
    repeatedWrongCount = 0
  ) {
    return this.predictReviewSchedule(
      latestScore,
      avgScore,
      attemptsCount,
      daysSinceLastAttempt,
      recentTrend,
      repeatedWrongCount
    ).days;
  }

  /**
   * Predict review schedule with confidence and source metadata.
   */
  predictReviewSchedule(
    latestScore,
    avgScore,
    attemptsCount,
    daysSinceLastAttempt,
    recentTrend = 0,
    repeatedWrongCount = 0
  ) {
    // Validate inputs
    const validLatestScore = Math.max(0, Math.min(10, latestScore || 0));
    const validAvgScore = Math.max(0, Math.min(10, avgScore || 0));
    const validAttemptsCount = Math.max(1, attemptsCount || 1);
    const validDaysSince = Math.max(0, daysSinceLastAttempt || 0);
    const validRecentTrend = Math.max(-10, Math.min(10, recentTrend || 0));
    const validRepeatedWrongCount = Math.max(0, Math.min(20, repeatedWrongCount || 0));

    const features = {
      latestScore: validLatestScore,
      avgScore: validAvgScore,
      attemptsCount: validAttemptsCount,
      daysSinceLastAttempt: validDaysSince,
      recentTrend: validRecentTrend,
      repeatedWrongCount: validRepeatedWrongCount
    };

    // If model is loaded, use it for prediction
    if (this.modelLoaded && this.model) {
      const modelPrediction = this.predictWithModel(features);
      if (modelPrediction.confidence >= 0.5) {
        return modelPrediction;
      }
      const fallbackDays = this.predictWithFallback(
        validLatestScore,
        validAvgScore,
        validAttemptsCount,
        validDaysSince,
        validRecentTrend,
        validRepeatedWrongCount
      );
      return {
        days: fallbackDays,
        confidence: modelPrediction.confidence,
        source: 'fallback-low-confidence',
        modelVersion: this.modelVersion,
        usedFallback: true
      };
    }

    // Fallback: Use spaced repetition algorithm
    const days = this.predictWithFallback(
      validLatestScore,
      validAvgScore,
      validAttemptsCount,
      validDaysSince,
      validRecentTrend,
      validRepeatedWrongCount
    );
    return {
      days,
      confidence: 0.4,
      source: 'fallback-no-model',
      modelVersion: this.modelVersion,
      usedFallback: true
    };
  }

  /**
   * Predict using the loaded linear-regression model artifact.
   * Confidence is derived from input quality (attempt count and score clarity)
   * rather than prediction distance from a fixed center — this ensures average
   * predictions are not wrongly marked as low-confidence.
   * @private
   */
  predictWithModel(features) {
    const weights = this.modelArtifact?.weights || {};
    const intercept = Number(this.modelArtifact?.intercept || 0);
    const minDays = Number(this.modelArtifact?.minDays || 1);
    const maxDays = Number(this.modelArtifact?.maxDays || 60);
    const calibration = Number(this.modelArtifact?.confidenceCalibration || 0.5);

    let raw = intercept;
    for (const featureName of this.featureSchema) {
      raw += Number(weights[featureName] || 0) * Number(features[featureName] || 0);
    }

    // Confidence based on input quality:
    //   - attempt factor: more practice data → higher certainty (caps at MAX_ATTEMPT_CONFIDENCE)
    //   - score extremity: clearly high or clearly low scores are more predictable
    const attemptFactor  = Math.min(this.MAX_ATTEMPT_CONFIDENCE, features.attemptsCount * this.ATTEMPT_CONFIDENCE_RATE);
    const scoreExtremity = Math.abs(features.latestScore - this.SCORE_MIDPOINT) / this.SCORE_HALF_RANGE; // 0 at score=5, 1 at 0 or 10
    const scoreFactor    = scoreExtremity * this.SCORE_CONFIDENCE_WEIGHT;
    const confidence     = Math.max(0, Math.min(1, calibration + attemptFactor + scoreFactor));

    const days = Math.max(minDays, Math.min(maxDays, Math.round(raw)));

    return {
      days,
      confidence,
      source: 'model',
      modelVersion: this.modelVersion,
      usedFallback: false
    };
  }

  /**
   * Fallback prediction using the SM-2 spaced-repetition algorithm.
   *
   * SM-2 core rules:
   *   - Quality q = latestScore / 2  (maps 0-10 → 0-5)
   *   - EF (ease factor) starts at 2.5, adjusted each review:
   *       EF' = EF + 0.1 − (5 − q)(0.08 + (5 − q) × 0.02)   [min 1.3]
   *   - Intervals:
   *       I(1) = 1 day
   *       I(2) = 6 days
   *       I(n) = round(I(n-1) × EF)
   *   - If q < 3 (score < 6) restart sequence from I = 1
   *
   * Extended with:
   *   - recentTrend modifier  (improving → longer, declining → shorter)
   *   - repeatedWrongCount penalty (strong reduction for persistent mistakes)
   *   - Forgetting-curve correction (very long gap + weak score → reduce interval)
   * @private
   */
  predictWithFallback(
    latestScore,
    avgScore,
    attemptsCount,
    daysSinceLastAttempt,
    recentTrend = 0,
    repeatedWrongCount = 0
  ) {
    // SM-2 quality: 0–5 scale
    const quality = latestScore / 2;

    // Ease factor derived from combined performance (SM-2 EF formula)
    const performanceRatio = (latestScore + avgScore) / 20; // 0 to 1
    let easeFactor = 1.3 + performanceRatio * 1.2; // initialise in [1.3, 2.5]
    const efDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    easeFactor = Math.max(1.3, Math.min(2.5, easeFactor + efDelta));

    // Base interval (SM-2 schedule)
    let interval;
    if (attemptsCount <= 1) {
      // First review
      interval = quality >= 3.5 ? 3 : quality >= 2.5 ? 2 : 1;
    } else if (attemptsCount === 2) {
      // Second review
      interval = quality >= 3.5 ? 6 : quality >= 2.5 ? 4 : 2;
    } else if (quality < 3) {
      // Failed recall → restart sequence
      interval = 1;
    } else {
      // Subsequent successful reviews: I(n) = I(n-1) * EF
      const previousInterval = Math.max(daysSinceLastAttempt, 1);
      interval = Math.round(previousInterval * easeFactor);
    }

    // Trend modifier
    if (recentTrend > 2) {
      interval = Math.ceil(interval * 1.25);
    } else if (recentTrend > 0.5) {
      interval = Math.ceil(interval * 1.1);
    } else if (recentTrend < -2) {
      interval = Math.floor(interval * 0.7);
    } else if (recentTrend < -0.5) {
      interval = Math.floor(interval * 0.85);
    }

    // Repeated wrong-answer penalty
    if (repeatedWrongCount >= 5) {
      interval = Math.max(1, Math.floor(interval * 0.45));
    } else if (repeatedWrongCount >= 3) {
      interval = Math.max(1, Math.floor(interval * 0.6));
    } else if (repeatedWrongCount >= 1) {
      interval = Math.max(1, Math.floor(interval * 0.8));
    }

    // Forgetting-curve correction: long gap + weak score signals forgotten material
    if (daysSinceLastAttempt > 30 && latestScore < 6) {
      interval = Math.floor(interval * 0.6);
    }

    return Math.max(1, Math.min(60, Math.round(interval)));
  }

  /**
   * Check if model is loaded
   * @returns {boolean} True if model is loaded
   */
  isModelLoaded() {
    return this.modelLoaded;
  }

  /**
   * Get model info
   * @returns {Object} Model information
   */
  getModelInfo() {
    return {
      loaded: this.modelLoaded,
      path: this.modelPath,
      type: this.modelLoaded ? 'Artifact (Linear Regression v2 — SM-2 calibrated)' : 'Fallback (SM-2 Spaced Repetition)',
      version: this.modelVersion,
      featureSchema: this.featureSchema
    };
  }
}

// Export singleton instance
const mlModelService = new MLModelService();
export default mlModelService;

// Also export the class for testing
export { MLModelService };
