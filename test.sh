#!/usr/bin/env bash
set -e

# Book Illustration Studio - Automated Test Runner
echo "========================================="
echo " Running Book Illustration Studio Test Suite"
echo "========================================="

# Ensure Node and npm paths
export PATH="/opt/homebrew/bin:$PATH"

# Run backend and frontend tests
echo "Running Backend & Frontend Tests..."
npm test
