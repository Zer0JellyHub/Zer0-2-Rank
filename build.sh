#!/bin/bash
# ================================================================
# Zer0-Rank Build Script
# Requires: Java 17+ and Maven 3.8+
# Usage: bash build.sh
# ================================================================
set -e

echo "=========================================="
echo "  Zer0-Rank – Build & Package"
echo "=========================================="

# Check Java
java_ver=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d. -f1)
if [ "$java_ver" -lt 17 ] 2>/dev/null; then
    echo "ERROR: Java 17+ required (found: $java_ver)"
    exit 1
fi
echo "Java OK: $(java -version 2>&1 | head -1)"

# Check Maven
if ! command -v mvn &> /dev/null; then
    echo "ERROR: Maven not found. Install with: apt install maven"
    exit 1
fi
echo "Maven OK: $(mvn -version 2>&1 | head -1)"

echo ""
echo "Building fat JAR..."
mvn clean package -DskipTests -q

echo ""
echo "=========================================="
echo "  BUILD SUCCESSFUL!"
echo "  Output: target/zer0-rank-1.0.0.jar"
echo "=========================================="
echo ""
echo "Run with:"
echo "  java -jar target/zer0-rank-1.0.0.jar"
echo ""
echo "Then open: http://localhost:8765"
echo ""
echo "IMPORTANT: Edit application.properties first!"
echo "  - Set zer0rank.jellyfin-api-key"
echo "  - Set zer0rank.playback.db-path"
