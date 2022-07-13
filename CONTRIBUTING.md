# Contributing to Illuvium

Thank you for showing the interest in Illuvium to want to contribute to the Solidity Smart Contracts used within the Illuvium game and ecosystem.

The following is a set of guidelines for contributing to Illuvium Smart Contracts, which are hosted in the [Illuvium Organization](https://github.com/illuviumgame) on GitHub. This Contributing Guide is intended for both the public and Illuvium Core Contributors, and some levels of access and processes may slightly differ between these types. This will be noted where possible.

#### Table Of Contents

[Styleguides](#styleguides)

- [Git Commit Messages](#git-commit-messages)
- [JavaScript Styleguide](#javascript-styleguide)
- [Solidity Styleguide](#specs-styleguide)
- [Documentation Styleguide](#documentation-styleguide)

- [Issue and Pull Request Labels](#issue-and-pull-request-labels)

## Getting Started with Illuvium Smart Contracts

The Illuvium Smart Contract code is part of a collection of repositories under the [Illuvium Organization](https://github.com/illuviumgame). Some of these repositories are private and intended only for core contributors, while others have been open sourced and allow public contribution and review. The Smart Contracts inform much of the business logic and security model of the Illuvium game and its ecosystem, including DeFi protocols, item ownership, and resource access.

### Technology Conventions

There are standard build and development tooling that has evolved across the smart contract collection in order to facilitate interoperability and consistent development. These tools are typically required in order to run contract test harnesses and maintain code styles.

Solidity - Smart Contracts are written in the Solidity programming language, compiled to bytecode for execution
Hardhat - Used as a development blockchain and test solution
Visual Studio Code (optional) - A popular choice for editor and

### Design Decisions

The Smart Contracts written by Illuvium are designed to follow industry best-practises for security and maintainability. Many design decisions are "outsourced", such as the implementation of OpenZeppelin standards for common token requirements, and the use of Solidity's official code standards.

#### Local development

Setting up code for local development is documented clearly in the [README.md file](README.md). The core environment needed is one capable of running a NodeJS runtime, with npm support. We recommend running the latest Active Long Term Support (LTS) version, as compatibility with non-LTS currrent or pending versions is not guaranteed. The current Active LTS version is v16. You can manage and switch versions using [Node Version Manager](https://github.com/nvm-sh/nvm) if required.

### Pull Requests

The pull request process has a number of complementary goals:

- Maintain the Illuvium Smart Contracts' quality and security
- Allow users to fix problems or add features that they find beneficial
- Engage the community in working toward the best possible Illuvium code
- Enable a sustainable system for Illuvium Core Contributors to review and facilitate public contributions.

Please follow these steps to have your contribution considered by the maintainers:

1. Follow the [styleguides](#styleguides)
2. Ensure that all tests pass, and that code coverage (if available) has not diminished
3. Write any new tests to cover your added functionality
4. Ensure code submitted includes comprehensive documentation such as SolDoc
5. After you submit your pull request, verify that all [status checks](https://help.github.com/articles/about-status-checks/) are passing <details><summary>What if the status checks are failing?</summary>If a status check is failing, and you believe that the failure is unrelated to your change, please leave a comment on the pull request explaining why you believe the failure is unrelated. A maintainer will re-run the status check for you. If we conclude that the failure was a false positive, then we will open an issue to track that problem with our status check suite.</details>

While the prerequisites above must be satisfied prior to having your pull request reviewed, the reviewer(s) may ask you to complete additional design work, tests, or other changes before your pull request can be ultimately accepted. Public submission of features may not always be approved if they do not align with the product goals of the Illuvium team.

## Styleguides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line
- Consider starting the commit message with an applicable emoji

### JavaScript Styleguide

All JavaScript code is to be formatted with [Prettier](https://prettier.io/) using default standards for formatting. For JavaScript syntax and pattern preferences see the [Airbnb Javascript Style Guide](https://github.com/airbnb/javascript).

- Prefer modern ES6+ syntax over older constructs
- Prefer async/await for asynchronous code instead of `.then`
- Use array methods instead of manual iteration
- Minimise use of temporary variables
- Place requires or imports in the following order:
  - Built in Node Modules (such as `path` or `file`)
  - Imported Dependency modules, such as
  - Local Modules (using relative paths)

### Tests Styleguide

- Soldity is typically tested with a suite based on [Mocha](https://mochajs.org/)
- Tests should not be
- Tests are found in the `/test` directory
- Treat `describe` as a noun or situation.
- Treat `it` as a statement about state or how an operation changes state.

### Documentation Styleguide

- All functions, properties and contracts must be documented with SolDoc
- Document parameters, returns and use @dev to document the intent and mechanics
