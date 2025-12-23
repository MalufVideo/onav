/**
 * Neon Database Adapter
 * Temporary replacement for Supabase while it's down
 * Uses PostgreSQL client (pg) for better compatibility with existing code
 */

const { Pool } = require('pg');

class NeonDB {
  constructor(connectionString) {
    if (!connectionString) {
      throw new Error('DATABASE_URL is required');
    }
    // Use pg Pool for connection pooling
    this.pool = new Pool({
      connectionString: connectionString,
      ssl: {
        rejectUnauthorized: false // Required for Neon
      }
    });
  }

  /**
   * Execute a SQL query with parameterized values
   * @param {string} query - SQL query string
   * @param {Array} params - Query parameters (optional)
   */
  async query(query, params = []) {
    try {
      const result = await this.pool.query(query, params);
      return { data: result.rows, error: null };
    } catch (error) {
      console.error('Database query error:', error);
      return { data: null, error };
    }
  }

  /**
   * Get user by ID (replaces supabase.auth.getUser)
   * @param {string} userId - User ID
   */
  async getUserById(userId) {
    try {
      const result = await this.pool.query(
        'SELECT id, email, full_name, phone, role, is_active, created_at FROM public.user_profiles WHERE id = $1 AND is_active = true',
        [userId]
      );

      if (result.rows.length === 0) {
        return { data: { user: null }, error: new Error('User not found') };
      }

      const row = result.rows[0];
      return {
        data: {
          user: {
            id: row.id,
            email: row.email,
            user_metadata: {
              full_name: row.full_name,
              phone: row.phone,
              role: row.role
            }
          }
        },
        error: null
      };
    } catch (error) {
      console.error('getUserById error:', error);
      return { data: { user: null }, error };
    }
  }

  /**
   * Temporary auth bypass - validates a simple token or email
   * In production with Supabase, this would validate JWT tokens
   * For now, we'll accept requests without strict auth
   */
  async validateToken(token) {
    // TODO: Implement proper JWT validation when needed
    // For now, just return success to allow operations during migration
    return { valid: true };
  }

  /**
   * Admin: List all users
   */
  async listUsers() {
    try {
      const result = await this.pool.query(
        'SELECT id, email, full_name, phone, role, is_active, created_at, updated_at FROM public.user_profiles ORDER BY created_at DESC'
      );

      // Transform to match Supabase format
      const transformedUsers = result.rows.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        user_metadata: {
          full_name: u.full_name,
          phone: u.phone,
          role: u.role,
          is_active: u.is_active
        }
      }));

      return {
        data: { users: transformedUsers },
        error: null
      };
    } catch (error) {
      console.error('listUsers error:', error);
      return { data: { users: [] }, error };
    }
  }

  /**
   * Admin: Create user
   * @param {Object} userData - User data including email, password, metadata
   */
  async createUser(userData) {
    try {
      const { email, password, email_confirm = true, user_metadata = {} } = userData;
      const crypto = require('crypto');

      // Simple password hash (in production, use bcrypt)
      const password_hash = password ? crypto.createHash('sha256').update(password).digest('hex') : null;

      const result = await this.pool.query(
        `INSERT INTO public.user_profiles (email, password_hash, full_name, phone, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, full_name, phone, role, is_active, created_at`,
        [
          email,
          password_hash,
          user_metadata.full_name || null,
          user_metadata.phone || null,
          user_metadata.role || 'client',
          user_metadata.is_active !== undefined ? user_metadata.is_active : true
        ]
      );

      const user = result.rows[0];
      return {
        data: {
          user: {
            id: user.id,
            email: user.email,
            created_at: user.created_at,
            user_metadata: {
              full_name: user.full_name,
              phone: user.phone,
              role: user.role,
              is_active: user.is_active
            }
          }
        },
        error: null
      };
    } catch (error) {
      console.error('createUser error:', error);
      return { data: null, error };
    }
  }

  /**
   * Admin: Update user by ID
   */
  async updateUserById(userId, updates) {
    try {
      const { email, user_metadata = {}, password } = updates;
      const crypto = require('crypto');

      // Build dynamic update query
      const updateFields = [];
      const values = [];

      if (email) {
        updateFields.push(`email = $${updateFields.length + 1}`);
        values.push(email);
      }
      if (user_metadata.full_name !== undefined) {
        updateFields.push(`full_name = $${updateFields.length + 1}`);
        values.push(user_metadata.full_name);
      }
      if (user_metadata.phone !== undefined) {
        updateFields.push(`phone = $${updateFields.length + 1}`);
        values.push(user_metadata.phone);
      }
      if (user_metadata.role !== undefined) {
        updateFields.push(`role = $${updateFields.length + 1}`);
        values.push(user_metadata.role);
      }
      if (user_metadata.is_active !== undefined) {
        updateFields.push(`is_active = $${updateFields.length + 1}`);
        values.push(user_metadata.is_active);
      }
      if (password) {
        const password_hash = crypto.createHash('sha256').update(password).digest('hex');
        updateFields.push(`password_hash = $${updateFields.length + 1}`);
        values.push(password_hash);
      }

      if (updateFields.length === 0) {
        return { data: null, error: new Error('No fields to update') };
      }

      values.push(userId);
      const query = `
        UPDATE public.user_profiles
        SET ${updateFields.join(', ')}, updated_at = now()
        WHERE id = $${values.length}
        RETURNING id, email, full_name, phone, role, is_active
      `;

      const result = await this.sql(query, values);

      if (result.length === 0) {
        return { data: null, error: new Error('User not found') };
      }

      const user = result[0];
      return {
        data: {
          user: {
            id: user.id,
            email: user.email,
            user_metadata: {
              full_name: user.full_name,
              phone: user.phone,
              role: user.role,
              is_active: user.is_active
            }
          }
        },
        error: null
      };
    } catch (error) {
      console.error('updateUserById error:', error);
      return { data: null, error };
    }
  }

  /**
   * Admin: Delete user
   */
  async deleteUser(userId) {
    try {
      await this.pool.query('DELETE FROM public.user_profiles WHERE id = $1', [userId]);
      return { error: null };
    } catch (error) {
      console.error('deleteUser error:', error);
      return { error };
    }
  }

  /**
   * Admin: Generate magic link (temporary stub)
   */
  async generateLink(options) {
    // For now, return a placeholder
    // In production, implement proper magic link generation
    return {
      data: {
        properties: {
          action_link: `http://localhost:3000/auth/verify?email=${options.email}`
        }
      },
      error: null
    };
  }

  /**
   * Execute raw SQL (replaces supabase.rpc('execute_sql'))
   */
  async executeSQL(sqlQuery) {
    return this.query(sqlQuery);
  }
}

module.exports = NeonDB;
