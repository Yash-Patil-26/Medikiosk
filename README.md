# MediKiosk

A comprehensive healthcare kiosk system for pre-consultation clinical information collection. This is a synthetic academic prototype designed for educational purposes, not a medical device.

## Features

### Core Functionality
- **Patient Registration & Login**: Secure patient account creation with ABHA/mobile/email authentication
- **Adaptive Kiosk Interview**: Voice and touch-based clinical information collection
- **Document Upload & OCR**: Medical document processing and information extraction
- **Consent Management**: Granular consent tracking for voice, documents, HIS sharing, and data storage
- **Doctor Review & Signing**: Clinical encounter review and digital signing
- **FHIR Integration**: Healthcare data interoperability with FHIR format
- **Multi-language Support**: English, Hindi, and Marathi with full i18n
- **Dark Mode**: Universal theme support across all interfaces

### User Roles

**Patients**
- Account registration and login
- Kiosk session for clinical information collection
- Document upload and review
- View encounter history and summaries

**Doctors**
- Doctor queue management
- Encounter review and editing
- Clinical summary generation
- Digital signing and FHIR export

**Admins**
- System dashboard with real-time metrics
- User management (patients, doctors, admins)
- Session and encounter monitoring
- System health monitoring
- Reports and analytics
- Doctor management

### Technical Stack

**Frontend**
- React 18 with Vite
- TailwindCSS for styling
- React Router for navigation
- i18next for internationalization
- Lucide React for icons
- Web Speech API for voice features

**Backend**
- Node.js with Express
- MySQL database with mysql2
- JWT authentication with httpOnly cookies
- bcrypt for password hashing
- Express-rate-limit for security

**Features**
- Real-time session management
- Adaptive dialogue graph
- Browser-based speech recognition and synthesis
- Mock LLM/OCR/ASR/TTS providers
- Audit logging and purge proof
- HIS integration mock

## Getting Started

### Prerequisites
- Node.js 18+ 
- MySQL 8.0+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Yash-Patil-26/Medikiosk.git
cd Medikiosk
```

2. **Install dependencies**
```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

3. **Configure environment**
```bash
# Backend
cd server
cp .env.example .env
# Edit .env with your database credentials and configuration
```

4. **Set up database**
```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE medikiosk;
EXIT;

# Run migrations (if applicable)
cd server
npm run migrate
```

5. **Start servers**
```bash
# Backend (terminal 1)
cd server
npm run dev

# Frontend (terminal 2)
cd client
npm run dev
```

6. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

### Default Credentials

**Admin**
- Username: `admin`
- Password: `Admin@123`

**Demo Patient** (if seeded)
- Login through patient registration

**Demo Doctor** (if seeded)
- Register through doctor registration

## Project Structure

```
Medikiosk/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # React context providers
│   │   ├── hooks/          # Custom React hooks
│   │   ├── i18n/           # Translation files
│   │   ├── pages/          # Page components
│   │   │   ├── admin/      # Admin pages
│   │   │   ├── doctor/     # Doctor pages
│   │   │   ├── kiosk/      # Kiosk flow pages
│   │   │   └── *.jsx       # Other pages
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   ├── utils/          # Utility functions
│   │   └── server.js       # Main server file
│   └── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

### Patients
- `GET /api/patients/me` - Get patient profile
- `GET /api/patients/my-encounters` - Get patient encounters
- `PATCH /api/patients/me` - Update patient profile

### Sessions
- `POST /api/sessions` - Create new session
- `GET /api/sessions/:id` - Get session details
- `PATCH /api/sessions/:id` - Update session
- `POST /api/sessions/:id/purge` - Purge session data

### Dialogue
- `POST /api/dialogue/:sessionId/answer` - Submit answer
- `GET /api/dialogue/:sessionId/next` - Get next question

### Documents
- `POST /api/documents/upload` - Upload document
- `GET /api/documents/:sessionId` - Get document extractions

### Encounters
- `GET /api/encounters` - List encounters
- `GET /api/encounters/:id` - Get encounter details
- `PATCH /api/encounters/:id` - Update encounter
- `POST /api/encounters/:id/sign` - Sign encounter

### Admin
- `GET /api/admin/dashboard-stats` - Dashboard statistics
- `GET /api/admin/users` - List users
- `GET /api/admin/sessions` - List sessions
- `GET /api/admin/encounters` - List encounters
- `GET /api/admin/doctors` - List doctors
- `GET /api/admin/analytics` - Analytics data
- `GET /api/admin/system-health` - System health

## Configuration

### Environment Variables (Backend)

```env
# Server
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=medikiosk
DB_USER=root
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_secure_secret_key_minimum_32_characters

