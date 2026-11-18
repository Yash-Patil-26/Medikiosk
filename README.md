# MediKiosk

## Transforming Healthcare Intake with AI-Powered Kiosks

**MediKiosk** is an innovative pre-consultation system that streamlines patient information collection through intelligent voice and touch interactions. Designed for healthcare facilities, it reduces patient wait times and improves data accuracy for doctors.

![MediKiosk Landing Page](https://via.placeholder.com/800x400/4F46E5/FFFFFF?text=MediKiosk+Landing+Page)

## What is MediKiosk?

MediKiosk is a **synthetic academic prototype** that demonstrates how AI can enhance the patient intake process. Instead of filling out paper forms or waiting for nurses, patients interact with a friendly kiosk that:

- **Listens** to their complaints in their preferred language (English, Hindi, or Marathi)
- **Asks** intelligent follow-up questions based on their responses
- **Processes** uploaded medical documents automatically
- **Generates** a comprehensive summary for doctor review
- **Ensures** complete privacy and consent management

## Why MediKiosk?

### The Problem
- Long waiting times for patient registration
- Incomplete or inaccurate medical histories
- Language barriers in multilingual environments
- Manual data entry errors
- Privacy concerns with paper forms

### The Solution
MediKiosk addresses these challenges through:

✨ **Voice-First Interaction** - Natural conversation in patient's language  
✨ **Adaptive Intelligence** - Questions adjust based on patient responses  
✨ **Document Processing** - Automatic extraction from medical documents  
✨ **Privacy-First** - Granular consent and automatic data purging  
✨ **Multi-Language** - Full support for English, Hindi, and Marathi  
✨ **Doctor Integration** - Seamless workflow from kiosk to consultation

## How It Works

### Patient Journey

![Kiosk Flow](https://via.placeholder.com/1000x200/10B981/FFFFFF?text=Identify+→+Consent+→+Interview+→+Documents+→+Review+→+Done)

1. **Identify** - Patient scans ABHA ID or enters mobile number
2. **Consent** - Patient reviews and grants specific permissions
3. **Interview** - Voice-guided conversation about symptoms and history
4. **Documents** - Upload medical documents for automatic processing
5. **Review** - Patient verifies all information before submission
6. **Done** - Information sent to doctor for review

### Doctor Workflow

![Doctor Workflow](https://via.placeholder.com/800x300/8B5CF6/FFFFFF?text=Queue+→+Review+→+Sign+→+FHIR+Export)

1. **Queue** - View waiting patients with token numbers
2. **Review** - Examine patient summary and clinical notes
3. **Sign** - Digital signature and finalization
4. **Export** - Generate FHIR bundle for hospital systems

## Key Features

### 🎤 Voice Recognition & Synthesis
- Natural voice interaction in multiple languages
- Real-time speech-to-text and text-to-speech
- Fallback to touch interface when needed

### 📋 Adaptive Interview System
- Intelligent question flow based on patient responses
- Red flag detection for urgent conditions
- Ayush mode for traditional medicine consultations

### 📄 Document Intelligence
- Upload medical reports, prescriptions, lab results
- Automatic text extraction and categorization
- Integration with interview findings

### 🔒 Privacy & Consent
- Granular consent for each data type
- Automatic session purging after completion
- Complete audit trail for compliance
- No PHI storage (synthetic data only)

### 🌍 Multi-Language Support
- Full English, Hindi, and Marathi interfaces
- Language preference persists across sessions
- Voice recognition in native languages

### 🌓 Dark Mode
- Universal dark mode across all pages
- System preference detection
- Consistent theming throughout

### 📊 Admin Dashboard
- Real-time system metrics
- User and session management
- Comprehensive analytics
- System health monitoring

## User Roles

### 👤 Patients
- Register and login with ABHA, mobile, or email
- Complete kiosk interview sessions
- Upload medical documents
- View encounter history
- Manage consent preferences

### 👨‍⚕️ Doctors
- Access patient queue with token numbers
- Review patient summaries and clinical notes
- Edit and finalize encounter documents
- Generate FHIR bundles for HIS integration
- Track patient encounters

### 👨‍💼 Admins
- Monitor system health and performance
- Manage all user accounts
- View comprehensive analytics
- Track sessions and encounters
- Generate reports and exports

## Technology Stack

### Frontend
- **React 18** - Modern UI framework
- **Vite** - Fast build tool and dev server
- **TailwindCSS** - Utility-first styling
- **React Router** - Client-side routing
- **i18next** - Internationalization
- **Lucide React** - Beautiful icons
- **Web Speech API** - Voice recognition and synthesis

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **MySQL** - Relational database
- **JWT** - Secure authentication
- **bcrypt** - Password hashing
- **Express-rate-limit** - API security

### Architecture
- **RESTful API** - Clean API design
- **Session-based** - Secure kiosk authentication
- **Adaptive Dialogue** - Intelligent conversation flow
- **Mock Providers** - LLM, OCR, ASR, TTS integration ready

## Getting Started

### Prerequisites
- Node.js 18 or higher
- MySQL 8.0 or higher
- npm or yarn package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/Yash-Patil-26/Medikiosk.git
cd Medikiosk

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### Configuration

```bash
# Backend environment setup
cd server
cp .env.example .env

# Edit .env file with your settings:
# - Database credentials
# - JWT secret
# - Provider modes (mock/real)
```

### Database Setup

```bash
# Create database
mysql -u root -p
CREATE DATABASE medikiosk;
EXIT;

# The application will automatically create tables on first run
```

### Running the Application

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Admin Dashboard**: http://localhost:5173/admin

### Default Admin Credentials
- **Username**: `admin`
- **Password**: `Admin@123`

## Screenshots

### Landing Page
![Landing](https://via.placeholder.com/800x500/4F46E5/FFFFFF?text=Landing+Page)

### Patient Dashboard
![Patient Dashboard](https://via.placeholder.com/800x500/10B981/FFFFFF?text=Patient+Dashboard)

### Kiosk Interview
![Kiosk Interview](https://via.placeholder.com/800x500/8B5CF6/FFFFFF?text=Kiosk+Interview)

### Doctor Queue
![Doctor Queue](https://via.placeholder.com/800x500/F59E0B/FFFFFF?text=Doctor+Queue)

### Doctor Encounter Review
![Doctor Encounter](https://via.placeholder.com/800x500/EF4444/FFFFFF?text=Doctor+Encounter)

### Admin Dashboard
![Admin Dashboard](https://via.placeholder.com/800x500/06B6D4/FFFFFF?text=Admin+Dashboard)

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

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Password reset

### Patient Management
- `GET /api/patients/me` - Get patient profile
- `PATCH /api/patients/me` - Update patient profile
- `GET /api/patients/my-encounters` - Get patient encounters

### Session Management
- `POST /api/sessions` - Create new session
- `GET /api/sessions/:id` - Get session details
- `PATCH /api/sessions/:id` - Update session
- `POST /api/sessions/:id/purge` - Purge session data

### Dialogue System
- `POST /api/dialogue/:sessionId/answer` - Submit answer
- `GET /api/dialogue/:sessionId/next` - Get next question

### Document Processing
- `POST /api/documents/upload` - Upload document
- `GET /api/documents/:sessionId` - Get document extractions

### Encounter Management
- `GET /api/encounters` - List encounters
- `GET /api/encounters/:id` - Get encounter details
- `PATCH /api/encounters/:id` - Update encounter
- `POST /api/encounters/:id/sign` - Sign encounter

### Admin Functions
- `GET /api/admin/dashboard-stats` - Dashboard statistics
- `GET /api/admin/users` - List users
- `GET /api/admin/sessions` - List sessions
- `GET /api/admin/encounters` - List encounters
- `GET /api/admin/doctors` - List doctors
- `GET /api/admin/analytics` - Analytics data
- `GET /api/admin/system-health` - System health

## Configuration

### Environment Variables

```env
# Server Configuration
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=medikiosk
DB_USER=root
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_secure_secret_key_minimum_32_characters

# Provider Modes (mock/real)
LLM_PROVIDER=mock
OCR_PROVIDER=mock
ASR_PROVIDER=browser
TTS_PROVIDER=browser
PROVIDER_MODE=mock

# HIS Integration
HIS_KEY=demo_key
```

## Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt with 12 rounds
- **Rate Limiting** - API endpoint protection
- **CORS Configuration** - Cross-origin security
- **Helmet Headers** - Security headers
- **Input Validation** - Data sanitization
- **Audit Logging** - Complete activity tracking
- **Session Purging** - Automatic data deletion
- **Consent Management** - Granular permission control

## Privacy & Compliance

- **Granular Consent** - Separate permissions for voice, documents, HIS, dashboard
- **Data Retention** - Automatic session purging
- **Audit Trail** - Complete action logging
- **No PHI Storage** - Synthetic data only
- **GDPR Compliant** - Privacy-first design
- **Encryption** - Sensitive data protection

## Browser Compatibility

### Recommended Browsers
- **Chrome** (latest) - Full feature support
- **Edge** (latest) - Full feature support
- **Firefox** (latest) - Partial speech recognition
- **Safari** (latest) - Limited speech recognition

### Audio Features
Voice recognition and synthesis require browser support:
- Chrome/Edge: Full support
- Firefox: Limited support
- Safari: Limited support

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

### Code Quality
```bash
# Linting
npm run lint

# Type checking (if applicable)
npm run type-check
```

## Deployment

### Backend Deployment
1. Set environment variables
2. Configure database connection
3. Run database migrations
4. Start with `npm start`

### Frontend Deployment
1. Build with `npm run build`
2. Deploy `dist/` folder to static hosting
3. Configure environment variables if needed

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is for educational purposes only. Not for medical use.

## Disclaimer

**MediKiosk is a synthetic academic prototype for educational purposes.** It is not a medical device and should not be used for actual patient care. All data is synthetic and no real patient information should be entered.

## Support

For issues and questions:
- Open an issue on [GitHub](https://github.com/Yash-Patil-26/Medikiosk/issues)
- Check existing documentation
- Review the code comments

## Acknowledgments

- Built with React, Node.js, Express, and MySQL
- Uses Web Speech API for voice features
- Implements FHIR standards for healthcare interoperability
- Designed for educational and research purposes

---

**Made with ❤️ for healthcare innovation**
