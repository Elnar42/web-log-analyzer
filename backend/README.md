# WebLog Analyzer - Django Backend with Apache Spark

A Django REST API backend that uses Apache Spark for large-scale web log analysis.

## Features

- **Multi-format Log Parsing**: Supports Apache, Nginx, and CSV log formats
- **Five Analysis Jobs**:
  - P1: Unique IP Counter - Count and rank unique visitors
  - P2: Top Pages Counter - Most requested pages/resources
  - P3: Hourly Traffic Counter - Request distribution by hour
  - P4: Status Code Distribution - HTTP response code breakdown
  - P5: Bandwidth Aggregator - Total and per-path bandwidth usage
- **Flexible Filtering**: Date range, IP, URL pattern, status codes, HTTP methods, response size
- **Results Storage**: CSV export and JSON storage for historical access
- **Spark Integration**: Local mode for single machine processing

## Prerequisites

- Python 3.9+
- Java 8 or 11 (required for PySpark)
- Apache Spark 3.x (automatically installed via PySpark)

## Installation

1. **Create virtual environment**:
   \`\`\`bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   \`\`\`

2. **Install dependencies**:
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`

3. **Set up database**:
   \`\`\`bash
   python manage.py migrate
   \`\`\`

4. **Create results directory**:
   \`\`\`bash
   mkdir -p results media
   \`\`\`

5. **Run development server**:
   \`\`\`bash
   python manage.py runserver 8000
   \`\`\`

The API will be available at `http://localhost:8000/api/`

## API Endpoints

### Upload Log File
\`\`\`
POST /api/upload/
Content-Type: multipart/form-data

file: <log file>
\`\`\`

### Preview Data
\`\`\`
GET /api/preview/<file_id>/?page=1&limit=100
\`\`\`

### Run Analysis
\`\`\`
POST /api/analyze/
Content-Type: application/json

{
  "fileId": "uuid",
  "selectedAnalyses": ["unique-ips", "top-pages", "status-codes"],
  "filters": {
    "dateRange": {"start": "", "end": ""},
    "ipAddress": "",
    "urlPattern": "",
    "statusCodes": [],
    "httpMethods": [],
    "sizeRange": {"min": "", "max": ""}
  }
}
\`\`\`

### Get Job Status
\`\`\`
GET /api/status/<job_id>/
\`\`\`

### List Results History
\`\`\`
GET /api/results/
\`\`\`

### Get Specific Result
\`\`\`
GET /api/results/<result_id>/
\`\`\`

### Download Result CSV
\`\`\`
GET /api/results/<result_id>/download/?type=unique-ips
\`\`\`

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DJANGO_SECRET_KEY` | (auto-generated) | Django secret key |
| `DEBUG` | `True` | Debug mode |
| `SPARK_MASTER` | `local[*]` | Spark master URL |

## Supported Log Formats

### Apache Combined Log Format
\`\`\`
10.223.157.186 - - [15/Jul/2009:14:58:59 -0700] "GET /index.html HTTP/1.1" 200 1234
\`\`\`

### Nginx Default Format
\`\`\`
10.223.157.186 - - [15/Jul/2009:14:58:59 -0700] "GET /index.html HTTP/1.1" 200 1234
\`\`\`

### CSV Format
Must include headers with keywords: ip/address, timestamp/date, method, path/url, status/code, size/bytes

\`\`\`csv
ip,timestamp,method,path,status,size
10.223.157.186,2009-07-15T14:58:59,GET,/index.html,200,1234
\`\`\`

## Production Deployment

For production:

1. Set `DEBUG=False`
2. Configure proper `DJANGO_SECRET_KEY`
3. Use PostgreSQL instead of SQLite
4. Configure Redis for caching parsed data
5. Set up proper CORS origins
6. Use Gunicorn: `gunicorn weblog_analyzer.wsgi:application`

## Connecting to Frontend

Update the frontend to point to this backend:

\`\`\`typescript
// In your Next.js app
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
\`\`\`

## License

MIT
