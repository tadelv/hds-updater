#!/bin/bash
# Simple script to start a local web server for the Decent Firmware Updater

echo "Starting Decent Firmware Updater web server..."
echo ""
echo "Server will be available at: http://localhost:8000"
echo "Press Ctrl+C to stop the server"
echo ""

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    python -m http.server 8000
else
    echo "Error: Python not found. Please install Python or use another method."
    exit 1
fi
