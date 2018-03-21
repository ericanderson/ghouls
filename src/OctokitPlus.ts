import Octokit from "@octokit/rest";

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

    const ref = await this.octokit.gitdata
      .getReference({
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
    return this.octokit.gitdata.deleteReference({
      owner: prRef.repo.owner.login,
      repo: prRef.repo.name,
      ref: `heads/${prRef.ref}`
    });
  }

  public getPullRequests(opts: Octokit.PullRequestsGetAllParams) {
    return createAsyncIterator<PullRequest>(
      this.octokit,
      this.octokit.pullRequests.getAll(opts)
    );
  }
}

export async function* createAsyncIterator<T>(
  octokit: Octokit,
  respPromise: Promise<Octokit.AnyResponse>
) {
  let response = await respPromise;
  for (const x of response.data) {
    yield x as T;
  }

  while (octokit.hasNextPage(response)) {
    response = await octokit.getNextPage(response);
    for (const x of response.data) {
      yield x as T;
    }
  }
}
