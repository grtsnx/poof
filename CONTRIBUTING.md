# Contributing to testMail

Thank you for your interest in contributing to testMail. This document provides guidelines for contributing.

## Getting Started

1. **Fork and clone** the repository.
2. **Install dependencies:**

   ```bash
   bun install
   ```

3. **Run the development server:**

   ```bash
   bun run dev
   ```

## Development

- **Lint:** `bun run lint`
- **Format:** `bun run format`
- **Type check:** `bun run typecheck`

Please ensure these pass before submitting a pull request.

## Pull Request Process

1. Create a branch from `main` for your change (e.g. `fix/email-preview`, `feat/dark-mode`).
2. Make your changes and add or update tests if applicable.
3. Run `bun run lint`, `bun run format`, and `bun run typecheck`.
4. Push your branch and open a pull request against `main`.
5. Describe your changes clearly in the PR description and link any related issues.
6. Address review feedback if requested.

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
