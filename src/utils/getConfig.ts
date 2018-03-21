import convict from "convict";
import untildify from "untildify";

const TOKEN = "token";
const USERNAME = "username";
const BASE_URL = "baseUrl";

export interface Config {
  [USERNAME]: string;
  [TOKEN]: string;
  [BASE_URL]: string;
}

export function getConfig(configFile = "~/.config/ghouls.config.json") {
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
  config.loadFile(untildify(configFile));
  config.validate({ allowed: "strict" });

  return config.getProperties() as Config;
}
