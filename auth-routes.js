/**
 * Authentication Routes for Neon Database
 * Simple JWT-based authentication to replace Supabase Auth
 */

const crypto = require('crypto');

// Simple JWT implementation (for production, use jsonwebtoken package)
function createToken(userId, email) {
  const payload = {
    userId,
    email,
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  const token = Buffer.from(JSON.stringify(payload)).toString('base64');
  return token;
}

function verifyToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    if (payload.exp < Date.now()) {
      return null; // Expired
    }
    return payload;
  } catch (error) {
    return null;
  }
}

function setupAuthRoutes(app, db, USE_NEON) {

  // Signup endpoint
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password, full_name, phone } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (USE_NEON) {
        // Create user in Neon database
        const result = await db.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: full_name || '',
            phone: phone || '',
            role: 'client',
            is_active: true
          }
        });

        if (result.error) {
          if (result.error.message?.includes('duplicate key') || result.error.code === '23505') {
            return res.status(400).json({ error: 'Email already exists' });
          }
          throw result.error;
        }

        const user = result.data.user;
        const token = createToken(user.id, user.email);

        res.json({
          user: {
            id: user.id,
            email: user.email,
            user_metadata: user.user_metadata
          },
          session: {
            access_token: token,
            user: {
              id: user.id,
              email: user.email
            }
          }
        });
      } else {
        // Fallback to Supabase (when it's available)
        return res.status(503).json({ error: 'Supabase Auth not available' });
      }
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ error: error.message || 'Failed to create user' });
    }
  });

  // Login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (USE_NEON) {
        // Verify credentials in Neon database
        const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

        const result = await db.query(
          'SELECT id, email, full_name, phone, role, is_active, password_hash FROM public.user_profiles WHERE email = $1',
          [email]
        );

        if (!result.data || result.data.length === 0) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.data[0];

        if (!user.is_active) {
          return res.status(401).json({ error: 'Account is inactive' });
        }

        if (user.password_hash !== passwordHash) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = createToken(user.id, user.email);

        res.json({
          user: {
            id: user.id,
            email: user.email,
            user_metadata: {
              full_name: user.full_name,
              phone: user.phone,
              role: user.role
            }
          },
          session: {
            access_token: token,
            user: {
              id: user.id,
              email: user.email
            }
          }
        });
      } else {
        // Fallback to Supabase
        return res.status(503).json({ error: 'Supabase Auth not available' });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Failed to login' });
    }
  });

  // Get current user endpoint (verify token)
  app.get('/api/auth/user', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No authorization token' });
      }

      const token = authHeader.substring(7);
      const payload = verifyToken(token);

      if (!payload) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      if (USE_NEON) {
        // Get user from database
        const result = await db.query(
          'SELECT id, email, full_name, phone, role, is_active FROM public.user_profiles WHERE id = $1 AND is_active = true',
          [payload.userId]
        );

        if (!result.data || result.data.length === 0) {
          return res.status(401).json({ error: 'User not found' });
        }

        const user = result.data[0];

        res.json({
          user: {
            id: user.id,
            email: user.email,
            user_metadata: {
              full_name: user.full_name,
              phone: user.phone,
              role: user.role
            }
          }
        });
      } else {
        return res.status(503).json({ error: 'Supabase Auth not available' });
      }
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  });

  // Logout endpoint (client-side should delete token, but we provide endpoint for consistency)
  app.post('/api/auth/logout', (req, res) => {
    res.json({ message: 'Logged out successfully' });
  });
}

module.exports = { setupAuthRoutes, verifyToken };
