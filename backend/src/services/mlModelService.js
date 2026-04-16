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
    this.reviewCenterDays = 7;
    this.confidenceScaleDivisor = 20;

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
   * Predict using the loaded XGBoost model
   * @private
   */
  predictWithModel(features) {
    const weights = this.modelArtifact?.weights || {};
    const intercept = Number(this.modelArtifact?.intercept || 0);
    const minDays = Number(this.modelArtifact?.minDays || 1);
    const maxDays = Number(this.modelArtifact?.maxDays || 60);
    const calibration = Number(this.modelArtifact?.confidenceCalibration || 1);

    let raw = intercept;
    for (const featureName of this.featureSchema) {
      raw += Number(weights[featureName] || 0) * Number(features[featureName] || 0);
    }

    // Confidence increases as prediction moves away from the uncertain mid-zone (~7 days),
    // and calibration shifts baseline confidence for the artifact.
    const centeredConfidence = Math.abs(raw - this.reviewCenterDays) / this.confidenceScaleDivisor;
    const confidence = Math.max(0, Math.min(1, centeredConfidence + calibration));
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
   * Fallback prediction using spaced repetition principles
   * Based on SM-2 algorithm concepts
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
    // Calculate ease factor based on performance (2.5 is default, range 1.3-2.5)
    const performanceRatio = (latestScore + avgScore) / 20; // 0 to 1
    const easeFactor = 1.3 + (performanceRatio * 1.2); // 1.3 to 2.5
    
    // Base interval calculation
    let interval;
    
    if (attemptsCount === 1) {
      // First review: 1-3 days based on score
      interval = latestScore >= 7 ? 3 : latestScore >= 5 ? 2 : 1;
    } else if (attemptsCount === 2) {
      // Second review: 3-7 days
      interval = latestScore >= 7 ? 7 : latestScore >= 5 ? 5 : 3;
    } else {
      // Subsequent reviews: use spaced repetition formula
      const previousInterval = Math.max(daysSinceLastAttempt, 1);
      interval = Math.round(previousInterval * easeFactor);
    }
    
    // Apply performance modifier
    if (latestScore < 5) {
      // Poor performance: reduce interval significantly
      interval = Math.max(1, Math.floor(interval * 0.5));
    } else if (latestScore >= 9) {
      // Excellent performance: increase interval
      interval = Math.min(60, Math.ceil(interval * 1.3));
    }

    // Trend and repeated mistakes adjustments
    if (recentTrend > 1.5) {
      interval = Math.ceil(interval * 1.15);
    } else if (recentTrend < -1.5) {
      interval = Math.floor(interval * 0.8);
    }
    if (repeatedWrongCount >= 3) {
      interval = Math.max(1, Math.floor(interval * 0.65));
    }
    
    // Cap at reasonable bounds
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
      type: this.modelLoaded ? 'Artifact (Linear Regression)' : 'Fallback (Spaced Repetition)',
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
