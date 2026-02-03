# Live Deployment Guide

## Quick Deploy URLs

### Frontend (Vercel)
1. Go to [vercel.com](https://vercel.com)
2. Connect GitHub account
3. Import `dinu123/medicalapp`
4. Deploy automatically

### Backend (Railway)
1. Go to [railway.app](https://railway.app)
2. Connect GitHub account
3. Deploy from `dinu123/medicalapp`
4. Add environment variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: Any random string
   - `PORT`: 3008

### Database (MongoDB Atlas)
1. Go to [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create free cluster
3. Get connection string
4. Use in Railway environment variables

## Expected Live URLs
- **Frontend**: `https://medicalapp-dinu123.vercel.app`
- **Backend**: `https://medicalapp-production.up.railway.app`

## Test the App
Once deployed, testers can:
1. Visit the frontend URL
2. Create products and transactions
3. Test the Returns Management feature
4. Search and process returns

## Environment Variables Needed
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/medicalapp
JWT_SECRET=your-secret-key-here
PORT=3008
```