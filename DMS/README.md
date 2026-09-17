# Disaster Management System (DMS)

A modern, full-featured disaster management system built with **Java Spring Boot**, **React**, and **PostgreSQL**. Designed for enterprise-grade disaster response and resource management.

## 🎯 Features

- **User Management**: Role-based access control (Admin, Official, Responder, Citizen)
- **Incident Reporting & Tracking**: Create, update, and manage disaster incidents
- **Resource Management**: Track and manage emergency resources
- **Map View**: Visualize incidents and resources on an interactive map
- **Notifications**: Real-time alerts and notifications
- **Reports & Analytics**: Generate comprehensive reports
- **Multi-language Support**: English, Spanish, French, German, Arabic
- **Dark/Light Theme**: Customizable UI themes
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Security**: Spring Security with JWT authentication

## 🛠 Tech Stack

### Backend
- **Framework**: Java 17 + Spring Boot 3.3.2
- **Security**: Spring Security 6 + JWT
- **Database**: PostgreSQL
- **ORM**: Spring Data JPA + Hibernate
- **API Documentation**: SpringDoc OpenAPI (Swagger)
- **Testing**: JUnit 5 + Mockito

### Frontend
- **Framework**: React 18+
- **Styling**: Tailwind CSS + Bootstrap 5
- **State Management**: Zustand
- **HTTP**: Axios
- **Routing**: React Router v6
- **Maps**: React Leaflet
- **Charts**: Recharts
- **Build Tool**: Vite

## 📋 Prerequisites

- **Java 17+**
- **Node.js 16+** (for frontend)
- **PostgreSQL 12+**
- **Maven 3.8+**
- **npm 8+**

## 🚀 Quick Start

### 1. Backend Setup

#### Clone/Navigate to Backend
```bash
cd DMS
```

#### Configure Database
Update `src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/dms
spring.datasource.username=postgres
spring.datasource.password=your_password
spring.jpa.hibernate.ddl-auto=update
```

#### Build and Run
```bash
# Build
mvn clean install

# Run
mvn spring-boot:run
```

The backend will be available at `http://localhost:8080`

### 2. Frontend Setup

#### Install Dependencies
```bash
cd ../frontend
npm install
```

#### Configure Environment
Create `.env` file:
```
REACT_APP_API_URL=http://localhost:8080/api
REACT_APP_ENV=development
```

#### Start Development Server
```bash
npm run dev
```

Frontend will be available at `http://localhost:3000`

## 🔐 Default Credentials

The system comes with pre-configured demo users:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@dms.local | Password123 |
| Official | official@dms.local | Password123 |
| Responder | responder@dms.local | Password123 |
| Citizen | citizen@dms.local | Password123 |

## 📚 API Documentation

View Swagger UI at: `http://localhost:8080/swagger-ui.html`

## 🧪 Testing

### Backend Tests
```bash
cd DMS
mvn test
```

### Frontend Tests
```bash
cd frontend
npm test
npm run test:coverage
```

## 🐳 Docker Deployment

### Build Docker Image
```bash
docker-compose up --build
```

### Access Application
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8080/api`
- Database: PostgreSQL on port 5432

## 📦 Project Structure

```
├── DMS/                          # Backend (Spring Boot)
│   ├── src/
│   │   ├── main/java/com/example/dms/
│   │   │   ├── config/          # Configuration
│   │   │   ├── controller/      # REST Controllers
│   │   │   ├── service/         # Business Logic
│   │   │   ├── model/           # Entity Models
│   │   │   ├── repository/      # Data Access
│   │   │   └── security/        # Security Config
│   │   └── resources/
│   │       └── application.properties
│   └── pom.xml
│
└── frontend/                     # React App
    ├── src/
    │   ├── pages/               # Page Components
    │   ├── components/          # Reusable Components
    │   ├── services/            # API Services
    │   ├── store.js             # State Management
    │   ├── App.jsx              # Main App
    │   └── main.jsx             # Entry Point
    ├── package.json
    ├── vite.config.js
    └── tailwind.config.js
```

## 🔄 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `POST /api/auth/logout` - Logout

### Incidents
- `GET /api/incidents` - Get all incidents
- `POST /api/incidents` - Create incident
- `GET /api/incidents/{id}` - Get incident
- `PUT /api/incidents/{id}` - Update incident
- `DELETE /api/incidents/{id}` - Delete incident

### Resources
- `GET /api/resources` - Get all resources
- `POST /api/resources` - Create resource
- `PUT /api/resources/{id}` - Update resource
- `DELETE /api/resources/{id}` - Delete resource

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/profile` - Get current user
- `PUT /api/users/profile` - Update profile
- `POST /api/users/avatar` - Upload avatar

### Alerts
- `GET /api/alerts` - Get alerts
- `PATCH /api/alerts/{id}/read` - Mark as read
- `PATCH /api/alerts/read-all` - Mark all as read

## 🎨 Customization

### Theming
Customize colors in `frontend/tailwind.config.js`:
```javascript
colors: {
  'disaster-red': '#DC2626',
  'disaster-orange': '#EA580C',
  'disaster-deep-blue': '#1E3A8A',
  // ... more colors
}
```

### Language Support
Add new languages in `frontend/src/pages/Settings.jsx`:
```javascript
<option value="pt">Português</option>
```

## 📝 Environment Variables

### Backend (`application.properties`)
```properties
server.port=8080
spring.datasource.url=jdbc:postgresql://localhost:5432/dms
spring.datasource.username=postgres
spring.datasource.password=password
spring.jpa.hibernate.ddl-auto=update
logging.level.root=INFO
```

### Frontend (`.env`)
```
REACT_APP_API_URL=http://localhost:8080/api
REACT_APP_ENV=development
```

## 🔒 Security Features

- Spring Security configuration
- JWT token-based authentication
- Password encryption with bcrypt
- CORS protection
- CSRF prevention
- Input validation
- SQL injection protection via parameterized queries

## 🧩 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues, feature requests, or questions:
- Create an issue on GitHub
- Contact the development team
- Check documentation at `/docs`

## 👥 Team

- Backend Development: Spring Boot Team
- Frontend Development: React Team
- UI/UX Design: Design Team
- Testing & QA: QA Team

## 🙏 Acknowledgments

- Spring Boot community
- React community
- Bootstrap & Tailwind CSS teams
- All contributors

---

**Version 1.0.0** | Last Updated: June 2024

