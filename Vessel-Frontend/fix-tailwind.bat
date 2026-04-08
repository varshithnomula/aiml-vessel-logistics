@echo off
echo Cleaning old dependencies...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
if exist .next rmdir /s /q .next

echo.
echo Installing dependencies with Tailwind v3...
call npm install

echo.
echo Done! Now run: npm run dev