# Providers (mock/real)
LLM_PROVIDER=mock
OCR_PROVIDER=mock
ASR_PROVIDER=browser
TTS_PROVIDER=browser
PROVIDER_MODE=mock

# HIS Integration
HIS_KEY=demo_key
```

### Frontend Configuration

The frontend uses Vite and automatically proxies API requests to the backend at `http://localhost:5000`.

## Kiosk Flow

1. **Identify** - Patient identification (ABHA, mobile, or new patient)
2. **Consent** - Granular consent collection
3. **Complaint** - Chief complaint selection
4. **Interview** - Adaptive clinical interview
5. **Documents** - Medical document upload
6. **Review** - Review and confirm information
7. **Done** - Session completion

## Admin Features

### Dashboard
- Real-time system metrics
- Patient, doctor, session, encounter counts
- Recent activity feed
- System health status

### User Management
- View all users (patients, doctors, admins)
- Search and filter by role/status
- User details and activity

### Session Management
- Monitor all kiosk sessions
- Session status tracking
- Force purge capability

### Encounter Management
- Monitor clinical encounters
- Status tracking (draft, final, signed)
- Red flag indicators

### Doctor Management
- Manage doctor accounts
- Activity metrics
- Encounter and session counts

### System Monitoring
- Database health checks
- API performance metrics
- Memory and disk usage
- Real-time monitoring

### Reports & Analytics
- Usage statistics
- Language distribution
- Encounter completion rates
- Red flag analysis
- Peak usage hours

## Security

- JWT-based authentication with httpOnly cookies
- bcrypt password hashing (12 rounds)
- Rate limiting on API endpoints
- CORS configuration
- Helmet security headers
- Input validation and sanitization
- Audit logging for all actions
- Session-based kiosk authentication
- Data encryption for sensitive fields

## Privacy & Compliance

- Granular consent management
- Data retention policies
- Session purge proof
- Audit trail for all actions
- No PHI storage (synthetic data only)
- GDPR-compliant data handling

## Browser Compatibility

- **Recommended**: Chrome, Edge (full Web Speech API support)
- **Partial**: Firefox (limited speech recognition)
- **Limited**: Safari (limited speech recognition)

Audio features (voice input/output) require browser speech API support.

## Development

### Running Tests
```bash
# Backend tests
cd server
npm test

# Frontend tests
cd client
npm test
```

### Building for Production
```bash
# Backend
cd server
npm run build

# Frontend
cd client
npm run build
```

### Linting
```bash
# Backend
cd server
npm run lint

# Frontend
cd client
npm run lint
```

## Deployment

### Backend Deployment
- Set environment variables
- Configure database connection
- Run migrations
- Start with `npm start`

### Frontend Deployment
- Build with `npm run build`
- Deploy `dist/` folder to static hosting
- Configure environment variables if needed

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is for educational purposes only. Not for medical use.

## Disclaimer

MediKiosk is a synthetic academic prototype for educational purposes. It is not a medical device and should not be used for actual patient care. All data is synthetic and no real patient information should be entered.

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review the code comments

## Acknowledgments

- Built with React, Node.js, Express, and MySQL
- Uses Web Speech API for voice features
- Implements FHIR standards for healthcare interoperability
- Designed for educational and research purposes
