@echo off
echo Installing MongoDB locally...
echo.
echo Option 1: Download MongoDB Community Server
echo https://www.mongodb.com/try/download/community
echo.
echo Option 2: Use MongoDB Atlas (Cloud)
echo 1. Go to https://cloud.mongodb.com
echo 2. Create free account
echo 3. Create cluster
echo 4. Get connection string
echo 5. Update MONGODB_URI in .env file
echo.
echo Option 3: Use Docker
echo docker run -d -p 27017:27017 --name mongodb mongo:latest
echo.
pause