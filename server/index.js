const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const corsOptions = {
  origin: (origin, callback) => {
    // Allow no-origin requests (e.g., mobile apps, curl) and any localhost during dev
    if (!origin || /localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }
    // Fallback: allow same-origin
    return callback(null, true);
  },
  credentials: true
};
app.use(cors(corsOptions));
// Ensure preflight requests succeed for all routes (including DELETE)
app.options('*', cors(corsOptions));
app.use(express.json());
// Configure session with production-safe cookie settings for cross-site usage
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // overwritten in production
    sameSite: 'lax', // overwritten in production for cross-site
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

if (process.env.NODE_ENV === 'production') {
  // Required when behind a proxy (Render) to get correct protocol for secure cookies
  app.set('trust proxy', 1);
  sessionConfig.cookie.secure = true; // only send cookie over HTTPS
  sessionConfig.cookie.sameSite = 'none'; // allow cross-site cookies (frontend on different domain)
}

app.use(session(sessionConfig));

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const feedbackFile = path.join(dataDir, 'feedback.json');

// Initialize feedback file if it doesn't exist
if (!fs.existsSync(feedbackFile)) {
  fs.writeFileSync(feedbackFile, JSON.stringify([], null, 2));
}

// Categories storage
const categoriesFile = path.join(dataDir, 'categories.json');

// Initialize categories file if it doesn't exist
if (!fs.existsSync(categoriesFile)) {
  const defaultCategories = [
    { id: 'general', name: 'General', description: 'General feedback' }
  ];
  fs.writeFileSync(categoriesFile, JSON.stringify(defaultCategories, null, 2));
}

