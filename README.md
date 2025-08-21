# Anonymous Feedback Portal
 
A beautiful, mobile-friendly anonymous feedback web application built with React, Express.js, and JSON file storage.

## Features
 
### 🔒 Anonymous Feedback Collection
- No personal information required
- Hash-based session tracking (no IP storage)
- Categories: Trainer Quality, Course Content, Placement Tips, Others
- 5-star rating system
- Text feedback with validation (minimum 5 characters)

### 📊 Admin Dashboard
- Secure login with hardcoded credentials
- View all feedback with filtering options
- Search functionality
- Analytics dashboard with:
  - Total feedback count
  - Average ratings
  - Category breakdown
  - Rating distribution
  - Most common words analysis
- CSV export functionality

### 🎨 Modern Design
- Responsive mobile-first design
- Tailwind CSS styling
- Smooth animations and transitions
- Professional gradients and color scheme
- Loading states and success messages

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Express.js, Node.js
- **Storage**: JSON file-based database
- **Authentication**: Express sessions with bcrypt
- **Icons**: Lucide React

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the application**:
   ```bash
   npm start
   ```
   This will start both the Express server (port 3001) and React dev server (port 5173).

3. **Access the application**:
   - Main app: http://localhost:5173
   - Admin login: http://localhost:5173/admin/login

## Admin Credentials

- **Username**: admin
- **Password**: admin123

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── HomePage.tsx          # Main feedback form
│   │   ├── AdminLogin.tsx        # Admin authentication
│   │   └── AdminDashboard.tsx    # Admin panel with analytics
│   └── App.tsx                   # Main app with routing
├── server/
│   ├── index.js                  # Express server
│   ├── package.json              # Server dependencies
│   └── data/                     # JSON storage directory
├── .env                          # Environment variables
└── README.md
```

## Environment Variables

The `.env` file includes:

```env
MONGODB_URI=mongodb://localhost:27017/feedback  # Not used (JSON storage)
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
PORT=3001
```

## API Endpoints

### Public
- `POST /api/feedback` - Submit anonymous feedback

### Admin (requires authentication)
- `POST /api/admin/login` - Admin login
- `POST /api/admin/logout` - Admin logout
- `GET /api/admin/check` - Check authentication status
- `GET /api/admin/feedback` - Get filtered feedback
- `GET /api/admin/analytics` - Get analytics data

## Database Schema

Feedback entries are stored as JSON with these fields:

```json
{
  "feedback_id": "unique-identifier",
  "category": "Trainer Quality | Course Content | Placement Tips | Others",
  "rating": 1-5,
  "comment": "User feedback text",
  "timestamp": "ISO 8601 date",
  "session_hash": "anonymized session identifier"
}
```

## Security Features

- No personal data collection
- Hashed session identifiers (no IP tracking)
- Input validation and sanitization
- Secure admin authentication with bcrypt
- Session-based admin authentication
- CORS protection

## Production Deployment

1. Change the session secret in `.env`
2. Update admin credentials
3. Configure CORS for your domain
4. Use HTTPS in production
5. Consider using a proper database (PostgreSQL, MongoDB)

## Development

### Run in development mode:
```bash
# Start both server and client
npm start

# Or run separately:
npm run server  # Backend only
npm run dev     # Frontend only
```

### Build for production:
```bash
npm run build
```

## License

MIT License - feel free to use this for your projects!
