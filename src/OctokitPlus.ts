import { Octokit } from "@octokit/rest";

export interface PullRequestReference {
  label: string;
  ref: string;
  sha: string;
  repo: Repo | null;
}

export interface Repo {
  owner: User;
  name: string;
  fork: boolean;
}

export interface User {
  login: string;
}

export interface ReferenceObject {
  sha: string;
  type: string;
  url: string;
}

export interface Reference {
  ref: string;
  url: string;
  object: ReferenceObject;
}

export interface PullRequest {
  id: number;
  number: number;
  user: any;
  state: string;
  head: PullRequestReference;
  base: PullRequestReference;
  merge_commit_sha: string | null;
  merged_at?: string | null;
  title?: string;
}

function convert404(e: any) {
  if (e.name === "HttpError" && e.code === 404) {
    // This is an expected error for when a ref doesnt exist. A-OK
    return undefined;
  }
  throw e;
}

export class OctokitPlus {
  constructor(public readonly octokit: Octokit) {}

  public async getReference(prRef: PullRequestReference) {
    if (!prRef.repo) {
      throw new Error("No repo!");
    }

    const ref = await this.octokit.rest.git
      .getRef({
        repo: prRef.repo.name,
        owner: prRef.repo.owner.login,
        ref: `heads/${prRef.ref}`
      })
      .catch(convert404);

    // if you ask for a reference and it doesnt exist but does exist as a prefix to other references
    // then github gives you an array of other references, that we dont care about
    if (!ref || Array.isArray(ref.data)) {
      return undefined;
    }
    return ref.data as Reference;
  }

  public async deleteReference(prRef: PullRequestReference) {
    if (!prRef.repo) {
      throw new Error("No repo!");
    }
    return this.octokit.rest.git.deleteRef({
      owner: prRef.repo.owner.login,
      repo: prRef.repo.name,
      ref: `heads/${prRef.ref}`
    });
  }

  public async *getPullRequests(opts: Parameters<typeof this.octokit.rest.pulls.list>[0]) {
    for await (const { data: pullRequests } of this.octokit.paginate.iterator(
      this.octokit.rest.pulls.list,
      opts
    )) {
      for (const pr of pullRequests) {
        yield pr as PullRequest;
      }
    }
  }
}

