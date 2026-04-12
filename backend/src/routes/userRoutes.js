import express from 'express';
import supabase from '../utils/supabase.js';
import twilio from 'twilio';
import config from '../config/index.js';

const router = express.Router();

// Initialize Twilio client if credentials exist
const twilioClient = config.twilioAccountSid ? twilio(
  config.twilioAccountSid,
  config.twilioAuthToken
) : null;

/**
 * GET /api/user/:userId - Get user profile
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // SAFE SYNC: Only create if missing, do not overwrite existing data
    const { data: existingUser } = await supabase
      .from('users')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (!existingUser) {
      await supabase.from('users').insert({ 
        user_id: userId,
        email: req.query.email || 'user@example.com',
        created_at: new Date().toISOString()
      });
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/user/update - Update profile & notifications
 */
router.post('/update', async (req, res) => {
  try {
    const { userId, name, mobile, email_notifications } = req.body;

    const { data, error } = await supabase
      .from('users')
      .upsert({ 
        user_id: userId,
        name, 
        mobile, 
        email_notifications,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/user/send-otp - Generate and send real SMS OTP
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { userId, mobile } = req.body;

    // IMPORTANT: Ensure user exists before inserting into otp_verifications
    // Use select/insert instead of upsert to avoid overwriting the 'name' field
    const { data: existingUser } = await supabase
      .from('users')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (!existingUser) {
      await supabase.from('users').insert({ 
        user_id: userId,
        mobile: mobile,
        created_at: new Date().toISOString()
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000).toISOString(); // 10 mins

    const { error: otpError } = await supabase
      .from('otp_verifications')
      .insert({
        user_id: userId,
        mobile,
        otp_code: otp,
        expires_at: expiresAt
      });

    if (otpError) {
      console.error('CRITICAL: OTP insertion failed:', otpError);
      throw otpError;
    }

    // Send Real SMS via Twilio if configured
    if (twilioClient) {
      const normalizedMobile = mobile.replace(/\D/g, '');
      const normalizedTwilio = (config.twilioPhoneNumber || '').replace(/\D/g, '');

      if (!normalizedTwilio || normalizedMobile === normalizedTwilio) {
        throw new Error(`Invalid Twilio Configuration. Normalized To: ${normalizedMobile}, From: ${normalizedTwilio}. Please check backend/.env`);
      }
      
      try {
        await twilioClient.messages.create({
          body: `Your Aura verification code is: ${otp}`,
          to: mobile,
          from: config.twilioPhoneNumber,
        });
        console.log(`[AURA] Real OTP sent to ${mobile}`);
      } catch (twilioError) {
        console.error('Twilio SMS Error:', twilioError.message);
        // Fallback: return OTP in response so they can still test even if Twilio fails
        return res.json({ 
          success: true, 
          message: 'Twilio Send Failed, but OTP generated (see console)', 
          otp: otp,
          warning: 'Check your Twilio Number in .env'
        });
      }
    } else {
      console.log(`[AURA DEBUG] No Twilio Config. Sent OTP ${otp} to ${mobile}`);
    }

    // In development mode (or if no Twilio), return OTP in response for testing
    const showOtpInResponse = !twilioClient || process.env.NODE_ENV === 'development';

    res.json({ 
      success: true, 
      message: 'OTP sent successfully', 
      otp: showOtpInResponse ? otp : undefined 
    });
  } catch (error) {
    console.error('OTP Send Error:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

/**
 * POST /api/user/send-email-otp - Generate and send Email OTP
 */
router.post('/send-email-otp', async (req, res) => {
  try {
    const { userId, email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60000).toISOString(); // 15 mins

    const { error: otpError } = await supabase
      .from('otp_verifications')
      .insert({
        user_id: userId,
        otp_code: otp,
        expires_at: expiresAt,
        is_verified: false
      });

    if (otpError) throw otpError;

    // Send Email via our EmailService
    const { default: emailService } = await import('../services/emailService.js');
    const sent = await emailService.sendVerificationEmail(email, otp);

    if (!sent) {
      throw new Error('Failed to send email. Check backend configuration.');
    }

    res.json({ success: true, message: 'Verification code sent to your email!' });
  } catch (error) {
    console.error('Email OTP Error:', error);
    res.status(500).json({ error: error.message || 'Failed to send email OTP' });
  }
});

/**
 * POST /api/user/verify-otp - Verify the code
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const { data, error } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('user_id', userId)
      .eq('otp_code', otp)
      .eq('is_verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data.length) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Mark as verified
    await supabase
      .from('otp_verifications')
      .update({ is_verified: true })
      .eq('id', data[0].id);

    // Update user status
    await supabase
      .from('users')
      .update({ updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    res.json({ success: true, message: 'Mobile verified successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
