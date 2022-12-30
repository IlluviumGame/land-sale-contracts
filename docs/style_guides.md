# Style Guides

A programming style guide is an opinionated guide of programming conventions, style, and best practices for a
team or project.

This section breaks into several subsections depending on the programming, scripting, and markup languages used.
When new language is added to the project, one should also add a corresponding style guide subsection to this section.

For each language we use, a style guide is based on one or more widely used style guides. When several reference
guides are used, we assume that the first one is a basic one, and next ones supplement it (contradicting rules
in the next ones are ignored).

There are always controversial rules leading to endless debates, these rules are more a matter of taste, than a
rational thing. One of the examples is a famous endless "tabs vs spaces debate".
For each style guide we maintain the list of these controversial rules together with overridden rules.

This is yet another element for encouraging people to lead a project.
You get a chance to demonstrate in practice how the rules you've chosen help the development, readability, maintainability, etc.

## JavaScript

JavaScript is a non-class based object oriented programming language that is one of the core technologies of the
World Wide Web.
JavaScript was developed in September 1995 by a Netscape programmer Brandan Eich.
It was originally named Mocha, but quickly became known as LiveScript and, later, JavaScript.

JavaScript's syntax and naming conventions are similar to Java, for example both languages use camelCase to name
functions and variables, PascalCase for class names, UPPER_CASE for constants.
JavaScript, however, is not so strict: programs using snake_case instead of camelCase can also be seen widely.