// Helper functions
const readFeedback = () => {
  try {
    const data = fs.readFileSync(feedbackFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const writeFeedback = (feedback) => {
  fs.writeFileSync(feedbackFile, JSON.stringify(feedback, null, 2));
};

// Category helpers
const readCategories = () => {
  try {
    const data = fs.readFileSync(categoriesFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const writeCategories = (categories) => {
  fs.writeFileSync(categoriesFile, JSON.stringify(categories, null, 2));
};

const hashIdentifier = (req) => {
  const userAgent = req.headers['user-agent'] || '';
  const timestamp = Date.now().toString();
  return crypto.createHash('sha256').update(userAgent + timestamp).digest('hex');
};

// One-time normalization to keep feedback categories as ids and ensure status exists
(function normalizeData() {
  try {
    const categories = readCategories();
    const byName = Object.fromEntries(categories.map(c => [c.name.toLowerCase(), c.id]));
    const byId = new Set(categories.map(c => c.id));
    const feedback = readFeedback();
    let changed = false;
    for (const f of feedback) {
      // Normalize category: if not an id but matches a name, convert to id
      if (!byId.has(f.category) && typeof f.category === 'string') {
        const id = byName[f.category.toLowerCase()];
        if (id) {
          f.category = id;
          changed = true;
        }
      }
      // Ensure status and admin_note
      if (!f.status) { f.status = 'open'; changed = true; }
      if (f.admin_note === undefined) { f.admin_note = ''; changed = true; }
    }
    if (changed) {
      writeFeedback(feedback);
    }
  } catch (e) {
    console.warn('Normalization skipped:', e?.message || e);
  }
})();

// Admin credentials (hardcoded for now)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Routes
// Public: list categories
app.get('/api/categories', (req, res) => {
  try {
    const categories = readCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Categories CRUD
app.get('/api/admin/categories', (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const categories = readCategories();
  res.json(categories);
});

app.post('/api/admin/categories', (req, res) => {
  try {
    if (!req.session.isAdmin) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const categories = readCategories();
    const newCategory = {
      id: crypto.randomUUID(),
      name,
      description: description || ''
    };
    categories.push(newCategory);
    writeCategories(categories);
    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/admin/categories/:id', (req, res) => {
  try {
    if (!req.session.isAdmin) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const { name, description } = req.body;
    const categories = readCategories();
    const idx = categories.findIndex(c => c.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Category not found' });
    }
    if (name) categories[idx].name = name;
    if (description !== undefined) categories[idx].description = description;
    writeCategories(categories);
    res.json(categories[idx]);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/admin/categories/:id', (req, res) => {
  try {
    if (!req.session.isAdmin) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const categories = readCategories();
    const exists = categories.some(c => c.id === id);
    if (!exists) {
      return res.status(404).json({ error: 'Category not found' });
    }
    const feedback = readFeedback();
    const inUse = feedback.some(f => f.category === id);
    if (inUse) {
      return res.status(400).json({ error: 'Cannot delete category in use by feedback' });
    }
    const updated = categories.filter(c => c.id !== id);
    writeCategories(updated);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/feedback', (req, res) => {
  try {
    const { category, rating, comment } = req.body;

    // Validation
    if (!category || !rating || !comment) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (comment.length < 5) {
      return res.status(400).json({ error: 'Comment must be at least 5 characters long' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Ensure category exists (accept id or name for backward compatibility)
    const categories = readCategories();
    let categoryId = null;
    const byId = categories.find(c => c.id === category);
    if (byId) {
      categoryId = byId.id;
    } else {
      const byName = categories.find(c => c.name.toLowerCase() === String(category).toLowerCase());
      if (byName) categoryId = byName.id;
    }
    if (!categoryId) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const feedback = readFeedback();
    const newFeedback = {
      feedback_id: crypto.randomUUID(),
      category: categoryId, // store category id
      rating: parseInt(rating),
      comment,
      status: 'open', // track admin resolution status
      admin_note: '',
      timestamp: new Date().toISOString(),
      hash: hashIdentifier(req)
    };

    feedback.push(newFeedback);
    writeFeedback(feedback);

    res.status(201).json({ message: 'Feedback submitted successfully', feedback_id: newFeedback.feedback_id });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      req.session.isAdmin = true;
      res.json({ success: true, message: 'Login successful' });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/admin/feedback', (req, res) => {
  try {
    if (!req.session.isAdmin) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const feedback = readFeedback();
    const { category, rating, search, startDate, endDate, status } = req.query;

    let filteredFeedback = feedback;

    // Filter by category (expects category id)
    if (category && category !== 'all') {
      filteredFeedback = filteredFeedback.filter(f => f.category === category);
    }

    // Filter by rating
    if (rating && rating !== 'all') {
      filteredFeedback = filteredFeedback.filter(f => f.rating === parseInt(rating));
    }

    // Filter by status
    if (status && status !== 'all') {
      filteredFeedback = filteredFeedback.filter(f => (f.status || 'open') === status);
    }

    // Filter by date range
    if (startDate) {
      filteredFeedback = filteredFeedback.filter(f => new Date(f.timestamp) >= new Date(startDate));
    }
    if (endDate) {
      filteredFeedback = filteredFeedback.filter(f => new Date(f.timestamp) <= new Date(endDate));
    }

    // Search in comments and admin notes
    if (search) {
      const q = search.toLowerCase();
      filteredFeedback = filteredFeedback.filter(f => 
        (f.comment && f.comment.toLowerCase().includes(q)) ||
        (f.admin_note && f.admin_note.toLowerCase().includes(q))
      );
    }

    // Sort by timestamp (newest first)
    filteredFeedback.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(filteredFeedback);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get single feedback by ID
app.get('/api/admin/feedback/:id', (req, res) => {
  try {
    if (!req.session.isAdmin) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const feedback = readFeedback();
    const item = feedback.find(f => f.feedback_id === id);
    if (!item) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    res.json(item);
  } catch (error) {
    console.error('Error fetching feedback by id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Update feedback status, note, or category
app.put('/api/admin/feedback/:id', (req, res) => {
  try {
    if (!req.session.isAdmin) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const { status, admin_note, category } = req.body;

    const feedback = readFeedback();
    const idx = feedback.findIndex(f => f.feedback_id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    // Validate and update status
    if (status !== undefined) {
      const allowed = ['open', 'in_progress', 'completed'];
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      feedback[idx].status = status;
    }

    // Update admin note
    if (admin_note !== undefined) {
      feedback[idx].admin_note = String(admin_note);
    }

    // Reassign category if provided
    if (category !== undefined) {
      const categories = readCategories();
      const valid = categories.some(c => c.id === category);
      if (!valid) {
        return res.status(400).json({ error: 'Invalid category' });
      }
      feedback[idx].category = category;
    }

    writeFeedback(feedback);
    res.json(feedback[idx]);
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: delete a single feedback by id
app.delete('/api/admin/feedback/:id', (req, res) => {
  try {
    if (!req.session.isAdmin) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const feedback = readFeedback();
    const exists = feedback.some(f => f.feedback_id === id);
    if (!exists) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    const updated = feedback.filter(f => f.feedback_id !== id);
    writeFeedback(updated);
    res.json({ success: true, deleted: 1 });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: bulk delete feedbacks by ids
app.post('/api/admin/feedback/bulk-delete', (req, res) => {
  try {
    if (!req.session.isAdmin) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    const set = new Set(ids);
    const feedback = readFeedback();
    const before = feedback.length;
    const updated = feedback.filter(f => !set.has(f.feedback_id));
    const deleted = before - updated.length;
    writeFeedback(updated);
    res.json({ success: true, deleted });
  } catch (error) {
    console.error('Error bulk deleting feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/analytics', (req, res) => {
  try {
    if (!req.session.isAdmin) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const feedback = readFeedback();
    
    // Basic analytics
    const totalFeedback = feedback.length;
    const averageRating = totalFeedback > 0 
      ? (feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback).toFixed(1)
      : 0;

    // Category distribution (by id)
    const categoryStats = feedback.reduce((acc, f) => {
      acc[f.category] = (acc[f.category] || 0) + 1;
      return acc;
    }, {});

    // Category id->name map for UI convenience
    const categories = readCategories();
    const categoryMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

    // Rating distribution
    const ratingStats = feedback.reduce((acc, f) => {
      acc[f.rating] = (acc[f.rating] || 0) + 1;
      return acc;
    }, {});

    // Status distribution
    const statusStats = feedback.reduce((acc, f) => {
      const st = f.status || 'open';
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    }, {});

    // Most common words (simple implementation)
    const allComments = feedback.map(f => f.comment).join(' ').toLowerCase();
    const words = allComments.match(/\b\w{4,}\b/g) || [];
    const wordCount = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {});
    
    const commonWords = Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    res.json({
      totalFeedback,
      averageRating,
      categoryStats,
      categoryMap,
      ratingStats,
      statusStats,
      commonWords
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/check', (req, res) => {
  res.json({ isAdmin: !!req.session.isAdmin });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});