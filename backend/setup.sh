#!/bin/bash
# Setup script for WebLog Analyzer Backend

echo "Setting up WebLog Analyzer Backend..."

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create directories
mkdir -p results media

# Run migrations
python manage.py migrate

echo ""
echo "Setup complete! Run the server with:"
echo "  source venv/bin/activate"
echo "  python manage.py runserver 8000"
echo ""
echo "API will be available at http://localhost:8000/api/"
