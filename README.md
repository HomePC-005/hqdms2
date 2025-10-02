# HQDMS - Hospital Quota Drug Management System

A comprehensive web-based system for managing hospital drug quotas, patient enrollments, and prescription tracking. Built with React frontend and Node.js/Express backend with PostgreSQL database.

## 📋 Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## 🚀 Features

- **Drug Management**: Add, edit, and manage drug information with quota tracking
- **Patient Management**: Register and manage patient information
- **Enrollment System**: Enroll patients in drug programs with prescription tracking
- **Department Management**: Organize drugs by medical departments
- **Refill Tracking**: Monitor patient refill history and identify defaulters
- **Reporting**: Generate comprehensive reports and analytics
- **User Authentication**: Secure login system with role-based access
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 📋 Prerequisites

Before installing HQDMS, ensure you have the following installed on your system:

### Required Software

1. **Node.js** (v14 or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **npm** (comes with Node.js)
   - Verify installation: `npm --version`

3. **PostgreSQL** (v12 or higher)
   - Download from [postgresql.org](https://www.postgresql.org/download/)
   - Or use Docker: `docker run --name postgres -e POSTGRES_PASSWORD=user -p 5432:5432 -d postgres`

4. **Git** (for cloning the repository)
   - Download from [git-scm.com](https://git-scm.com/)

### Optional but Recommended

- **pgAdmin** (PostgreSQL administration tool)
- **VS Code** or your preferred code editor

## 🛠 Installation

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd hqdms2
```

### Step 2: Install Dependencies

Install all dependencies for both server and client:

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..

# Or use the convenience script
npm run install-all
```

### Step 3: Database Setup

#### Option A: Using PostgreSQL directly

1. **Create Database**:
   ```sql
   -- Connect to PostgreSQL as superuser
   psql -U postgres
   
   -- Create database
   CREATE DATABASE hqdms;
   
   -- Create user (optional-no need)
   CREATE USER hqdms_user WITH PASSWORD 'password';
   GRANT ALL PRIVILEGES ON DATABASE hqdms TO hqdms_user;
   ```

2. **Run Schema** (optional): // Prefer to Restore Database 
   ```bash
   # Connect to your database and run the schema
   psql -U postgres -d hqdms -f server/sql/schema.sql
   ```
   
   ** to restore database: **
   -- Create database
   CREATE DATABASE hqdms;
   
   then use pgAdmin tool to restore from backup.sql
   psql -U postgres -h localhost -d hqdms < backup.sql
   
   
   

#### Option B: Using Docker

1. **Start PostgreSQL Container**:
   ```bash
   docker run --name hqdms-postgres \
     -e POSTGRES_DB=hqdms \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=user \
     -p 5432:5432 \
     -d postgres:13
   ```

2. **Run Schema**:
   ```bash
   # Copy schema to container and execute
   docker cp server/sql/schema.sql hqdms-postgres:/schema.sql
   docker exec -it hqdms-postgres psql -U postgres -d hqdms -f /schema.sql
   ```

### Step 4: Environment Configuration

Create a `.env` file in the root directory:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hqdms
DB_USER=postgres
DB_PASSWORD=user

# Server Configuration
PORT=3003
NODE_ENV=development

# JWT Secret (generate a strong secret)
JWT_SECRET=your_super_secret_jwt_key_here

# Email Configuration (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

## 🚀 Running the Application

### Development Mode

1. **Start the Backend Server**:
   ```bash
   npm run server
   ```
   The server will start on `http://localhost:3003`

2. **Start the Frontend** (in a new terminal):
   ```bash
   npm run client
   ```
   The client will start on `http://localhost:3000`

3. **Or run both simultaneously**:
   ```bash
   npm run dev
   ```

### Production Mode

1. **Build the Frontend**:
   ```bash
   npm run build
   ```

2. **Start the Production Server**:
   ```bash
   NODE_ENV=production npm run server
   ```

### Network Access

To access the application from other devices on your network:

1. **Get your IP address**:
   ```bash
   npm run network
   ```

2. **Access from other devices**:
   - Frontend: `http://[YOUR_IP]:3000`
   - Backend API: `http://[YOUR_IP]:3003/api`

## 🚀 Deployment

### Option 1: Traditional VPS/Server Deployment

1. **Prepare Server**:
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PostgreSQL
   sudo apt install postgresql postgresql-contrib
   ```

2. **Deploy Application**:
   ```bash
   # Clone repository
   git clone <repository-url>
   cd hqdms2
   
   # Install dependencies
   npm run install-all
   
   # Build frontend
   npm run build
   
   # Set up environment
   cp .env.example .env
   # Edit .env with production values
   ```

3. **Set up Process Manager** (PM2):
   ```bash
   # Install PM2
   npm install -g pm2
   
   # Create ecosystem file
   cat > ecosystem.config.js << EOF
   module.exports = {
     apps: [{
       name: 'hqdms',
       script: 'server/index.js',
       instances: 1,
       autorestart: true,
       watch: false,
       max_memory_restart: '1G',
       env: {
         NODE_ENV: 'production',
         PORT: 3003
       }
     }]
   };
   EOF
   
   # Start application
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

4. **Set up Nginx** (optional):
   ```bash
   # Install Nginx
   sudo apt install nginx
   
   # Create configuration
   sudo nano /etc/nginx/sites-available/hqdms
   ```

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3003;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   ```bash
   # Enable site
   sudo ln -s /etc/nginx/sites-available/hqdms /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### Option 2: Docker Deployment

1. **Create Dockerfile**:
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   # Copy package files
   COPY package*.json ./
   COPY client/package*.json ./client/
   
   # Install dependencies
   RUN npm run install-all
   
   # Copy source code
   COPY . .
   
   # Build frontend
   RUN npm run build
   
   # Expose port
   EXPOSE 3003
   
   # Start application
   CMD ["npm", "run", "server"]
   ```

2. **Create docker-compose.yml**:
   ```yaml
   version: '3.8'
   
   services:
     postgres:
       image: postgres:13
       environment:
         POSTGRES_DB: hqdms
         POSTGRES_USER: postgres
         POSTGRES_PASSWORD: user
       volumes:
         - postgres_data:/var/lib/postgresql/data
         - ./server/sql/schema.sql:/docker-entrypoint-initdb.d/schema.sql
       ports:
         - "5432:5432"
   
     app:
       build: .
       ports:
         - "3003:3003"
       environment:
         DB_HOST: postgres
         DB_PORT: 5432
         DB_NAME: hqdms
         DB_USER: postgres
         DB_PASSWORD: user
         NODE_ENV: production
       depends_on:
         - postgres
   
   volumes:
     postgres_data:
   ```

3. **Deploy with Docker**:
   ```bash
   docker-compose up -d
   ```

### Option 3: Cloud Deployment (Heroku)

1. **Prepare for Heroku**:
   ```bash
   # Install Heroku CLI
   # Create Procfile
   echo "web: npm run server" > Procfile
   
   # Add buildpacks
   heroku buildpacks:add heroku/nodejs
   ```

2. **Deploy**:
   ```bash
   # Login to Heroku
   heroku login
   
   # Create app
   heroku create your-hqdms-app
   
   # Add PostgreSQL addon
   heroku addons:create heroku-postgresql:hobby-dev
   
   # Set environment variables
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your_secret_key
   
   # Deploy
   git push heroku main
   ```

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile

### Drug Management

- `GET /api/drugs` - Get all drugs
- `POST /api/drugs` - Create new drug
- `PUT /api/drugs/:id` - Update drug
- `DELETE /api/drugs/:id` - Delete drug

### Patient Management

- `GET /api/patients` - Get all patients
- `POST /api/patients` - Create new patient
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient

### Enrollment Management

- `GET /api/enrollments` - Get all enrollments
- `POST /api/enrollments` - Create new enrollment
- `PUT /api/enrollments/:id` - Update enrollment
- `DELETE /api/enrollments/:id` - Delete enrollment

### Reports

- `GET /api/reports/summary` - Get summary statistics
- `GET /api/reports/export` - Export data to Excel

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Error**:
   - Verify PostgreSQL is running
   - Check database credentials in `.env`
   - Ensure database exists

2. **Port Already in Use**:
   - Change PORT in `.env` file
   - Kill existing processes: `lsof -ti:3003 | xargs kill -9`

3. **Module Not Found**:
   - Run `npm install` in both root and client directories
   - Clear npm cache: `npm cache clean --force`

4. **Build Errors**:
   - Check Node.js version compatibility
   - Clear build cache: `rm -rf client/build`

5. **Network Access Issues**:
   - Check firewall settings
   - Ensure ports 3000 and 3003 are open
   - Verify devices are on same network

### Logs and Debugging

```bash
# View application logs
pm2 logs hqdms

# View database logs
sudo tail -f /var/log/postgresql/postgresql-*.log

# Check server status
pm2 status
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the troubleshooting section

---

# Remove Build Folder
cd hqdms2/server
rm -rf build
# Remove Apache base folder
sudo rm -rf /var/www/html/*
# Rebuild
npm run build
# Copy to Apache base folder
cp -r build/* /var/www/html/


=+= Common Startup Script

# Start Apache manually
sudo systemctl start apache2

# Start pm2 backend server manually
cd hqdms2/server
pm2 start index.js --name "hqdms-backend"



**HQDMS v1.0.0** - Hospital Quota Drug Management System
