# Contributing to Console.web

Thank you for your interest in contributing to Console.web! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

Before creating a bug report, please check if the issue already exists. When creating a bug report, include:

- **Clear title** describing the issue
- **Steps to reproduce** the behavior
- **Expected behavior** vs what actually happened
- **Screenshots** if applicable
- **Environment details**: OS, Node.js version, browser

### Suggesting Features

Feature suggestions are welcome! Please:

- Check if the feature is already on the [roadmap](docs/ROADMAP.md)
- Provide a clear use case
- Describe the expected behavior
- Consider the scope and complexity

### Pull Requests

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create a branch** for your changes: `git checkout -b feature/your-feature-name`
4. **Make your changes** following our code style
5. **Test** your changes thoroughly
6. **Commit** with clear, descriptive messages
7. **Push** to your fork
8. **Open a Pull Request** against `main`

## Development Setup

```bash
# Clone the repository
git clone https://github.com/thornburywn/console-web.git
cd console-web

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Set up database
npx prisma db push
npx prisma generate

# Start development server
npm run dev
```

## Code Style

### General Guidelines

- Use TypeScript strict mode where applicable
- Follow existing code patterns in the codebase
- Write meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and small

### JavaScript/React

- Use functional components with hooks
- Use `const`/`let`, never `var`
- Use async/await over raw promises
- Destructure props and state

### Commit Messages

Follow conventional commits:

```
type(scope): description

feat(terminal): add paste deduplication
fix(docker): resolve container restart issue
docs(readme): update installation steps
refactor(api): simplify route handlers
test(auth): add authentication tests
chore(deps): update dependencies
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `style`, `perf`

### Testing

- Write tests for new features
- Ensure existing tests pass
- Test edge cases and error conditions

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Project Structure

```
console-web/
├── server/           # Backend Express server
│   ├── index.js      # Main server file
│   ├── routes/       # API route handlers
│   ├── services/     # Business logic
│   └── middleware/   # Express middleware
├── src/              # Frontend React app
│   ├── App.jsx       # Main React component
│   ├── components/   # React components
│   └── hooks/        # Custom React hooks
├── prisma/           # Database schema
├── docs/             # Documentation
└── templates/        # Project templates
```

## Areas for Contribution

### Good First Issues

Look for issues labeled `good-first-issue` for beginner-friendly tasks.

### Priority Areas

- Voice command improvements (P0)
- Aider integration (P1)
- Documentation improvements
- Test coverage
- Accessibility improvements
- Performance optimizations

## Getting Help

- Check existing [documentation](docs/)
- Search [existing issues](https://github.com/thornburywn/console-web/issues)
- Open a new issue for questions

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Thank you for contributing to Console.web!
