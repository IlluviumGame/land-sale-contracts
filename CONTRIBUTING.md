# Contribution Guide

Thank you for your interest in Illuvium, and your will to contribute to it and its ecosystem.
This document will help you with the guidelines, tips, and advises on how to contribute into the project(s).

The projects are hosted in the [Illuvium Organization](https://github.com/IlluviumGame/) on GitHub.
This guide is intended for both the Public/Community Contributors and Illuvium Core Contributors,
though the levels of access and processes may slightly differ between these types.
This will be noted where possible.

## Index

-  [Getting Started With Illuvium Smart Contracts](#getting-started-with-illuvium-smart-contracts)
-  [Reporting Issues](#reporting-issues)
-  [Contributing to the Source Code](#contributing-to-the-source-code)
   -  [Frameworks and Tooling Conventions](#frameworks-and-tooling-conventions)
   -  [Design Principles](#design-principles)
   -  [Pull Requests](#pull-requests)
   -  [Commit Policy and Code Review Guideline](#commit-policy-and-code-review-guideline)
   -  [Style Guides](#style-guides)
   -  [Audit Guide](#audit-guide)

## Getting Started with Illuvium Smart Contracts

Illuvium Smart Contracts are part of the collection of repositories under the
[Illuvium Organization](https://github.com/IlluviumGame/).
Some of these repositories are still private and used only by core contributors for active development,
while others have been open sourced and allow for the peer review and public contribution.
Blockchain layer contains the most crucial and security sensitive part of the business logic of the Illuvium protocol(s)
and its ecosystem. This includes digital assets (ERC20, ERC721, ERC1155 tokens),
DeFi protocols (staking, yield farming, vesting, etc.), and other components.

## Reporting Issues

Please open an issue in [JIRA](https://illuvium.atlassian.net/jira/) or [GitHub](https://github.com/IlluviumGame/)
if you find a bug or have a feature request.

Before submitting a bug report or feature request, double check and make sure it hasn't been submitted already.

The more detailed your report is, the faster it can be resolved.
If you report a bug, please provide steps to reproduce it and source code revision number where this bug reproduces.

## Contributing to the Source Code

If you would like to contribute to the code to fix a bug, add a new feature, enhance documentation,
or otherwise improve the project, pull requests are most welcome.

Any code is committed to `develop`, `main`, or `master` branches through pull requests.

The code should comply with [Style Guides](docs/style_guides.md), [Design Principles](#design-principles),
[Frameworks and Tooling Conventions](#frameworks-and-tooling-conventions).

Our pull request template contains a [checklist](docs/pull_request_template.md)
of acceptance criteria for your pull requests.
Please read it before you start contributing and make sure your contributions adhere to the checklist.

### Frameworks and Tooling Conventions

There are standard build and development frameworks, libraries, other tooling that has evolved across the smart contract
development community in order to facilitate interoperability and consistent development.

We require that EVM compatible smart contracts are written in Solidity programming language version 0.8.4 or higher,
smart contracts tests, deployment scripts, and other supporting scripts are written in ECMAScript 6 or TypeScript.

One of the following development frameworks should be used:

-  [Truffle Suite](https://trufflesuite.com/), including standalone Ganache EVM compatible test node
-  [Hardhat](https://hardhat.org/), including embedded Hardhat Network EVM compatible test node
-  [Foundry](https://github.com/foundry-rs/foundry), including local Anvil EVM compatible test node

The use of Hardhat is recommended, you may count on more core contributors support when you get into any hardhat-related
issues. Make sure you will be able to resolve such issues on your own if you choose Truffle or Foundry.

[web3.js](https://web3js.readthedocs.io/) or [ethers.js](https://docs.ethers.io/) Ethereum JSON-RPC client libraries
should be used for tests, deployment and other supporting scripts.
It is recommended to stick to only one of these libraries when possible.

When creating a new project its lead developer is free to choose any combination of the frameworks, libraries,
languages, and other tooling mentioned and not mentioned above.

When contributing to existing project one should stick to the frameworks, libraries, languages, and other tooling
which were already chosen for this project by its lead.

As a rule of thumb we try to keep project dependency tree (frameworks, libraries, and other tooling) small, importing
only the dependencies we have to use.

### Design Principles

Illuvium Smart Contracts are designed to follow industry best-practises for security and maintainability.

The protocol is built in the modular way where modules can be attached, detached, upgraded.

When designing a new module, one should consider the compromise between reusing already built, audited, deployed,
and time-tested code (always safer) versus the chances to implement a better, more efficient code (risky!).
A delicate balance between the two should be maintained:

- we don't want to take the unnecessary risks here, neither we don't want to reinvent the wheel;
- in the same time we're not afraid to propose our vision of how things can be done better, safer, more efficient;
- we realise that many protocols were developed fast, under time constraint pressure, some things may look
    like a wheel at a first glance, but turn out to be a rough log after looking more carefully (as an example,
    take a look into numerous ERC721 implementations, including the most famous and frequently used ones)
- we keep in mind the Illuvium ambition: everything Illuvium does targets an "AAA" quality grade, think about
    the decision you make from a "taking responsibility for" perspective, not from "avoiding responsibility for"
    perspective (ex.: "I take responsibility for reusing this ERC721 impl because it was audited 2 times,
    runs in the mainnet for 3 years, it has 10,000+ transaction interactions, its behaviour is fully predictable
    and easy to understand, while its gas inefficiencies are not important in our case since we expect 99.9%
    transactions to happen in L2")
 
Taking into account mentioned above, the following principles should be followed:

-  if same or similar module was already designed, built, and audited, we should reuse it in whole or in part
-  if we didn't design a similar module in the past (or if we have uncommon parts),
   -  we search for same or similar smart contract(s) in the third party protocols, learn from them,
      and design our own based on the take aways we get from the research and our own requirements
   -  we may use the third party smart contract(s) as is if it is audited by a respectful entity,
      if it passed our own internal audit, and we think we can't do better in the context of requirements we have
      and time constraints we have
-  third party smart contract libraries such as OpenZeppelin, or other protocols are a good source to learn from,
   they are not always a perfect source to use "as is" when it comes to gas efficiency and simplicity.

### Pull Requests

The pull request process has a number of goals:

-  Maintain the project quality and security levels
-  Allow users to fix problems or add features that they find beneficial
-  Engage the community in working toward the best possible code
-  Enable a sustainable system for Illuvium Core Contributors to review and facilitate public contributions

Please follow these steps to have your contribution considered by the maintainers:

1. Verify that your pull request contain only the changes related to the issue it solves;
   if you find the opposite, split it into separate pull requests, so that each of them
   corresponds to exactly one issue or feature
2. Make sure you follow the [Style Guides](docs/style_guides.md),
   [Design Principles](#design-principles),
   [Frameworks and Tooling Conventions](#frameworks-and-tooling-conventions), and
   [Commit Policy](docs/commit_policy.md)
3. Ensure that all existing tests pass, and that code coverage has not diminished
4. Write any new tests to cover your added functionality
   1. Test coverage must not be formal, but functional
   2. Pay attention to all possible corner cases, flowing from the requirements
   3. Don't hesitate to implement parameterized tests which are then run several times using different inputs
5. Check if deployment scripts, hardhat tasks, other supporting scripts, etc. require modifications, or if
   new scripts must be introduced to support the code and functionality added
6. Ensure the code submitted includes a comprehensive documentation
   1. Any Solidity contract should have a Soldoc header describing the purpose of the contract or module,
      its role and place in the overall architecture of the protocol
   2. Any Solidity contract function should have an appropriate Soldoc description:
      1. Public functions description should be written taking into account that these functions can be accessed
         not only by blockchain engineers, but also by less technical people
      2. All descriptions should clearly explain what function does, what are input and output parameters,
         what are valid and invalid corner cases, what is the function access policy
   3. Tests should have brief explanation in the file headers regarding what they apply to
   4. Tests should be minimalistic (1-2 lines of code per test) and self-explanatory:
      1. A failing test should point to the problem without a need to open and read test case code
      2. Self-explanatory test cases doesn't require additional documentation
   5. Check if root [README](README.md), or other documentation files require update(s)

The reviewer(s) may ask you to complete additional design work, tests, or other changes before your pull request can be
ultimately accepted.
Public submission of features may not always be approved if they do not align with the product goals of the Illuvium
team.

### Commit Policy and Code Review Guideline

This section describes in detail branch and commit naming, opening a pull request, reviewing it, merging, and other
topics related to the development workflow.

It is available as a separate document [Where and How to Commit Your Work](docs/commit_policy.md)

### Style Guides

This section describes in detail programming conventions, style, and best practices for writing code, tests, etc..

It is available as a separate document [Style Guides](docs/style_guides.md)

## Audit Guide

To ensure code quality is maintained, we ensure that there is an internal audit process for any project implemented
or smart contract introduced or modified.

Ideally, internal audit happens after the project is fully developed, when no significant smart contract changes are
expected to happen, right before the external audit is executed. 

Auditor must have no conflict of interest and should be able to perform the audit independently.

There should be an immutable (ex.: committed into github) audit trail that

- includes trace of audit findings, their severity, applicability, resolution and possibly re-audit
- covers the involved systems: discord, JIRA, github, etc.

The process applies only to internal audits, as external auditors will have their own process.

See also:
- [Introduction to Auditing and our smart contract audit process](https://extropy-io.medium.com/introduction-to-auditing-and-our-smart-contract-audit-process-fa7aed2d5d3d)
- [The Solcurity Security and Code Quality Standard](https://github.com/transmissions11/solcurity)

## About

Prepared by Matt Burgess and Basil Gorin

(c) 2020–2022 Illuvium [
[WWW](https://illuvium.io/)
| [Medium](https://illuvium.medium.com/)
| [Twitter](https://twitter.com/illuviumio)
| [Discord](https://discord.gg/T5pMyU8QtH)
]
