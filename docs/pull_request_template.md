<!--
Specify the issued ID and title (ex.: LD-739: Create a Pull Request Template)
Describe the problem in your own words or as it is described in JIRA
Describe the proposed solution
-->

JIRA-issue-ID: JIRA Issue Title

Problem:

Solution:

# Checklist for a Pull Request

<!--
Ideally a PR has all the checkmarks set.

If something in this list is irrelevant to your PR, you should still set this
checkmark indicating that you are sure it is dealt with (be that by irrelevance).

If you don't set a checkmark (e.g. don't add a test for new functionality),
you must be able to justify that.
-->

## Related Changes (Conditional)

- Tests
  - [ ] I've added tests covering new functionality or there is a follow-up issue to create the tests
  - [ ] I've added a regression test to prevent the bug I've fixed from silently reappearing again

- Documentation
  - I've checked whether I should update the docs and did so if necessary:
    - [ ] [README](../README.md)
    - [ ] SolDoc

## Style Guide (Mandatory)

- [ ] My commits comply with [commit policy](./commit_policy.md).
- [ ] My code complies with the [style guides](./style_guides.md).
- [ ] Code of repository compiles and tests pass, i.e. `npx hardhat test` execute successfully.
