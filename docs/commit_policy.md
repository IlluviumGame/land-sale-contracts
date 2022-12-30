# Where and How to Commit Your Work

## Branches

- The code in the `develop` and `master` branches should always compile and pass all tests
- Issue branches. Naming scheme: `<username>/<issue-id>_<brief_description>`
    - Username should be GitHub user name;
    if you are well-known under a different nickname, using that nickname is acceptable
    - Use JIRA issue id with dash in `issue-id`
    - Use lowercase letters and underscores in `brief_description`
    - Make sure the description is really brief but clear enough so that it is easy to understand what the issue is
    about without looking it up in the issue tracker (assuming you are familiar with existing issues)
    - Example:
        - `vgorin/LD-508_contribution_guide`

## Commit Messages

- Follow [this guide](https://chris.beams.io/posts/git-commit/).
- First line should not end with a dot and should not exceed 100 characters in length
- Prefix the subject line with the ID of the relevant issue
- There should be an empty line between the caption and body if body present
- There may be (sequentially single) an empty line in the body
- First line, and each line after newline should be Capitalized
- Commit message body should contain a paragraph stating the problem ("Problem: ...") solved,
    and then the description of the proposed solution ("Solution: ...").
- Message body may contain lists prefixed with ' - ' or ' * '
- Example is provided below:

```
LD-508: Add style guide sections to the Contribution Guide

Problem: there are no JavaScript, Solidity, TypeScript, Markdown style guide sections in CONTRIBUTING.md

Solution: document the sections required

```

## Commit History

Ideal commit history should satisfy the following criteria:

- Each commit should be a minimal and accurate answer to exactly one identified and agreed problem
- Each commit should not fix a problem introduced by an earlier commit in your pull request (PR)
    or revert an earlier commit in the PR
- Your pull request generally shouldn't contain changes unrelated to the issue it solves;
    if you modify some file and see an obvious small mistake there (a typo or wrong formatting),
    you can fix it in your PR and add a description to the commit message

During the pull request review process, your commit history doesn't have to satisfy these criteria
What happened in PR stays in PR, but after PR is completed and merged, commit history must follow the criteria above.
All fixup commits should be merged into their origins.

See the Git hints section in the end of this doc if you have troubles making your history pretty.

All commits should be signed.
For more details please see [Signing commits](https://help.github.com/articles/signing-commits/).

All the commits should be done with `@illuvium.io` email.

## Pull Request - Issue Relation

Each pull request should resolve exactly one issue and each issue should be resolved by exactly one PR.
Don't start working on more than one issue at once. There are legitimate cases when it doesn't hold though:

1. If someone (say Alice) needs to work on the issue which depends on or overlaps with your ongoing work,
    you can create a PR for your work before you fully finish it and this PR can be merged as long as it doesn't break
    anything. In this case Alice won't have to start her work from your issue branch.
    However, if you are not confident your intermediate changes are stable (won't have to be redone)
    it's better to have Alice start her work from your issue branch to avoid mess in the target branch,
    creating a PR to your branch instead of the `develop` or `master`.
2. Sometimes you may resolve issue A, while you are working on issue B,
    simply because your solution for B also resolves A.
    A doesn't duplicate B and solution for them wasn't known in advance, it just happened so.
    In this case your PR can refer to more than one issue.
    It's a rare case though, usually it's clear whether resolving B will also resolve A,
    so if it's the case then A can be closed in advance.

Both cases are rare, so generally there should be 1-to-1 correspondence between issues and pull requests.

### Pull Request Size

Try to avoid big PRs. The bigger your PR is, the harder it is to review it.
Some mistakes can be unnoticed, some minor concerns may be unreported simply because reviewer already reported
too many of them and got tired.
It's mentally hard to start reviewing a PR when you see that it's very big.
If your PR is big, but contains many commits which are small, it's still not perfect:
When reviewing on per-commit basis, if several commits require changes, tracking these changes becomes hard.

If you notice that your PR is quite big, please think whether the issue you are solving can be split into smaller ones.
If so please create smaller issues as sub tasks for your issue and create smaller PRs for each one.

There is no universal limit on PR size, sometimes even very large one is fine if it can't be split into smaller PRs
or if such split doesn't make sense.
If your PR has more than 500 additions + deletions, please think twice whether it can be split into smaller PRs.

## Opening a Pull Request

1. PR title should adhere to the following scheme: `[ISSUE-ID]: Brief Description`.
2. PR description cannot be empty. If there is a PR template, the description should adhere to the template.
    If there is no template, please describe the changes you've made and **why** you've made them.
    Provide links to related issues.
3. Request a review from one person you think would be the most suitable as a reviewer
    (e.g. because you think they might be interested in your change or because they touched this code previously).
    - If you *really* want to, request a review from one other person.
    - If your changes are very simple, requesting a review from only **one person** is acceptable.
    - Keep in mind that review might be automatically requested from code owners when you actually create a PR.
        Make sure to review list of reviewers after pressing the `Create pull request` button.
4. If PR is about work in progress (WIP), `WIP: ` prefix shall be added to the PR title. 

## Working on the Issue

1. Before you start working on the new issue, make sure  you have made all requested changes in all your open PRs.
2. Starting from HEAD of the `develop` (`master`) branch, create a new *issue branch*. Please note:
    - Some issues may require starting from a specific branch instead of `develop`.
    - If the description of an issue doesn't specify target branch, and you suspect it may differ from `develop`,
        clarify this in the issue's comments.
    - Sometimes you may work on an issue which depends on the PR which is not yet merged.
        In this case you need to start your branch from another issue branch.
        Make sure first the code in that MR is sufficiently stable so that you won't have to redo much work.
3. Make your changes.
4. Open a pull request.
5. Wait for reviews to arrive.
    If people whose review was requested do not review your PR, explicitly ask them to review it.
    In case when they don't react for too long (let's say one working day),
    contact the repository maintainer, or a team lead
    (if there is a dedicated team working on the contents of the repository).
    If you are not an Illuvium Core Contributor and don't know whom to ask,
    write about it to the most active contributors of the repository.
6. Make sure to synchronize your issue branch with the target branch of your PR sometimes to avoid excessive conflicts.
    How often you should do it depends on speed of development in the target branch.
    You should do it by rebasing your branch on the target branch.
    It's acceptable to merge target branch into your branch only if rebase takes significantly more time
    (which should be the case only for big PRs with long commit history).
    In this case, please perform interactive rebase and prettify your history prior to merging,
    because doing so after merge can be much harder.
7. If there are comments on your PR that need to be addressed, make the changes, push them and notify people who
    requested the changes.
8. Make requested changes in separate commits, don't amend previous commits and don't force push.
    At this point your commit history may fail the criteria listed above which is fine.
    Clean-up commit history after all reviewers approve your PR (by force-pushing).
    Force-push is permitted only if you push the same commits rebased on a newer version of the target branch.
    - The exception is the case from item (6) when you merge target branch into your branch.
        These cases should be rare.
        In such cases please use your best judgement to avoid complicating review of the changes requested by reviewers.
9. By default, you can assume that nobody except you will work in your branch, so you can feel free to force-push.
    However, if you know there is someone else working in your branch, don't force-push without getting an approval
    from your colleague. **Always** use the `--force-with-lease` option when you force-push.

## Merging a Pull Request

If all the reviewers approved the pull request and all mandatory checks have passed,
it's time to merge the pull request.
Before merging, please check whether commit history satisfies the criteria listed above,
because approval generally implies that reviewer is satisfied with code changes,
but doesn't necessarily imply a good commit history.
If commit history needs to be modified, the PR author has to do it.

A PR can be merged by its author or by one of the reviewers.

1. It's usually better to let the PR author to merge their PR to give them a chance to polish commit history
    before merging.
2. Since it may take some time for the PR author to merge their PR and since the sooner a good PR is merged, the better,
    the reviewer can merge the PR instead.
    The reviewer needs to make sure the PR author doesn't wish to do anything with the commit history.
    For example, if a PR is a trivial one-liner, this should be obvious. Do not merge if you are not sure.

GitHub offers three options to merge a PR:

1. Create a merge commit.
2. Squash and merge.
3. Rebase and merge.

Always use the first option to preserve PR's commit history.

Note that all fixup commits shall be squashed into origins before the merge.

## Git Hints

- Here you may find some useful git commands and command line options to comply with our workflow.
    This information is mostly for beginners, experienced git users should be familiar with most of it.
    It's not a descriptive guide, just a list of things you should be aware of.
    Detailed descriptions can be found in man pages.
    - To synchronize your issue branch with the target branch by means of rebase,
        checkout to your branch, do `git fetch` and then `git rebase origin/<target>`
        where `<target>` is usually `develop`. You may have to resolve conflicts.
    - The above works only if there were no force-pushes in the target branch.
        If your target branch is an issue branch, there can be force-pushes.
        This branch can be merged to its target branch and then you'll need to rebase on another target branch.
        In such case pass `--onto <newbase>` flag to `git rebase`.
        `<newbase>` should be a commit on top of which your commits will be reapplied.
        Normally it is HEAD of your target branch.
    - If you have dirty commit history in your branch and want to make it look better,
        interactive rebase is your best friend.
        Pass `-i` flag to the `git rebase` command.
        It allows you to squash commits, reorder them, split into smaller commits, amend old commits, etc.
    - If you want to add only a subset of changes of a file, you can pass `-p` flag to the `git add` command.
    - If you are making changes requested on your pull request, and these changes fix something introduced by
        your previous commit in the same PR, use `--fixup` option of `git commit`.
    - If you need to force push, always use `--force-with-lease` flag instead of `-f`.
        This option is safer, because it checks that remote branch is in the state you expect.
        Consider creating a shell alias if you find it tedious to type this flag.
