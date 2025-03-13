# MTG Multiplayer Online Platform Deployment Guide

## Overview
This document outlines the steps to deploy the MTG multiplayer online platform to make it publicly accessible.

## Prerequisites
- Node.js (v16+)
- npm or pnpm
- Git

## Server Deployment

### Option 1: Deploy to Heroku
1. Create a Heroku account if you don't have one
2. Install Heroku CLI
3. Login to Heroku: `heroku login`
4. Navigate to server directory: `cd /path/to/mtg_multiplayer_project/server`
5. Create Heroku app: `heroku create mtg-multiplayer-server`
6. Add environment variables:
   ```
   heroku config:set JWT_SECRET=your_secure_jwt_secret
   heroku config:set FRONTEND_URL=https://your-frontend-url.com
   ```
7. Deploy to Heroku: `git push heroku main`

### Option 2: Deploy to Render
1. Create a Render account
2. Create a new Web Service
3. Connect your GitHub repository
4. Configure the service:
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Add environment variables (JWT_SECRET, FRONTEND_URL)
5. Deploy the service

## Client Deployment

### Option 1: Deploy to Netlify
1. Create a Netlify account
2. Install Netlify CLI: `npm install -g netlify-cli`
3. Navigate to client directory: `cd /path/to/mtg_multiplayer_project/client`
4. Build the project: `npm run build`
5. Deploy to Netlify: `netlify deploy --prod`
6. Configure environment variables in Netlify dashboard:
   - REACT_APP_API_URL=https://your-server-url.com/api
   - REACT_APP_SOCKET_URL=https://your-server-url.com

### Option 2: Deploy to Vercel
1. Create a Vercel account
2. Install Vercel CLI: `npm install -g vercel`
3. Navigate to client directory: `cd /path/to/mtg_multiplayer_project/client`
4. Deploy to Vercel: `vercel --prod`
5. Configure environment variables in Vercel dashboard

## Post-Deployment Steps

1. Update CORS settings in server to allow requests from the deployed frontend URL
2. Test the deployed application to ensure all functionality works
3. Set up monitoring and logging
4. Configure automatic backups if using a database
5. Set up CI/CD pipeline for future updates

## Maintenance

1. Regularly update dependencies to patch security vulnerabilities
2. Monitor server performance and scale as needed
3. Implement analytics to track usage patterns
4. Create a feedback mechanism for users to report issues

## Troubleshooting

### Common Issues
1. CORS errors: Ensure server CORS settings include the frontend URL
2. WebSocket connection failures: Check firewall settings and ensure WebSocket protocol is supported
3. Authentication issues: Verify JWT secret is correctly set in environment variables
4. P2P connection issues: Ensure TURN/STUN servers are configured correctly if needed

### Debugging
1. Check server logs for backend errors
2. Use browser developer tools to debug frontend issues
3. Test WebRTC connections using tools like Trickle ICE
4. Verify environment variables are correctly set in both client and server
