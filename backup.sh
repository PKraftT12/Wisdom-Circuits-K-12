#!/bin/bash

# Get current date for commit message
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Add all changes
git add .

# Commit with date
git commit -m "Automated backup: $DATE"

# Push to GitHub
git push origin main
