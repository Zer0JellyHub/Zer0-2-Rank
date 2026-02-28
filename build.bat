@echo off
echo ==========================================
echo   Zer0-Rank -- Build ^& Package
echo ==========================================

where java >nul 2>&1 || (echo ERROR: Java not found. Install Java 17+ & exit /b 1)
where mvn  >nul 2>&1 || (echo ERROR: Maven not found. Install Maven 3.8+    & exit /b 1)

echo Building fat JAR...
mvn clean package -DskipTests

echo.
echo ==========================================
echo   BUILD SUCCESSFUL!
echo   Output: target\zer0-rank-1.0.0.jar
echo ==========================================
echo.
echo Run with:
echo   java -jar target\zer0-rank-1.0.0.jar
echo.
echo Then open: http://localhost:8765
pause
