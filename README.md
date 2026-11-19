<div align="center">

# MediKiosk

### Healthcare Intake System

Transforming patient registration with voice and touch interactions

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

</div>

---

## 🎯 What is MediKiosk?

MediKiosk reimagines the patient intake process. Instead of traditional paper forms or lengthy nurse interviews, patients interact with a kiosk that:

- 🗣️ **Listens** to their health concerns in their native language
- 🗣️ **Asks** follow-up questions based on responses
- 📄 **Processes** medical documents automatically
- 📋 **Generates** comprehensive summaries for doctors
- 🔒 **Ensures** complete privacy and consent management

<div align="center">

![MediKiosk Hero](https://via.placeholder.com/1200x600/4F46E5/FFFFFF?text=MediKiosk+Healthcare+Intake)

</div>

## ✨ Why MediKiosk?

### The Challenge
Healthcare facilities face critical bottlenecks in patient intake:
- ⏱️ **Long wait times** - 15-30 minutes per patient registration
- 📝 **Incomplete data** - Patients forget symptoms or medical history
- 🌍 **Language barriers** - Limited multilingual support
- ❌ **Manual errors** - Data entry mistakes and transcription issues
- 🔐 **Privacy concerns** - Sensitive information on paper forms

### Our Solution
MediKiosk eliminates these barriers through automation:

| Feature | Benefit |
|---------|---------|
| **Voice-First** | Natural conversation reduces patient anxiety |
| **Adaptive Questions** | Questions adjust to individual patient needs |
| **Document Processing** | Automatic extraction from medical reports |
| **Multi-Language** | Full support for English, Hindi, Marathi |
| **Privacy-First** | Granular consent and automatic data purging |

## 🚀 How It Works

### Patient Journey

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Identify│───▶│ Consent │───▶│Interview│───▶│Documents│───▶│ Review  │───▶│  Done   │
│         │    │         │    │         │    │         │    │         │    │         │
│ ABHA ID │    │ Voice   │    │ Voice   │    │ Upload  │    │ Confirm │    │ Submit  │
│ Mobile  │    │ Docs    │    │ Touch   │    │ OCR     │    │ Edit    │    │ Doctor  │
│ New     │    │ HIS     │    │ Adaptive│    │ Extract │    │ Verify  │    │ Queue   │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
```

### Doctor Workflow

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Queue  │───▶│ Review  │───▶│  Sign   │───▶│  Export │
│         │    │         │    │         │    │         │
│ Token   │    │ Summary │    │ Digital │    │  FHIR   │
│ Number  │    │ Notes   │    │ Signature│   │  Bundle │
│ Priority│    │ Edit    │    │ Finalize│    │   HIS   │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
```

## 🎨 See It in Action

### Landing Page
<div align="center">
<img src="https://via.placeholder.com/800x500/4F46E5/FFFFFF?text=Landing+Page" alt="Landing Page" width="800">
</div>

### Patient Dashboard
<div align="center">
<img src="https://via.placeholder.com/800x500/10B981/FFFFFF?text=Patient+Dashboard" alt="Patient Dashboard" width="800">
</div>

### Kiosk Interview Interface
<div align="center">
<img src="https://via.placeholder.com/800x500/8B5CF6/FFFFFF?text=Kiosk+Interview" alt="Kiosk Interview" width="800">
</div>

### Doctor Encounter Review
<div align="center">
<img src="https://via.placeholder.com/800x500/F59E0B/FFFFFF?text=Doctor+Encounter+Review" alt="Doctor Encounter" width="800">
</div>

### Admin Dashboard
<div align="center">
<img src="https://via.placeholder.com/800x500/06B6D4/FFFFFF?text=Admin+Dashboard" alt="Admin Dashboard" width="800">
</div>

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Patient   │  │   Doctor    │  │       Admin         │  │
│  │   Portal    │  │   Portal    │  │     Dashboard       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                         │                                    │
│                    REST API                                  │
└─────────────────────────┼────────────────────────────────────┘
                          │
┌─────────────────────────┼────────────────────────────────────┐
│                    Backend (Node.js)                          │
│  ┌──────────────────────┼──────────────────────┐             │
│  │    Auth Service      │   Session Manager    │             │
│  └──────────────────────┼──────────────────────┘             │
│  ┌──────────────────────┼──────────────────────┐             │
│  │   Dialogue Engine    │   Document Processor │             │
│  └──────────────────────┼──────────────────────┘             │
│  ┌──────────────────────┼──────────────────────┐             │
│  │   Encounter Service  │    HIS Integration   │             │
│  └──────────────────────┼──────────────────────┘             │
└─────────────────────────┼────────────────────────────────────┘
                          │
┌─────────────────────────┼────────────────────────────────────┐
│                    Database (PostgreSQL)                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐  │
│  │ Users   │  │Patients │  │Sessions │  │   Encounters    │  │
│  └─────────┘  └─────────┘  └─────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library
- **Vite** - Lightning-fast build tool
- **TailwindCSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **i18next** - Internationalization
- **Lucide React** - Beautiful icon library
- **Web Speech API** - Voice recognition & synthesis

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **PostgreSQL** - Relational database
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **Express-rate-limit** - API security

### Healthcare Standards
- **FHIR R4** - Healthcare interoperability
- **HL7** - Health level 7 messaging
- **HIPAA** - Privacy and security compliance

## 📋 User Roles

### 👤 Patient Portal
- **Registration**: ABHA, mobile, or email authentication
- **Kiosk Sessions**: Voice-guided clinical interviews
- **Document Upload**: Medical report processing
- **History**: View past encounters and summaries
- **Preferences**: Language and consent management

### 👨‍⚕️ Doctor Portal
- **Queue Management**: View waiting patients with tokens
- **Encounter Review**: Examine patient summaries
- **Clinical Notes**: Add doctor observations
- **Digital Signing**: Finalize and sign encounters
- **FHIR Export**: Generate healthcare data bundles

### 👨‍💼 Admin Dashboard
- **System Monitoring**: Real-time health metrics
- **User Management**: Manage all accounts
- **Session Tracking**: Monitor kiosk activity
- **Analytics**: Usage statistics and reports
- **Doctor Management**: Manage medical staff

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 16+
- npm or yarn

### Installation

```bash
# Clone repository
git clone https://github.com/Yash-Patil-26/Medikiosk.git
cd Medikiosk

# Install dependencies
cd server && npm install
cd ../client && npm install

# Configure environment
cd ../server && cp .env.example .env
# Edit .env with your database credentials
```

### Database Setup

```bash
# Create database
psql -U postgres
CREATE DATABASE medikiosk;
\q

# Apply schema
psql -U postgres -d medikiosk -f database/schema.sql
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

### Access Points
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Admin**: http://localhost:5173/admin

### Default Credentials
```
Admin: admin / Admin@123
```

## 📚 Documentation

### API Reference
Complete API documentation is available at `/api/docs` when the server is running.

### Key Endpoints
- **Auth**: `/api/auth/*` - Authentication and user management
- **Patients**: `/api/patients/*` - Patient profile and encounters
- **Sessions**: `/api/sessions/*` - Kiosk session management
- **Dialogue**: `/api/dialogue/*` - Interview conversation flow
- **Documents**: `/api/documents/*` - Document upload and processing
- **Encounters**: `/api/encounters/*` - Clinical encounter management
- **Admin**: `/api/admin/*` - Administrative functions
- **Staff**: `/api/staff/*` - Staff alerts and monitoring

### Environment Configuration
```env
# Server
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=medikiosk
DB_USER=postgres
DB_PASSWORD=your_password

# Security
JWT_SECRET=your_secure_secret_key_minimum_32_characters

# Providers
LLM_PROVIDER=local
OCR_PROVIDER=local
ASR_PROVIDER=browser
TTS_PROVIDER=browser
```

## 🔒 Security & Privacy

### Security Features
- ✅ JWT-based authentication
- ✅ bcrypt password hashing (12 rounds)
- ✅ Rate limiting on all endpoints
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ Input validation and sanitization
- ✅ Audit logging for all actions
- ✅ Session-based kiosk authentication

### Privacy Compliance
- ✅ Granular consent management
- ✅ Automatic data purging
- ✅ Complete audit trail
- ✅ No PHI storage without consent
- ✅ GDPR-compliant design
- ✅ Encryption for sensitive data

## 🌍 Internationalization

MediKiosk supports multiple languages with full translation:

- 🇺🇸 **English** - Complete interface
- 🇮🇳 **Hindi** - Full translation
- 🇮🇳 **Marathi** - Full translation

Language preferences persist across sessions and are automatically applied to voice interactions.

## 🌓 Dark Mode

Universal dark mode support across all pages:
- Automatic system preference detection
- Manual toggle in header
- Consistent theming throughout
- Accessible color contrasts

## 🧪 Testing

### Running Tests
```bash
# Backend tests
cd server
npm test

# Frontend tests
cd client
npm test
```

### Test Coverage
- Unit tests for utility functions
- Integration tests for API endpoints
- Component tests for UI elements
- E2E tests for critical user flows

## 🚢 Deployment

### Backend Deployment
```bash
# Build for production
npm run build

# Set environment variables
export NODE_ENV=production
export DB_HOST=your_db_host
# ... other env vars

# Start server
npm start
```

### Frontend Deployment
```bash
# Build for production
npm run build

# Deploy dist/ folder to:
# - Vercel
# - Netlify
# - AWS S3 + CloudFront
# - Any static hosting
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Style
- Follow existing code conventions
- Use ESLint and Prettier
- Write meaningful commit messages
- Add JSDoc comments for complex functions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

MediKiosk is a healthcare information system designed for pre-consultation data collection. It is **not a medical device** and should **not be used for diagnosis or treatment decisions**. All clinical decisions should be made by qualified healthcare professionals.

## 🙏 Acknowledgments

- Developed for healthcare innovation
- Uses Web Speech API for voice features
- Implements FHIR standards for interoperability
- Designed for healthcare facilities

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Yash-Patil-26/Medikiosk/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Yash-Patil-26/Medikiosk/discussions)
- **Documentation**: Check the `/docs` folder

---

<div align="center">

**Developed for healthcare innovation**

[⬆ Back to top](#medikiosk)

</div>