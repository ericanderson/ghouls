import { PullRequestReference } from "../OctokitPlus";

export function ownerAndRepoMatch(
  a: PullRequestReference,
  b: PullRequestReference
) {
  return (
    a.repo &&
    b.repo &&
    a.repo.owner.login === b.repo.owner.login &&
    a.repo.name === b.repo.name
  );
}