We use [Airbnb Javascript Style Guide](https://github.com/airbnb/javascript) as a base.
Following rules are considered contentious (to be extended) and/or are overridden:

- [Whitespace](https://github.com/airbnb/javascript#whitespace)
    - use of soft tabs (space character) set to 2 spaces (eslint: indent)
    - **no** spaces inside curly braces (eslint: object-curly-spacing: **"never"**)  
        **reason:** monospace fonts have already enough spare space in braces, commas, dots, etc.
        to make these symbols clearly distinguishable from the literals' symbols
    - characters per line limit (eslint: max-len): **120**
        **reason:**: most of the screens allow to easily see 120 characters in one line
- [Blocks](https://github.com/airbnb/javascript#blocks)
    - `else` statements in an `if-else` construct, as well as `catch` and `finally`,
    must be **on its own line** after the preceding closing brace (eslint: brace-style: **"stroustrup"**)
        **reason:** this makes `if-else` blocks better distinguishable when statements inside are very short
- [Naming Conventions](https://github.com/airbnb/javascript#naming-conventions)
    - camelCase naming for objects, functions, and instances (eslint: camelcase)

## TypeScript

TypeScript is a strongly typed programming language that builds on JavaScript, developed by Microsoft, published
in 2012.

TypeScript style guide inherits from [JavaScript](#javascript) and is enriched with
[Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html), which is used basically
to cover areas not covered in [Airbnb Javascript Style Guide](https://github.com/airbnb/javascript).

## Solidity

Solidity is an object-oriented programming language for implementing smart contracts.
Solidity was proposed in August 2014 by Dr. Gavin Wood.
As specified by Dr. Gavin Wood, Solidity is designed around the JavaScript syntax to make it familiar for existing web
developers.

Solidity inherits its syntax and naming conventions from JavaScript. Both languages use camelCase naming for
functions and variables, PascalCase for class names, UPPER_CASE for constants.

We use [Official Solidity Style Guide](https://docs.soliditylang.org/en/v0.8.16/style-guide.html) as a base,
enriched with [Official Java Code Conventions](https://www.oracle.com/technetwork/java/codeconventions-150003.pdf)
(for example, Official Solidity Guide misses ideas on interface naming).
Following rules are considered contentious and/or are overridden:

- Tabs or Spaces: spaces are the preferred indentation method
- `else` statements in an `if-else` construct must be **on its own line** after the preceding closing brace

Prefer `Interface` naming to Zeppelin's `IInterface` one.
Name the interface by answering the question "what it is?", based on functional requirements. A `Truck`.
Name the implementation contract by answering the question "how it works?", or "what it looks like?",
based on non-functional requirements. A `RedTruck`.
ERC standards like ERC20, ERC721, and others are effectively interfaces already and do not require an "I" prefix.

Bad:

```
interface IPriceOracle {
...
}
contract PriceOracle is IPriceOracle {
...
}
```

Good:

```
interface PriceOracle {
...
}
contract PriceOracleV1 is PriceOracle {
...
}
```

Bad:

```
interface IERC20 {
...
}
contract Token is IERC20 {
...
}
```

Good:

```
interface ERC20 {
...
}
contract Token is ERC20 {
...
}
```

## Markdown

Markdown is a lightweight markup language created by John Gruber and Aaron Swartz in 2004 with the goal to be
appealing to human readers in its source code form. Markdown was standardized in 2012-2016.

We use [Google Markdown Style Guide](https://google.github.io/styleguide/docguide/style.html) as a base,
enriched with [Matt Cone Markdown Style Guide](https://www.markdownguide.org/basic-syntax/).
Following rules are considered contentious and/or are overridden:

- [Trailing whitespace](https://google.github.io/styleguide/docguide/style.html#trailing-whitespace)
    / [Line Breaks Best Practices](https://www.markdownguide.org/basic-syntax/#line-break-best-practices):
    don't use the trailing backslash, use trailing whitespace and ensure .editorconfig has
    `trim_trailing_whitespace = false` for `*.md` files

## Automating Formatting Standards

The above standards can be more easily met by automating their implementation.
Many repositories will have a `.editorconfig` file, which tells editors how to interpret inputs, such as tab.
The EditorConfig file is read automatically by many IDEs, including WebStorm, IntellijIDEA and Visual Studio,
but is **not** picked up automatically by many even related tools including PHPStorm, Sublime, Eclipse,
and Visual Studio Code: a [supporting plugin](https://editorconfig.org/) should be used.
You should ensure your IDE setup supports these editor expectations.

Optionally you may additionally use Prettier or a similar formatter.
Prettier is an opinionated code formatter, which uses sensible defaults that can often (but not always)
be overridden in a `.prettierrc` file.
Prettier will also inspect `.editorconfig` files and use those settings as its defaults.
Note that Visual Studio Code includes Prettier formatter by default, and its Format command triggers it.
It can also be configured to trigger on-save.

Prettier should **not** be used on existing projects that already have an established standard.

Finally, a _linter_ such as eslint or solhint may be a good option to be used.
Linters dynamically inspect code and point out potential issues.
This can include style issues as above but also code quality issues like unused variables,
deprecated functions, unreachable code, etc.
Installing the solidity plugin for Visual Studio Code automatically installs a linter.

Note that the above tools can all be used together. EditorConfig works as you type, ensuring you meet standards,
Prettier formats your code after you write it, while linters highlight, but do not fix, potential quality issues.

## Testing Standards and Style Guidelines

Testing smart contracts is of critical importance. Tests are used to validate security requirements,
and to confirm behaviour to be as expected and intended.
Proper testing of any software is a difficult skill that takes a long time to learn. Here are some important guides.

**Unit testing** is intended to test a single, specific behaviour, such as a function.
In the context of smart contracts this typically means to execute a function and then check the resulting state
and events emitted.

Unit testing forms the vast majority of test cases and requires large numbers of simple tests,
with each test verifying a single aspect of behaviour.
It should be possible for any failed test to immediately identify the error.

Unit tests are often built in a way phrased as _arrange-act-assert_.
Arrange is the process to set up the contract to a suitable initial state.
Act is executing the desired function.
Assert is verifying the state changes occurred and events emitted.

Arrange steps **do not belong to the test function** and should be implemented as part of a `beforeEach` or similar
hook which sets up the state for all the tests.
Use `describe` blocks to separate test functionality that has different state setup.

It is vitally important that tests are not an afterthought, but a key part of the development deliverable.
This means that the test should cover not just "the behaviour", but edge cases, error handling, permission checking,
bounds-checking and other similar difficulties. "Happy path" testing is of minimal value.

Some important points on unit tests:

- Only test one thing at a time - do not run compound tests
- Each test must be independent
- Consider making utility functions for things like state setup to ensure simplicity and consistency
- Separate contracts by a file and only test one contract per file
- Separate functionality areas with `describe` blocks, and note you can nest these blocks for sub-functionality
- Tests should be as small as possible, ideally only one line, or a few lines
- You can append `.only` to a test case while implementing it, to isolate that one test (not to run the whole suite
    during the test development), though keep in mind that the entire suite must also work
- Do not add suite setup to `beforeEach`, as this will run before every test.
    For example, getting all the accounts from the provider can be implemented either as global function, or if
    using async mode - can be run in the `before` hook, which runs one single time.
- Ensure the test checks function execution constraints (contract state, function input params, access control), smart
    contract state change(s), event emission(s)
- Favour constants (or TypeScript enums) for testing values, as they can convey meaning and be reused as the
    assertion value

Many areas of functionality may also implement an end-to-end test, where multiple steps are undertaken in order
to ensure a cohesive and correct workflow.
These typically act as a "sanity check" to verify complex behaviours work as intended.
Such tests supplement, but do not replace, comprehensive unit tests.

Code Coverage reports can be generated with `npm run coverage`.
Reports show the coverage as a percentage of lines covered with tests.
It is important to ensure this is not reduced by your modifications.
It is also important the testing is not done **solely** to increase the test coverage percentage.
Instead, the code coverage outputs are used to highlight areas where tests are lacking.
The coverage reports generate output artifacts that show line-by-line where code is untested,
as well as summaries by files overall.

When beginning a new block of work you should ensure that you run the coverage report prior to starting
to ensure your changes do not lower the code coverage.

See also: [Gitlab Testing Standards](https://docs.gitlab.com/ee/development/testing_guide/)

## References
1. Srđan Popić, Gordana Velikić at al.
    The Benefits of the Coding Standards Enforcement and it's Influence on the
    Developers' Coding Behaviour: A Case Study on Two Small Projects
2. [Coding standards: what are they, and why do you need
    them](https://blog.codacy.com/coding-standards-what-are-they-and-why-do-you-need-them/)

## About

Prepared by Matt Burgess and Basil Gorin

(c) 2020–2022 Illuvium [
[WWW](https://illuvium.io/)
| [Medium](https://illuvium.medium.com/)
| [Twitter](https://twitter.com/illuviumio)
| [Discord](https://discord.gg/T5pMyU8QtH)
]
