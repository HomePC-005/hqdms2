# Hospital Quota Drug Management System (HQDMS) Setup Guide

Complete setup instructions for WSL2 Ubuntu 24.04

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [System Updates](#system-updates)
3. [Node.js Installation](#nodejs-installation)
4. [PostgreSQL Installation & Configuration](#postgresql-installation--configuration)
5. [Database Setup](#database-setup)
6. [Application Installation](#application-installation)
7. [PM2 Setup for Backend](#pm2-setup-for-backend)
8. [Apache Setup for Frontend](#apache-setup-for-frontend)
9. [Starting the Application](#starting-the-application)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Windows with WSL2 installed
- Ubuntu 24.04 running in WSL2
- Username: `user`, Password: `user`
- Application location: `/home/user/hqdms2`

---

## System Updates

First, update your system packages:

```bash
sudo apt update && sudo apt upgrade -y
```

**What this does:** Updates package lists and upgrades all installed packages to their latest versions.

---

## Node.js Installation

Install Node.js 20.x (LTS version):

```bash
# Install curl if not already installed
sudo apt install -y curl

# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js and npm
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

**What this does:** Installs Node.js 20.x and npm, which are required for running the backend and building the frontend.

---

## PostgreSQL Installation & Configuration

### Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify PostgreSQL is running
sudo systemctl status postgresql
```

**What this does:** Installs PostgreSQL database server and ensures it starts automatically on boot.

### Configure PostgreSQL User

```bash
# Switch to postgres user and access PostgreSQL
sudo -u postgres psql

# Inside PostgreSQL prompt, run these commands:
```

In the PostgreSQL prompt (`postgres=#`), execute:

```sql
-- Set password for postgres user
ALTER USER postgres WITH PASSWORD 'user';

-- Exit PostgreSQL
\q
```

**What this does:** Sets the password for the postgres database user to 'user'.

### Configure PostgreSQL Authentication

```bash
# Edit pg_hba.conf to allow password authentication
sudo nano /etc/postgresql/16/main/pg_hba.conf
```

Find these lines (around line 90-95):

```
local   all             postgres                                peer
local   all             all                                     peer
```

Change `peer` to `md5`:

```
local   all             postgres                                md5
local   all             all                                     md5
```

**Press `Ctrl+X`, then `Y`, then `Enter` to save and exit.**

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

**What this does:** Configures PostgreSQL to use password authentication instead of peer authentication.

---

## Database Setup

### Create Database

```bash
# Create the database
PGPASSWORD=user psql -U postgres -c "CREATE DATABASE hqdms;"

# Verify database was created
PGPASSWORD=user psql -U postgres -c "\l" | grep hqdms
```

**What this does:** Creates the `hqdms` database.

### Restore Database from Backup

```bash
# Navigate to project directory
cd /home/user/hqdms2

# Restore the backup
PGPASSWORD=user psql -U postgres -d hqdms -f backup/backup.sql

# Verify tables were created
PGPASSWORD=user psql -U postgres -d hqdms -c "\dt"
```

**What this does:** Restores the pre-populated database from the backup file.

### Reset ID Sequences (Important!)

After restoring a populated database, you need to reset the auto-increment sequences to continue from the current max ID instead of starting from 1:

**Option 1: Automatic Reset for All Tables (Recommended)**

```bash
# Create and run a script to reset all sequences
PGPASSWORD=user psql -U postgres -d hqdms << 'EOF'
DO $
DECLARE
    r RECORD;
    max_id INTEGER;
    seq_name TEXT;
BEGIN
    FOR r IN 
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND column_default LIKE 'nextval%'
    LOOP
        -- Extract sequence name from default value
        seq_name := substring(r.column_default from '''([^'']+)''');
        
        -- Get max ID from table
        EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I', r.column_name, r.table_name) INTO max_id;
        
        -- Reset sequence
        EXECUTE format('SELECT setval(%L, %s)', seq_name, max_id);
        
        RAISE NOTICE 'Reset sequence % for table %.% to %', seq_name, r.table_name, r.column_name, max_id;
    END LOOP;
END $;
EOF
```

**What this does:** Automatically finds all tables with auto-increment IDs and resets their sequences to the current maximum ID value.

**Option 2: Manual Reset for Specific Tables**

If you know your table names, you can reset them individually:

```bash
# Reset sequence for a specific table
# Replace 'table_name' and 'id' with your actual table and column names
PGPASSWORD=user psql -U postgres -d hqdms -c "SELECT setval(pg_get_serial_sequence('table_name', 'id'), COALESCE(MAX(id), 1)) FROM table_name;"
```

**Example for common tables:**

```bash
# Reset users table
PGPASSWORD=user psql -U postgres -d hqdms -c "SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(MAX(id), 1)) FROM users;"

# Reset drugs table
PGPASSWORD=user psql -U postgres -d hqdms -c "SELECT setval(pg_get_serial_sequence('drugs', 'id'), COALESCE(MAX(id), 1)) FROM drugs;"

# Reset quotas table
PGPASSWORD=user psql -U postgres -d hqdms -c "SELECT setval(pg_get_serial_sequence('quotas', 'id'), COALESCE(MAX(id), 1)) FROM quotas;"
```

**Option 3: View Current Sequences Before Resetting**

To see which sequences need resetting:

```bash
# List all sequences and their current values
PGPASSWORD=user psql -U postgres -d hqdms << 'EOF'
SELECT 
    schemaname,
    sequencename,
    last_value
FROM pg_sequences
WHERE schemaname = 'public'
ORDER BY sequencename;
EOF
```

**Verify Sequences Were Reset:**

```bash
# Check sequences after reset
PGPASSWORD=user psql -U postgres -d hqdms << 'EOF'
SELECT 
    t.table_name,
    c.column_name,
    pg_get_serial_sequence(t.table_name, c.column_name) as sequence_name,
    (SELECT last_value FROM pg_sequences WHERE sequencename = substring(pg_get_serial_sequence(t.table_name, c.column_name) from '[^.]+

---

## Application Installation

### Install Backend Dependencies

```bash
cd /home/user/hqdms2

# Install backend dependencies
npm install
```

### Install Frontend Dependencies

```bash
cd /home/user/hqdms2/client

# Install frontend dependencies
npm install
```

### Configure Environment Variables

```bash
cd /home/user/hqdms2

# Create .env file for backend
nano .env
```

Add the following content to `.env`:

```env
PORT=3003
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hqdms
DB_USER=postgres
DB_PASSWORD=user
JWT_SECRET=your-secret-key-change-this-in-production
NODE_ENV=production
```

**Press `Ctrl+X`, then `Y`, then `Enter` to save and exit.**

**What this does:** Creates environment configuration file for the backend with database credentials.

### Build Frontend

```bash
cd /home/user/hqdms2/client

# Build the React application
npm run build
```

**What this does:** Compiles the React application into static files ready for production deployment.

---

## PM2 Setup for Backend

### Install PM2 Globally

```bash
sudo npm install -g pm2
```

**What this does:** Installs PM2, a production process manager for Node.js applications.

### Configure PM2 for Backend

```bash
cd /home/user/hqdms2

# Create PM2 ecosystem file
nano ecosystem.config.js
```

Add the following content:

```javascript
module.exports = {
  apps: [{
    name: 'hqdms-backend',
    script: './server/index.js',
    cwd: '/home/user/hqdms2',
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
```

**Press `Ctrl+X`, then `Y`, then `Enter` to save and exit.**

### Start Backend with PM2

```bash
# Start the backend
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup

# Run the command that PM2 outputs (it will look something like):
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u user --hp /home/user
```

**Copy and run the command that PM2 outputs after `pm2 startup`.**

### Verify Backend is Running

```bash
# Check PM2 status
pm2 status

# View backend logs
pm2 logs hqdms-backend

# Test backend (should return JSON response)
curl http://localhost:3003
```

**What this does:** Starts the Node.js backend with PM2 and configures it to auto-start on system boot.

---

## Apache Setup for Frontend

### Install Apache

```bash
sudo apt install -y apache2

# Enable required modules
sudo a2enmod rewrite
sudo a2enmod proxy
sudo a2enmod proxy_http
```

**What this does:** Installs Apache web server and enables necessary modules for serving the React app and proxying API requests.

### Configure Apache Virtual Host

```bash
# Create Apache configuration for HQDMS
sudo nano /etc/apache2/sites-available/hqdms.conf
```

Add the following content:

```apache
<VirtualHost *:80>
    ServerAdmin webmaster@localhost
    DocumentRoot /home/user/hqdms2/client/build

    <Directory /home/user/hqdms2/client/build>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # Handle React Router
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    # Proxy API requests to backend
    ProxyPreserveHost On
    ProxyPass /api http://localhost:3003/api
    ProxyPassReverse /api http://localhost:3003/api

    ErrorLog ${APACHE_LOG_DIR}/hqdms_error.log
    CustomLog ${APACHE_LOG_DIR}/hqdms_access.log combined
</VirtualHost>
```

**Press `Ctrl+X`, then `Y`, then `Enter` to save and exit.**

### Set Permissions

```bash
# Give Apache access to the build directory
sudo chmod -R 755 /home/user/hqdms2/client/build
sudo chown -R www-data:www-data /home/user/hqdms2/client/build
```

**What this does:** Sets proper permissions so Apache can read and serve the frontend files.

### Enable Site and Restart Apache

```bash
# Disable default site
sudo a2dissite 000-default.conf

# Enable HQDMS site
sudo a2ensite hqdms.conf

# Test Apache configuration
sudo apache2ctl configtest

# Restart Apache
sudo systemctl restart apache2

# Enable Apache to start on boot
sudo systemctl enable apache2
```

**What this does:** Activates the HQDMS site configuration and restarts Apache.

---

## Starting the Application

### Start Everything

```bash
# Start PostgreSQL (if not running)
sudo systemctl start postgresql

# Start backend with PM2 (if not running)
cd /home/user/hqdms2
pm2 start ecosystem.config.js

# Start Apache (if not running)
sudo systemctl start apache2

# Check all services
sudo systemctl status postgresql
pm2 status
sudo systemctl status apache2
```

### Access the Application

1. **Get your WSL2 IP address:**
   ```bash
   hostname -I | awk '{print $1}'
   ```

2. **Access from Windows:**
   - Open browser and go to: `http://[WSL2_IP_ADDRESS]`
   - Or try: `http://localhost` (if port forwarding is configured)

3. **Access from other devices on network:**
   - Use the WSL2 IP address: `http://[WSL2_IP_ADDRESS]`

---

## Troubleshooting

### Check Backend Logs

```bash
# View live logs
pm2 logs hqdms-backend

# View last 100 lines
pm2 logs hqdms-backend --lines 100
```

### Check Apache Logs

```bash
# Error log
sudo tail -f /var/log/apache2/hqdms_error.log

# Access log
sudo tail -f /var/log/apache2/hqdms_access.log
```

### Check PostgreSQL Status

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Test database connection
PGPASSWORD=user psql -U postgres -d hqdms -c "SELECT version();"
```

### Restart Services

```bash
# Restart backend
pm2 restart hqdms-backend

# Restart Apache
sudo systemctl restart apache2

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Check Ports

```bash
# Check if ports are in use
sudo netstat -tlnp | grep -E ':(3003|3000|80|5432)'

# Or use ss command
sudo ss -tlnp | grep -E ':(3003|3000|80|5432)'
```

### Rebuild Frontend

If you make changes to the frontend:

```bash
cd /home/user/hqdms2/client
npm run build
sudo systemctl restart apache2
```

### PM2 Commands Reference

```bash
# Start app
pm2 start ecosystem.config.js

# Stop app
pm2 stop hqdms-backend

# Restart app
pm2 restart hqdms-backend

# Delete app from PM2
pm2 delete hqdms-backend

# View detailed info
pm2 info hqdms-backend

# Monitor in real-time
pm2 monit
```

### Windows Firewall

If you can't access from other devices, you may need to allow port 80 in Windows Firewall:

1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Choose "Port" → Next
5. Choose "TCP" and enter port "80" → Next
6. Choose "Allow the connection" → Next
7. Apply to all profiles → Next
8. Name it "WSL2 Apache" → Finish

---

## Quick Reference Commands

### Daily Operations

```bash
# Check all services status
pm2 status && sudo systemctl status apache2 postgresql

# Restart backend after code changes
cd /home/user/hqdms2
pm2 restart hqdms-backend

# Rebuild and deploy frontend changes
cd /home/user/hqdms2/client
npm run build
sudo systemctl restart apache2

# View backend logs
pm2 logs hqdms-backend --lines 50
```

### Backup Database

```bash
# Create backup
PGPASSWORD=user pg_dump -U postgres -d hqdms > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## Security Notes

⚠️ **Important for Production:**

1. Change the JWT_SECRET in `.env` to a strong random string
2. Consider using a stronger PostgreSQL password
3. Configure firewall rules appropriately
4. Keep all software updated regularly
5. Consider setting up SSL/HTTPS for production use

---

## Keeping WSL2 Running After Closing Terminal

**Problem:** When you close the WSL2 terminal, the entire WSL2 instance shuts down, stopping all services.

### Solution 1: Keep WSL2 Running in Background (Recommended)

Add this to your Windows startup to keep WSL2 alive:

1. **Create a startup script (in Windows):**

   Open PowerShell as Administrator and create a VBS script:

   ```powershell
   # Create the directory if it doesn't exist
   New-Item -ItemType Directory -Force -Path "$env:APPDATA\WSL2Startup"
   
   # Create the VBS script
   @"
   Set objShell = CreateObject("WScript.Shell")
   objShell.Run "wsl -d Ubuntu-24.04 -u user -- bash -c 'cd /home/user && tail -f /dev/null'", 0, False
   "@ | Out-File -FilePath "$env:APPDATA\WSL2Startup\StartWSL.vbs" -Encoding ASCII
   ```

2. **Add to Windows Startup:**

   ```powershell
   # Create a shortcut in Startup folder
   $WshShell = New-Object -comObject WScript.Shell
   $Shortcut = $WshShell.CreateShortcut("$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\WSL2-HQDMS.lnk")
   $Shortcut.TargetPath = "$env:APPDATA\WSL2Startup\StartWSL.vbs"
   $Shortcut.Save()
   ```

3. **Run it now (without restarting Windows):**

   ```powershell
   wsl -d Ubuntu-24.04 -u user -- bash -c "cd /home/user && tail -f /dev/null" &
   ```

**What this does:** Keeps WSL2 running in the background by running a harmless command that never exits. WSL2 stays alive even when you close all terminals.

### Solution 2: Windows Service Approach (Alternative)

Use Windows Task Scheduler to keep WSL2 running:

1. Open Task Scheduler (Windows + R, type `taskschd.msc`)
2. Click "Create Task" (not "Create Basic Task")
3. **General tab:**
   - Name: `WSL2 HQDMS KeepAlive`
   - Select "Run whether user is logged on or not"
   - Check "Run with highest privileges"
4. **Triggers tab:**
   - New → Begin the task: "At startup"
   - Check "Enabled"
5. **Actions tab:**
   - New → Action: "Start a program"
   - Program: `wsl.exe`
   - Arguments: `-d Ubuntu-24.04 -u user -- bash -c "tail -f /dev/null"`
6. **Conditions tab:**
   - Uncheck "Start the task only if the computer is on AC power"
7. **Settings tab:**
   - Uncheck "Stop the task if it runs longer than"
8. Click OK and enter your Windows password

**Restart Windows to test.**

### Solution 3: Configure WSL2 to Not Shut Down (WSL 0.67.6+)

Create or edit `.wslconfig` in Windows:

1. **In PowerShell or Command Prompt (Windows side):**

   ```powershell
   notepad $env:USERPROFILE\.wslconfig
   ```

2. **Add this content:**

   ```ini
   [wsl2]
   # Keep WSL2 running for 1 hour after last terminal closes
   vmIdleTimeout=3600000
   
   # Or set to -1 to never shut down (not recommended, uses more resources)
   # vmIdleTimeout=-1
   ```

3. **Save and restart WSL2:**

   ```powershell
   wsl --shutdown
   wsl -d Ubuntu-24.04
   ```

**What this does:** Keeps WSL2 running for 1 hour (3600000 ms) after you close the terminal. Adjust the value as needed.

### Verify Services Auto-Start

Make sure all services start automatically when WSL2 boots:

```bash
# In WSL2 terminal
sudo systemctl enable postgresql
sudo systemctl enable apache2

# Verify they're set to auto-start
systemctl is-enabled postgresql
systemctl is-enabled apache2

# PM2 should already be configured for auto-start from earlier setup
pm2 list
```

### Testing the Setup

1. **Start all services:**
   ```bash
   sudo systemctl start postgresql apache2
   pm2 start ecosystem.config.js
   pm2 save
   ```

2. **Close the terminal**

3. **Test from Windows browser:**
   - Get WSL IP: Open PowerShell and run `wsl hostname -I`
   - Open browser: `http://[WSL_IP]`

4. **Reopen WSL terminal and check:**
   ```bash
   pm2 status
   sudo systemctl status apache2 postgresql
   ```

### Troubleshooting WSL2 Shutdown Issues

**If services don't start automatically after WSL2 restarts:**

1. **Check systemd is enabled:**
   ```bash
   # Edit WSL configuration
   sudo nano /etc/wsl.conf
   ```

   Add this content:
   ```ini
   [boot]
   systemd=true
   ```

   Save and exit, then restart WSL2 from PowerShell:
   ```powershell
   wsl --shutdown
   wsl -d Ubuntu-24.04
   ```

2. **Create a startup script (alternative method):**
   ```bash
   # Create startup script
   nano /home/user/start-hqdms.sh
   ```

   Add this content:
   ```bash
   #!/bin/bash
   
   # Wait for system to be ready
   sleep 5
   
   # Start PostgreSQL
   sudo systemctl start postgresql
   
   # Start Apache
   sudo systemctl start apache2
   
   # Start PM2 apps
   cd /home/user/hqdms2
   pm2 resurrect
   ```

   Make it executable:
   ```bash
   chmod +x /home/user/start-hqdms.sh
   ```

   Add to WSL boot (in `/etc/wsl.conf`):
   ```ini
   [boot]
   systemd=true
   command="/home/user/start-hqdms.sh"
   ```

### Quick Access from Windows

Create a PowerShell script on your Windows desktop for easy access:

1. **Create `HQDMS-Status.ps1` on Desktop:**
   ```powershell
   # Get WSL IP
   $wslIP = wsl -d Ubuntu-24.04 hostname -I
   $wslIP = $wslIP.Trim()
   
   Write-Host "HQDMS Status Check" -ForegroundColor Cyan
   Write-Host "==================" -ForegroundColor Cyan
   Write-Host ""
   Write-Host "WSL2 IP Address: $wslIP" -ForegroundColor Green
   Write-Host "Web Interface: http://$wslIP" -ForegroundColor Green
   Write-Host ""
   Write-Host "Checking services..." -ForegroundColor Yellow
   
   wsl -d Ubuntu-24.04 -u user -- bash -c "pm2 status && sudo systemctl status postgresql apache2 --no-pager"
   
   Write-Host ""
   Write-Host "Press any key to open web interface..."
   $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
   Start-Process "http://$wslIP"
   ```

2. **Create a shortcut on desktop:**
   - Right-click Desktop → New → Shortcut
   - Target: `powershell.exe -ExecutionPolicy Bypass -File "%USERPROFILE%\Desktop\HQDMS-Status.ps1"`
   - Name: "HQDMS Status"

## Support

For issues or questions, check the logs first:
- Backend: `pm2 logs hqdms-backend`
- Apache: `/var/log/apache2/hqdms_error.log`
- PostgreSQL: `/var/log/postgresql/postgresql-16-main.log`

**Common Issues:**
- **App not accessible after closing terminal:** Follow the "Keeping WSL2 Running" section above
- **Services not starting on WSL2 boot:** Ensure systemd is enabled in `/etc/wsl.conf`
- **Can't access from other devices:** Check Windows Firewall settings

---

**Setup completed! Your HQDMS application should now be running and remain accessible even after closing the terminal.**)) as current_value,
    (SELECT MAX(a.attname::text) FROM pg_attribute a WHERE a.attrelid = t.table_name::regclass AND a.attname = c.column_name) as column_exists
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
AND c.column_default LIKE 'nextval%'
ORDER BY t.table_name;
EOF
```

**What this does:** Displays all tables with auto-increment columns and their current sequence values so you can verify they're set correctly.

---

## Application Installation

### Install Backend Dependencies

```bash
cd /home/user/hqdms2

# Install backend dependencies
npm install
```

### Install Frontend Dependencies

```bash
cd /home/user/hqdms2/client

# Install frontend dependencies
npm install
```

### Configure Environment Variables

```bash
cd /home/user/hqdms2

# Create .env file for backend
nano .env
```

Add the following content to `.env`:

```env
PORT=3003
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hqdms
DB_USER=postgres
DB_PASSWORD=user
JWT_SECRET=your-secret-key-change-this-in-production
NODE_ENV=production
```

**Press `Ctrl+X`, then `Y`, then `Enter` to save and exit.**

**What this does:** Creates environment configuration file for the backend with database credentials.

### Build Frontend

```bash
cd /home/user/hqdms2/client

# Build the React application
npm run build
```

**What this does:** Compiles the React application into static files ready for production deployment.

---

## PM2 Setup for Backend

### Install PM2 Globally

```bash
sudo npm install -g pm2
```

**What this does:** Installs PM2, a production process manager for Node.js applications.

### Configure PM2 for Backend

```bash
cd /home/user/hqdms2

# Create PM2 ecosystem file
nano ecosystem.config.js
```

Add the following content:

```javascript
module.exports = {
  apps: [{
    name: 'hqdms-backend',
    script: './server/index.js',
    cwd: '/home/user/hqdms2',
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
```

**Press `Ctrl+X`, then `Y`, then `Enter` to save and exit.**

### Start Backend with PM2

```bash
# Start the backend
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup

# Run the command that PM2 outputs (it will look something like):
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u user --hp /home/user
```

**Copy and run the command that PM2 outputs after `pm2 startup`.**

### Verify Backend is Running

```bash
# Check PM2 status
pm2 status

# View backend logs
pm2 logs hqdms-backend

# Test backend (should return JSON response)
curl http://localhost:3003
```

**What this does:** Starts the Node.js backend with PM2 and configures it to auto-start on system boot.

---

## Apache Setup for Frontend

### Install Apache

```bash
sudo apt install -y apache2

# Enable required modules
sudo a2enmod rewrite
sudo a2enmod proxy
sudo a2enmod proxy_http
```

**What this does:** Installs Apache web server and enables necessary modules for serving the React app and proxying API requests.

### Configure Apache Virtual Host

```bash
# Create Apache configuration for HQDMS
sudo nano /etc/apache2/sites-available/hqdms.conf
```

Add the following content:

```apache
<VirtualHost *:80>
    ServerAdmin webmaster@localhost
    DocumentRoot /home/user/hqdms2/client/build

    <Directory /home/user/hqdms2/client/build>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # Handle React Router
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    # Proxy API requests to backend
    ProxyPreserveHost On
    ProxyPass /api http://localhost:3003/api
    ProxyPassReverse /api http://localhost:3003/api

    ErrorLog ${APACHE_LOG_DIR}/hqdms_error.log
    CustomLog ${APACHE_LOG_DIR}/hqdms_access.log combined
</VirtualHost>
```

**Press `Ctrl+X`, then `Y`, then `Enter` to save and exit.**

### Set Permissions

```bash
# Give Apache access to the build directory
sudo chmod -R 755 /home/user/hqdms2/client/build
sudo chown -R www-data:www-data /home/user/hqdms2/client/build
```

**What this does:** Sets proper permissions so Apache can read and serve the frontend files.

### Enable Site and Restart Apache

```bash
# Disable default site
sudo a2dissite 000-default.conf

# Enable HQDMS site
sudo a2ensite hqdms.conf

# Test Apache configuration
sudo apache2ctl configtest

# Restart Apache
sudo systemctl restart apache2

# Enable Apache to start on boot
sudo systemctl enable apache2
```

**What this does:** Activates the HQDMS site configuration and restarts Apache.

---

## Starting the Application

### Start Everything

```bash
# Start PostgreSQL (if not running)
sudo systemctl start postgresql

# Start backend with PM2 (if not running)
cd /home/user/hqdms2
pm2 start ecosystem.config.js

# Start Apache (if not running)
sudo systemctl start apache2

# Check all services
sudo systemctl status postgresql
pm2 status
sudo systemctl status apache2
```

### Access the Application

1. **Get your WSL2 IP address:**
   ```bash
   hostname -I | awk '{print $1}'
   ```

2. **Access from Windows:**
   - Open browser and go to: `http://[WSL2_IP_ADDRESS]`
   - Or try: `http://localhost` (if port forwarding is configured)

3. **Access from other devices on network:**
   - Use the WSL2 IP address: `http://[WSL2_IP_ADDRESS]`

---

## Troubleshooting

### Check Backend Logs

```bash
# View live logs
pm2 logs hqdms-backend

# View last 100 lines
pm2 logs hqdms-backend --lines 100
```

### Check Apache Logs

```bash
# Error log
sudo tail -f /var/log/apache2/hqdms_error.log

# Access log
sudo tail -f /var/log/apache2/hqdms_access.log
```

### Check PostgreSQL Status

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Test database connection
PGPASSWORD=user psql -U postgres -d hqdms -c "SELECT version();"
```

### Restart Services

```bash
# Restart backend
pm2 restart hqdms-backend

# Restart Apache
sudo systemctl restart apache2

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Check Ports

```bash
# Check if ports are in use
sudo netstat -tlnp | grep -E ':(3003|3000|80|5432)'

# Or use ss command
sudo ss -tlnp | grep -E ':(3003|3000|80|5432)'
```

### Rebuild Frontend

If you make changes to the frontend:

```bash
cd /home/user/hqdms2/client
npm run build
sudo systemctl restart apache2
```

### PM2 Commands Reference

```bash
# Start app
pm2 start ecosystem.config.js

# Stop app
pm2 stop hqdms-backend

# Restart app
pm2 restart hqdms-backend

# Delete app from PM2
pm2 delete hqdms-backend

# View detailed info
pm2 info hqdms-backend

# Monitor in real-time
pm2 monit
```

### Windows Firewall

If you can't access from other devices, you may need to allow port 80 in Windows Firewall:

1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Choose "Port" → Next
5. Choose "TCP" and enter port "80" → Next
6. Choose "Allow the connection" → Next
7. Apply to all profiles → Next
8. Name it "WSL2 Apache" → Finish

---

## Quick Reference Commands

### Daily Operations

```bash
# Check all services status
pm2 status && sudo systemctl status apache2 postgresql

# Restart backend after code changes
cd /home/user/hqdms2
pm2 restart hqdms-backend

# Rebuild and deploy frontend changes
cd /home/user/hqdms2/client
npm run build
sudo systemctl restart apache2

# View backend logs
pm2 logs hqdms-backend --lines 50
```

### Backup Database

```bash
# Create backup
PGPASSWORD=user pg_dump -U postgres -d hqdms > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## Security Notes

⚠️ **Important for Production:**

1. Change the JWT_SECRET in `.env` to a strong random string
2. Consider using a stronger PostgreSQL password
3. Configure firewall rules appropriately
4. Keep all software updated regularly
5. Consider setting up SSL/HTTPS for production use

---

## Keeping WSL2 Running After Closing Terminal

**Problem:** When you close the WSL2 terminal, the entire WSL2 instance shuts down, stopping all services.

### Solution 1: Keep WSL2 Running in Background (Recommended)

Add this to your Windows startup to keep WSL2 alive:

1. **Create a startup script (in Windows):**

   Open PowerShell as Administrator and create a VBS script:

   ```powershell
   # Create the directory if it doesn't exist
   New-Item -ItemType Directory -Force -Path "$env:APPDATA\WSL2Startup"
   
   # Create the VBS script
   @"
   Set objShell = CreateObject("WScript.Shell")
   objShell.Run "wsl -d Ubuntu-24.04 -u user -- bash -c 'cd /home/user && tail -f /dev/null'", 0, False
   "@ | Out-File -FilePath "$env:APPDATA\WSL2Startup\StartWSL.vbs" -Encoding ASCII
   ```

2. **Add to Windows Startup:**

   ```powershell
   # Create a shortcut in Startup folder
   $WshShell = New-Object -comObject WScript.Shell
   $Shortcut = $WshShell.CreateShortcut("$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\WSL2-HQDMS.lnk")
   $Shortcut.TargetPath = "$env:APPDATA\WSL2Startup\StartWSL.vbs"
   $Shortcut.Save()
   ```

3. **Run it now (without restarting Windows):**

   ```powershell
   wsl -d Ubuntu-24.04 -u user -- bash -c "cd /home/user && tail -f /dev/null" &
   ```

**What this does:** Keeps WSL2 running in the background by running a harmless command that never exits. WSL2 stays alive even when you close all terminals.

### Solution 2: Windows Service Approach (Alternative)

Use Windows Task Scheduler to keep WSL2 running:

1. Open Task Scheduler (Windows + R, type `taskschd.msc`)
2. Click "Create Task" (not "Create Basic Task")
3. **General tab:**
   - Name: `WSL2 HQDMS KeepAlive`
   - Select "Run whether user is logged on or not"
   - Check "Run with highest privileges"
4. **Triggers tab:**
   - New → Begin the task: "At startup"
   - Check "Enabled"
5. **Actions tab:**
   - New → Action: "Start a program"
   - Program: `wsl.exe`
   - Arguments: `-d Ubuntu-24.04 -u user -- bash -c "tail -f /dev/null"`
6. **Conditions tab:**
   - Uncheck "Start the task only if the computer is on AC power"
7. **Settings tab:**
   - Uncheck "Stop the task if it runs longer than"
8. Click OK and enter your Windows password

**Restart Windows to test.**

### Solution 3: Configure WSL2 to Not Shut Down (WSL 0.67.6+)

Create or edit `.wslconfig` in Windows:

1. **In PowerShell or Command Prompt (Windows side):**

   ```powershell
   notepad $env:USERPROFILE\.wslconfig
   ```

2. **Add this content:**

   ```ini
   [wsl2]
   # Keep WSL2 running for 1 hour after last terminal closes
   vmIdleTimeout=3600000
   
   # Or set to -1 to never shut down (not recommended, uses more resources)
   # vmIdleTimeout=-1
   ```

3. **Save and restart WSL2:**

   ```powershell
   wsl --shutdown
   wsl -d Ubuntu-24.04
   ```

**What this does:** Keeps WSL2 running for 1 hour (3600000 ms) after you close the terminal. Adjust the value as needed.

### Verify Services Auto-Start

Make sure all services start automatically when WSL2 boots:

```bash
# In WSL2 terminal
sudo systemctl enable postgresql
sudo systemctl enable apache2

# Verify they're set to auto-start
systemctl is-enabled postgresql
systemctl is-enabled apache2

# PM2 should already be configured for auto-start from earlier setup
pm2 list
```

### Testing the Setup

1. **Start all services:**
   ```bash
   sudo systemctl start postgresql apache2
   pm2 start ecosystem.config.js
   pm2 save
   ```

2. **Close the terminal**

3. **Test from Windows browser:**
   - Get WSL IP: Open PowerShell and run `wsl hostname -I`
   - Open browser: `http://[WSL_IP]`

4. **Reopen WSL terminal and check:**
   ```bash
   pm2 status
   sudo systemctl status apache2 postgresql
   ```

### Troubleshooting WSL2 Shutdown Issues

**If services don't start automatically after WSL2 restarts:**

1. **Check systemd is enabled:**
   ```bash
   # Edit WSL configuration
   sudo nano /etc/wsl.conf
   ```

   Add this content:
   ```ini
   [boot]
   systemd=true
   ```

   Save and exit, then restart WSL2 from PowerShell:
   ```powershell
   wsl --shutdown
   wsl -d Ubuntu-24.04
   ```

2. **Create a startup script (alternative method):**
   ```bash
   # Create startup script
   nano /home/user/start-hqdms.sh
   ```

   Add this content:
   ```bash
   #!/bin/bash
   
   # Wait for system to be ready
   sleep 5
   
   # Start PostgreSQL
   sudo systemctl start postgresql
   
   # Start Apache
   sudo systemctl start apache2
   
   # Start PM2 apps
   cd /home/user/hqdms2
   pm2 resurrect
   ```

   Make it executable:
   ```bash
   chmod +x /home/user/start-hqdms.sh
   ```

   Add to WSL boot (in `/etc/wsl.conf`):
   ```ini
   [boot]
   systemd=true
   command="/home/user/start-hqdms.sh"
   ```

### Quick Access from Windows

Create a PowerShell script on your Windows desktop for easy access:

1. **Create `HQDMS-Status.ps1` on Desktop:**
   ```powershell
   # Get WSL IP
   $wslIP = wsl -d Ubuntu-24.04 hostname -I
   $wslIP = $wslIP.Trim()
   
   Write-Host "HQDMS Status Check" -ForegroundColor Cyan
   Write-Host "==================" -ForegroundColor Cyan
   Write-Host ""
   Write-Host "WSL2 IP Address: $wslIP" -ForegroundColor Green
   Write-Host "Web Interface: http://$wslIP" -ForegroundColor Green
   Write-Host ""
   Write-Host "Checking services..." -ForegroundColor Yellow
   
   wsl -d Ubuntu-24.04 -u user -- bash -c "pm2 status && sudo systemctl status postgresql apache2 --no-pager"
   
   Write-Host ""
   Write-Host "Press any key to open web interface..."
   $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
   Start-Process "http://$wslIP"
   ```

2. **Create a shortcut on desktop:**
   - Right-click Desktop → New → Shortcut
   - Target: `powershell.exe -ExecutionPolicy Bypass -File "%USERPROFILE%\Desktop\HQDMS-Status.ps1"`
   - Name: "HQDMS Status"

## Support

For issues or questions, check the logs first:
- Backend: `pm2 logs hqdms-backend`
- Apache: `/var/log/apache2/hqdms_error.log`
- PostgreSQL: `/var/log/postgresql/postgresql-16-main.log`

**Common Issues:**
- **App not accessible after closing terminal:** Follow the "Keeping WSL2 Running" section above
- **Services not starting on WSL2 boot:** Ensure systemd is enabled in `/etc/wsl.conf`
- **Can't access from other devices:** Check Windows Firewall settings

---

**Setup completed! Your HQDMS application should now be running and remain accessible even after closing the terminal.**