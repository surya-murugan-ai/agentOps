#!/bin/sh
echo "Setting up database..."
npm install drizzle-kit
npx drizzle-kit push
echo "Starting application..."
exec node dist/index.js
