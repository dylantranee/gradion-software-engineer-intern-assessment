#!/usr/bin/env bash
set -e

# Book Illustration Studio - Quickstart Runner
echo "========================================="
echo " Starting Book Illustration Studio"
echo "========================================="

# Ensure Node.js is on PATH
export PATH="/opt/homebrew/bin:$PATH"

# 1. Validate environment configuration
if [ ! -f .env ]; then
  echo "⚠️  No .env file found. Copying from .env.example..."
  cp .env.example .env
  echo "ℹ️  Created .env template. Please ensure your GEMINI_API_KEY is configured."
fi

# 2. Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing npm workspace dependencies..."
  npm install
fi

# 3. Launch fullstack development servers
echo "🚀 Booting Express Backend (Port 3001) & React Frontend (Port 3000)..."
npm run dev
