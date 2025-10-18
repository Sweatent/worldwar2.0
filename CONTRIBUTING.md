# Contributing to World War 2.0

Thank you for your interest in contributing to World War 2.0!

## Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Make your changes
4. Run tests and linting (`pnpm lint && pnpm test`)
5. Commit your changes using conventional commits
6. Push to your fork
7. Open a pull request

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>: <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Maintenance tasks
- `perf`: Performance improvements

### Examples

```
feat: add player authentication system

fix: resolve WebSocket reconnection issue

docs: update API documentation for game rooms
```

## Code Style

- Use TypeScript for all code
- Follow ESLint and Prettier configurations
- Write meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

## Testing

- Write unit tests for new features
- Ensure all tests pass before submitting PR
- Aim for high code coverage

## Questions?

Feel free to open an issue for any questions or concerns!
