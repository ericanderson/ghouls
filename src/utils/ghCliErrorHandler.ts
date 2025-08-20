import { ExecaSyncError } from "execa";
import { platform } from "os";

export interface GhCliError {
  type: "not-installed" | "not-authenticated" | "unknown";
  message: string;
  instructions?: string;
}

export function detectGhCliError(error: unknown): GhCliError | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  // Check if it's an ExecaSyncError
  const execaError = error as ExecaSyncError;

  // Check for gh not installed
  if (isGhNotInstalledError(execaError)) {
    return {
      type: "not-installed",
      message: "GitHub CLI (gh) is not installed.",
      instructions: getGhInstallationInstructions(),
    };
  }

  // Check for gh not authenticated
  if (isGhNotAuthenticatedError(execaError)) {
    return {
      type: "not-authenticated",
      message: "GitHub CLI is not authenticated.",
      instructions: getGhAuthenticationInstructions(),
    };
  }

  return null;
}

export function isGhNotInstalledError(error: ExecaSyncError): boolean {
  // Command not found typically returns exit code 127
  if (error.exitCode === 127) {
    return true;
  }

  // Check stderr for common "command not found" messages
  const stderr = typeof error.stderr === "string" ? error.stderr.toLowerCase() : "";
  if (
    stderr.includes("command not found")
    || stderr.includes("not found")
    || stderr.includes("cannot find")
  ) {
    return true;
  }

  // Check for ENOENT error (file not found)
  if ("code" in error && error.code === "ENOENT") {
    return true;
  }

  return false;
}

export function isGhNotAuthenticatedError(error: ExecaSyncError): boolean {
  const stderr = typeof error.stderr === "string" ? error.stderr : "";
  const stdout = typeof error.stdout === "string" ? error.stdout : "";
  const combined = `${stderr} ${stdout}`.toLowerCase();

  // Check for authentication-related messages
  if (
    combined.includes("gh auth login")
    || combined.includes("not authenticated")
    || combined.includes("no github token")
    || combined.includes("please authenticate")
    || combined.includes("to get started with github cli")
  ) {
    return true;
  }

  // gh auth token returns exit code 1 when not authenticated
  if (error.exitCode === 1 && error.command?.includes("gh auth token")) {
    return true;
  }

  return false;
}

export function getGhInstallationInstructions(): string {
  const currentPlatform = platform();
  let platformInstructions = "";

  switch (currentPlatform) {
    case "win32":
      platformInstructions = `To install GitHub CLI on Windows:

  Option 1: Using winget (recommended)
    winget install --id GitHub.cli

  Option 2: Using Chocolatey
    choco install gh

  Option 3: Download installer
    Visit https://cli.github.com/ and download the MSI installer`;
      break;

    case "darwin":
      platformInstructions = `To install GitHub CLI on macOS:

  Option 1: Using Homebrew (recommended)
    brew install gh

  Option 2: Using MacPorts
    sudo port install gh

  Option 3: Download installer
    Visit https://cli.github.com/ and download the pkg installer`;
      break;

    case "linux":
      // For Linux, we could try to detect the distribution, but for now we'll show the most common
      platformInstructions = `To install GitHub CLI on Linux:

  For Ubuntu/Debian:
    sudo apt install gh

  For Fedora/CentOS/RHEL:
    sudo dnf install gh

  For Arch Linux:
    sudo pacman -S github-cli

  For other distributions, see the README`;
      break;

    default:
      platformInstructions = `To install GitHub CLI on your platform, visit: https://cli.github.com/`;
  }

  return `Error: GitHub CLI (gh) is not installed.

${platformInstructions}

For installation instructions for other platforms, see:
https://github.com/ericanderson/ghouls#installing-github-cli

For more information, visit: https://cli.github.com/`;
}

export function getGhAuthenticationInstructions(): string {
  return `Error: GitHub CLI is not authenticated.

To authenticate with GitHub:
1. Run: gh auth login
2. Choose GitHub.com or GitHub Enterprise Server
3. Select your preferred authentication method:
   - Login with a web browser (recommended)
   - Paste an authentication token
4. Follow the prompts to complete authentication

For more details, see: https://cli.github.com/manual/gh_auth_login`;
}

export function formatGhCliError(error: GhCliError): string {
  if (error.instructions) {
    return error.instructions;
  }
  return error.message;
}
