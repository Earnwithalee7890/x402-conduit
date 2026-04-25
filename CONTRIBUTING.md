# Contributing to Conduit

We welcome contributions! Conduit is an open-source project building the future of AI-native API marketplaces on Stacks.

## Getting Started

1. **Fork the repo** and clone it locally.
2. **Install dependencies**: `npm install`.
3. **Run the development server**: `npm run dev`.

## Smart Contract Integration

Our contracts are written in Clarity. To contribute new contracts:

1. Add your `.clar` file to `contracts/`.
2. Ensure you follow Clarity best practices.
3. Add a corresponding test file if possible.

## Frontend Development

The frontend is built using standard web technologies with a custom design system in `public/css/styles.css`.
Please maintain the **Premium Dark Mode** aesthetic.

- Use CSS variables for colors (e.g. `var(--stx-purple)`).
- Ensure responsiveness on mobile devices.
- Test wallet connections using the Leather or Xverse wallets.

## Commit Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

Example: `feat(api): add new weather oracle endpoint`

## Pull Request Process

1. Create a feature branch: `git checkout -b feature/amazing-feature`.
2. Commit your changes using conventional commit messages.
3. Push to the branch.
4. Open a Pull Request with a clear description of the changes.
5. Ensure all CI checks pass.

## License

This project is licensed under the MIT License.
