import supabase from './supabase.js';

/**
 * Ensures a user exists in the users table
 * Creates user if not present, otherwise returns existing user
 * @param {string} userId - User ID from Supabase Auth
 * @param {string} email - User email (optional)
 * @param {string} name - User name (optional)
 * @returns {Promise<Object>} User object
 */
export async function ensureUserExists(userId, email = null, name = null) {
  try {
    // First, try to get existing user
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching user:', fetchError);
      throw fetchError;
    }

    // If user exists, return it
    if (existingUser) {
      return existingUser;
    }

    // Create new user if doesn't exist
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        user_id: userId,
        email: email || `user-${userId}@example.com`,
        name: name || 'User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating user:', insertError);
      throw insertError;
    }

    console.log(`✅ Created new user: ${userId}`);
    return newUser;

  } catch (error) {
    console.error('User sync error:', error);
    throw error;
  }
}

/**
 * Gets user info from Supabase Auth and syncs to users table
 * @param {string} userId - User ID from Supabase Auth
 * @returns {Promise<Object>} User object
 */
export async function syncUserFromAuth(userId) {
  try {
    // Get user from Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError) {
      console.error('Error fetching auth user:', authError);
      // Fall back to creating a basic user
      return await ensureUserExists(userId);
    }

    const userMetadata = authUser.user?.user_metadata || {};
    const email = authUser.user?.email;
    const name = userMetadata.name || userMetadata.full_name || authUser.user?.email?.split('@')[0] || 'User';

    return await ensureUserExists(userId, email, name);

  } catch (error) {
    console.error('Auth sync error:', error);
    // Fall back to creating a basic user
    return await ensureUserExists(userId);
  }
}
