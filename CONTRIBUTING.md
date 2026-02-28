# Contributing to Zer0-Rank

Thanks for your interest! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/YOUR_USERNAME/zer0-rank-java
cd zer0-rank-java
mvn clean package -DskipTests
java -jar target/zer0-rank-1.0.0.jar
```

## Project Structure

- `src/` — Java Spring Boot backend
- `jellyfin-inject/custom.js` — Frontend (injected into Jellyfin)
- `src/main/resources/static/index.html` — Standalone fallback dashboard

## Pull Requests

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Test that the backend compiles: `mvn clean package -DskipTests`
5. Test that `custom.js` works in Jellyfin
6. Open a PR with a clear description

## Reporting Bugs

Please include:
- Your OS and Jellyfin version
- Java version (`java -version`)
- The error from the browser console or backend logs
- Steps to reproduce
