@echo off
REM Droplink Production Deployment Script for Windows

echo 🚀 Starting Droplink deployment process...

REM Build the application
echo 📦 Building application...
npm run build

if %errorlevel% neq 0 (
    echo ❌ Build failed! Please fix the errors before deploying.
    exit /b 1
)

echo ✅ Build successful!

REM Deploy to Vercel
echo 🌐 Deploying to Vercel...
npx vercel --prod

if %errorlevel% neq 0 (
    echo ❌ Deployment failed!
    exit /b 1
)

echo ✅ Deployment successful!
echo.
echo 🎉 Your Droplink app is now live!
echo.
echo 📋 Remember to:
echo    1. Set environment variables in Vercel dashboard
echo    2. Test public profile URLs: yourdomain.com/{username}
echo    3. Verify Pi Network integration works
echo    4. Check mobile responsiveness
echo.
echo 🔗 Public URL structure:
echo    - Dashboard: https://your-app.vercel.app/
echo    - Public Profiles: https://your-app.vercel.app/{username}
echo    - Authentication: https://your-app.vercel.app/auth

pause