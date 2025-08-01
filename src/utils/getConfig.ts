import convict from "convict";
import untildify from "untildify";
import { existsSync } from "fs";
import { getGhToken } from "./getGhToken.js";
import { getGhUsername } from "./getGhUsername.js";
import { getGhBaseUrl } from "./getGhBaseUrl.js";

const TOKEN = "token";
const USERNAME = "username";
const BASE_URL = "baseUrl";

export interface Config {
  [USERNAME]?: string;
  [TOKEN]?: string;
  [BASE_URL]?: string;
}

export function getConfig(configFile = "~/.config/ghouls.config.json"): Config {
  const config = convict({
    [TOKEN]: {
      doc: "github oauth key",
      default: ""
    },
    [USERNAME]: {
      doc: "github username",
      default: ""
    },
    [BASE_URL]: {
      doc: "github api baseurl",
      default: ""
    }
  });

  // Try to load config file if it exists
  const configPath = untildify(configFile);
  if (existsSync(configPath)) {
    config.loadFile(configPath);
    config.validate({ allowed: "strict" });
  }

  const configProperties = config.getProperties() as Config;

  // Fill in missing values from gh CLI
  if (!configProperties.token) {
    configProperties.token = getGhToken() || undefined;
  }

  if (!configProperties.username) {
    configProperties.username = getGhUsername() || undefined;
  }

  if (!configProperties.baseUrl) {
    configProperties.baseUrl = getGhBaseUrl();
  }

  return configProperties;
}
