# WebLog Analyzer with Apache Spark

A comprehensive web log analysis application that processes Apache, Nginx, and CSV log files using Apache Spark for large-scale data processing. Features a modern Next.js frontend and Django REST API backend.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Installation](#installation)
  - [Windows Installation](#windows-installation)
  - [macOS Installation](#macos-installation)
- [Running the Application](#running-the-application)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Configuration](#configuration)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)

## Features

### Analysis Capabilities
- **P1: Unique IP Counter** - Count and rank unique visitor IP addresses
- **P2: Top Pages Counter** - Identify most requested pages and resources
- **P3: Hourly Traffic Counter** - Request distribution by hour of day
- **P4: Status Code Distribution** - HTTP response status code breakdown
- **P5: Bandwidth Aggregator** - Total and per-path bandwidth usage

### Log Format Support
- Apache Combined Log Format (with referrer, user-agent, response time)
- Nginx Access Log Format
- CSV format with auto-detection
- Common Log Format

### Filtering Options
- Date range filtering
- IP address pattern matching
- URL pattern matching
- HTTP method filtering
- Status code filtering (individual codes and ranges)
- Response size range filtering

### Additional Features
- Real-time parsing progress
- Chunked processing for large files (up to 1,000,000 entries)
- Client-side fallback when backend is unavailable
- Historical analysis results storage
- CSV export functionality
- Sample log files for testing

## Prerequisites

### Required Software

#### For Both Platforms:
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **Python** (3.9 or higher) - [Download](https://www.python.org/downloads/)
- **Java** (JDK 8 or 11) - Required for Apache Spark/PySpark
  - Windows: [Download Oracle JDK](https://www.oracle.com/java/technologies/downloads/) or [OpenJDK](https://adoptium.net/)
  - macOS: `brew install openjdk@11` or download from [Adoptium](https://adoptium.net/)

#### Windows-Specific:
- **Git for Windows** (optional, for cloning) - [Download](https://git-scm.com/download/win)
- **PowerShell** (comes with Windows 10/11)

#### macOS-Specific:
- **Homebrew** (recommended) - [Installation Guide](https://brew.sh/)
- **Xcode Command Line Tools**: `xcode-select --install`

### Verify Installations

#### Windows (PowerShell):
```powershell
node --version    # Should show v18.x.x or higher
python --version  # Should show Python 3.9.x or higher
java -version     # Should show Java 8 or 11
```

#### macOS (Terminal):
```bash
node --version    # Should show v18.x.x or higher
python3 --version # Should show Python 3.9.x or higher
java -version     # Should show Java 8 or 11
```

## Project Structure

```
web-log-analyzer-with-spark/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── analysis-panel.tsx
│   ├── data-preview.tsx
│   ├── file-upload.tsx
│   ├── filter-panel.tsx
│   ├── header.tsx
│   └── ...
├── lib/                   # Utility libraries
│   ├── log-parser.ts     # Client-side log parser
│   ├── types.ts          # TypeScript types
│   └── utils.ts
├── public/               # Static files
│   ├── samples/          # Sample log files
│   └── ...
├── backend/              # Django backend
│   ├── analyzer/        # Main app
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── spark_analyzer.py
│   │   └── log_parser.py
│   ├── weblog_analyzer/ # Django settings
│   ├── manage.py
│   ├── requirements.txt
│   └── setup.sh
├── package.json         # Frontend dependencies
└── README.md           # This file
```

## Installation

### Windows Installation

#### Step 1: Install Java (if not already installed)
1. Download Java 11 from [Adoptium](https://adoptium.net/)
2. Run the installer
3. Add Java to PATH (usually done automatically)
4. Verify: `java -version` in PowerShell

#### Step 2: Set Up Backend

Open PowerShell in the project root directory:

```powershell
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# If you get an execution policy error, run:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Upgrade pip
python -m pip install --upgrade pip

# Install Python dependencies
pip install -r requirements.txt

# Create necessary directories
mkdir -p results
mkdir -p media

# Run database migrations
python manage.py migrate

# Deactivate virtual environment (optional)
deactivate
```

#### Step 3: Set Up Frontend

Open a **new** PowerShell window in the project root:

```powershell
# Install Node.js dependencies
npm install

# Or if you prefer yarn
yarn install

# Or if you prefer pnpm
pnpm install
```

### macOS Installation

#### Step 1: Install Java (if not already installed)

**Using Homebrew (Recommended):**
```bash
brew install openjdk@11
```

**Or download from [Adoptium](https://adoptium.net/):**
1. Download the macOS installer
2. Run the installer
3. Verify: `java -version` in Terminal

#### Step 2: Set Up Backend

Open Terminal in the project root directory:

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
python -m pip install --upgrade pip

# Install Python dependencies
pip install -r requirements.txt

# Create necessary directories
mkdir -p results
mkdir -p media

# Run database migrations
python manage.py migrate

```

#### Step 3: Set Up Frontend

Open a **new** Terminal window in the project root:

```bash
# Install Node.js dependencies
npm install
```

## Running the Application

### Backend Setup

#### Windows:

1. Open PowerShell in the project root
2. Navigate to backend and activate virtual environment:
```powershell
cd backend
.\venv\Scripts\Activate.ps1
```

3. Start the Django development server:
```powershell
python manage.py runserver 8000
```

You should see:
```
Watching for file changes with StatReloader
Performing system checks...

System check identified no issues (0 silenced).
November 30, 2025 - 16:26:09
Django version 5.2.8, using settings 'weblog_analyzer.settings'
Starting development server at http://127.0.0.1:8000/
Quit the server with CTRL-BREAK.

WARNING: This is a development server. Do not use it in a production setting. Use a production WSGI or ASGI server instead.
For more information on production servers see: https://docs.djangoproject.com/en/5.2/howto/deployment/

```

#### macOS:

1. Open Terminal in the project root
2. Navigate to backend and activate virtual environment:
```bash
cd backend
source venv/bin/activate
```

3. Start the Django development server:
```bash
python manage.py runserver 8000
```

You should see:
```
Starting development server at http://127.0.0.1:8000/
Quit the server with CTRL-C.
```

**Keep this terminal window open** - the backend must be running for full functionality.

### Frontend Setup

#### Windows:

1. Open a **new** PowerShell window in the project root
2. Start the Next.js development server:
```powershell
npm run dev
```

#### macOS:

1. Open a **new** Terminal window in the project root
2. Start the Next.js development server:
```bash
npm run dev
```

You should see:
```
  ▲ Next.js 16.0.3
  - Local:        http://localhost:3000
  - Ready in 2.3s
```

### Accessing the Application

1. Open your web browser
2. Navigate to: **http://localhost:3000**
3. The application should load with:
   - Green indicator: "Spark Backend Connected" (if backend is running)
   - Red indicator: "Running Client-Side (Backend not available)" (if backend is not running)

## Configuration

### Backend Configuration

Edit `backend/weblog_analyzer/settings.py` if needed:

```python
# CORS settings - add your frontend URL if different
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
]

# Database (defaults to SQLite)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```

### Frontend Configuration

The frontend automatically connects to `http://localhost:8000/api` by default.

To change the backend URL, create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## Usage

### Uploading Log Files

1. Click "Drop your log file here or click to browse"
2. Select a log file (.log, .txt, or .csv)
3. Wait for parsing to complete
4. Review the parsed data preview

### Using Filters

1. Expand the Filters panel
2. Set your desired filters:
   - **Date Range**: Select start and end dates
   - **IP Address**: Enter IP pattern (e.g., "192.168.1")
   - **URL Pattern**: Enter path pattern (e.g., "/api", "/admin")
   - **HTTP Methods**: Click to select methods
   - **Status Codes**: Click to select codes or ranges
   - **Response Size**: Enter min/max bytes
3. Filters are applied automatically

### Running Analysis

1. Select one or more analysis jobs:
   - P1: Unique IP Counter
   - P2: Top Pages Counter
   - P3: Hourly Traffic Counter
   - P4: Status Code Distribution
   - P5: Bandwidth Aggregator
2. Click "Run Analysis"
3. Wait for processing to complete
4. View results in the Results Panel


## Troubleshooting

### Backend Issues

#### "Python not found" (Windows)
- Ensure Python is installed and added to PATH
- Reinstall Python and check "Add Python to PATH" during installation

#### "Python3: command not found" (macOS)
- Use `python3` instead of `python`
- Install Python via Homebrew: `brew install python3`

#### "Java not found"
- Verify Java installation: `java -version`
- Windows: Add Java to PATH environment variable
- macOS: Ensure JAVA_HOME is set: `export JAVA_HOME=$(/usr/libexec/java_home)`

#### "ModuleNotFoundError: No module named 'django'"
- Ensure virtual environment is activated
- Reinstall dependencies: `pip install -r requirements.txt`

#### "Port 8000 already in use"
- Stop the existing server (Ctrl+C or Ctrl+Break)
- Or use a different port: `python manage.py runserver 8001`
- Update frontend `.env.local` with new port

#### PySpark/Spark Issues
- Ensure Java is installed and accessible
- Check Java version: `java -version` (should be 8 or 11)
- Reinstall PySpark: `pip install --upgrade pyspark`

### Frontend Issues

#### "npm: command not found"
- Install Node.js from [nodejs.org](https://nodejs.org/)
- Restart your terminal/PowerShell after installation

#### "Port 3000 already in use"
- Stop the existing Next.js server (Ctrl+C)
- Or use a different port: `npm run dev -- -p 3001`

#### "Cannot connect to backend"
- Ensure backend is running on port 8000
- Check backend URL in `.env.local`
- Verify CORS settings in backend `settings.py`
- Check browser console for CORS errors

#### Logo Not Displaying
- Ensure `logo.svg` exists in `public/` folder
- Or the system will fallback to `icon.svg`
- Check browser console for image loading errors

### General Issues

#### "File too large" or "Memory errors"
- The application processes up to 1,000,000 entries
- Larger files are automatically truncated
- For very large files, consider splitting them

#### "No valid log entries found"
- Verify log file format matches supported formats
- Check file encoding (should be UTF-8)
- Try one of the sample files to test

#### Slow Performance
- Large files (>100k entries) may take time to process
- Progress indicators show processing status
- Consider using backend for better performance with Spark

### Code Structure

- **Frontend**: TypeScript + React + Next.js 16
- **Backend**: Python + Django REST Framework + PySpark
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

### Adding New Analysis Jobs

1. Add analysis method in `backend/analyzer/spark_analyzer.py`
2. Add corresponding frontend option in `components/analysis-panel.tsx`
3. Update types in `lib/types.ts`

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review backend logs in the terminal
3. Check browser console for frontend errors
4. Verify all prerequisites are installed correctly

## License

MIT License

---

**Note**: This application requires both backend and frontend to be running simultaneously for full functionality. The frontend can operate in client-side mode when the backend is unavailable, but Spark-powered analysis requires the backend.

