import nodemailer from 'nodemailer';
import config from '../config/index.js';

/**
 * Email Service - Handles email sending via Nodemailer
 * Requirements: 13.1, 13.2, 13.3
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.initializeTransporter();
  }

  /**
   * Initialize the email transporter
   * @private
   */
  initializeTransporter() {
    try {
      if (config.gmailUser && config.gmailAppPassword) {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: config.gmailUser,
            pass: config.gmailAppPassword
          }
        });
        this.initialized = true;
        console.log('✅ Email service initialized');
      } else {
        console.warn('⚠️ Email service not configured (missing GMAIL_USER or GMAIL_APP_PASSWORD)');
      }
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error.message);
    }
  }

  /**
   * Send an email
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} html - HTML content of the email
   * @returns {Promise<boolean>} True if email sent successfully
   * Requirements: 13.2
   */
  async sendEmail(to, subject, html) {
    if (!this.initialized || !this.transporter) {
      console.warn('⚠️ Email service not initialized, skipping email');
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: config.gmailUser,
        to,
        subject,
        html
      });
      console.log(`✅ Email sent successfully to ${to}`);
      return true;
    } catch (error) {
      // Log error but don't crash the application (Requirement 13.3)
      console.error('❌ Failed to send email:', error.message);
      return false;
    }
  }

  /**
   * Send an email asynchronously (fire and forget)
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} html - HTML content of the email
   * Requirements: 13.2
   */
  sendEmailAsync(to, subject, html) {
    // Fire and forget - don't await
    setImmediate(() => {
      this.sendEmail(to, subject, html).catch(error => {
        console.error('❌ Async email failed:', error.message);
      });
    });
  }


  /**
   * Generate quiz results email HTML template
   * @param {Object} params - Email parameters
   * @param {string} params.userName - User's name
   * @param {string} params.topicTitle - Quiz topic title
   * @param {number} params.score - Quiz score (0-10)
   * @param {number} params.totalQuestions - Total number of questions
   * @param {number} params.correctAnswers - Number of correct answers
   * @param {string} params.topicStatus - Topic status (Completed/Weak)
   * @param {string} params.nextReviewDate - Next review date
   * @returns {string} HTML email content
   */
  generateQuizResultsEmail({
    userName = 'Student',
    topicTitle,
    score,
    totalQuestions,
    correctAnswers,
    topicStatus,
    nextReviewDate
  }) {
    const scorePercentage = Math.round((score / 10) * 100);
    const isPassing = score > 7;
    const statusColor = isPassing ? '#22c55e' : '#ef4444';
    const statusText = isPassing ? 'Great job!' : 'Keep practicing!';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quiz Results - Recallo</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">📚 Recallo</h1>
        <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Quiz Results</p>
      </div>
      
      <!-- Content -->
      <div style="padding: 30px;">
        <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">
          Hi ${userName},
        </p>
        
        <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">
          Here are your quiz results for <strong>${topicTitle}</strong>:
        </p>
        
        <!-- Score Card -->
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 20px;">
          <div style="font-size: 48px; font-weight: bold; color: ${statusColor};">
            ${score}/10
          </div>
          <div style="font-size: 14px; color: #6b7280; margin-top: 5px;">
            ${correctAnswers} out of ${totalQuestions} correct (${scorePercentage}%)
          </div>
          <div style="font-size: 18px; color: ${statusColor}; margin-top: 10px; font-weight: 600;">
            ${statusText}
          </div>
        </div>
        
        <!-- Status Info -->
        <div style="background-color: ${isPassing ? '#f0fdf4' : '#fef2f2'}; border-left: 4px solid ${statusColor}; padding: 15px; margin-bottom: 20px;">
          <p style="margin: 0; color: #374151;">
            <strong>Topic Status:</strong> ${topicStatus}
          </p>
          ${nextReviewDate ? `
          <p style="margin: 10px 0 0 0; color: #374151;">
            <strong>Next Review:</strong> ${nextReviewDate}
          </p>
          ` : ''}
        </div>
        
        <!-- Tips -->
        <div style="margin-top: 20px;">
          <p style="color: #374151; font-size: 14px; margin: 0;">
            ${isPassing 
              ? '🎉 Excellent work! Keep up the great progress. Your next review is scheduled to help you retain this knowledge.'
              : '💪 Don\'t worry! Review the material and try again. Practice makes perfect!'}
          </p>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">
          This email was sent by Recallo - Your AI Learning Assistant
        </p>
        <p style="color: #9ca3af; font-size: 11px; margin: 10px 0 0 0;">
          © ${new Date().getFullYear()} Recallo. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Send quiz results email
   * @param {string} to - Recipient email address
   * @param {Object} results - Quiz results data
   * @returns {Promise<boolean>} True if email sent successfully
   */
  async sendQuizResultsEmail(to, results) {
    const subject = `Quiz Results: ${results.topicTitle} - ${results.score}/10`;
    const html = this.generateQuizResultsEmail(results);
    return await this.sendEmail(to, subject, html);
  }

  /**
   * Send quiz results email asynchronously
   * @param {string} to - Recipient email address
   * @param {Object} results - Quiz results data
   */
  sendQuizResultsEmailAsync(to, results) {
    const subject = `Quiz Results: ${results.topicTitle} - ${results.score}/10`;
    const html = this.generateQuizResultsEmail(results);
    this.sendEmailAsync(to, subject, html);
  }

  /**
   * Check if email service is initialized
   * @returns {boolean} True if service is ready
   */
  isInitialized() {
    return this.initialized;
  }
}

// Export singleton instance
const emailService = new EmailService();
export default emailService;

// Also export the class for testing
export { EmailService };
