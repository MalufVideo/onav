# Agent Development Guidelines

## Commands
**Development Server**: `npm start` or `npm run dev` - Runs Express server on port 3000
**Build**: `npm run build` - No build step required (static files served directly)
**Testing**: No automated test suite - Manual testing via browser/curl to API endpoints
**Single Test**: Not applicable (manual testing only)

## Code Style Guidelines
- **Import/Export**: Use CommonJS `require()` syntax (Node.js style)
- **Formatting**: No automatic formatter configured - maintain consistent 2-space indentation
- **Types**: JavaScript only (no TypeScript configuration found)
- **Naming**: Use camelCase for variables/functions, PascalCase for constructors
- **Error Handling**: Always validate environment variables, exit gracefully on critical errors
- **Security**: Store secrets in environment variables, never commit `.env` files
- **Dependencies**: Node >= 18.0.0 required
- **Architecture**: Backend: Express server (server.js ~3000 lines), Frontend: Vanilla JS/CSS/HTML