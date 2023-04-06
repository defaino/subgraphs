const yaml = require("js-yaml");
const fs = require("fs");
const pkg = require("../package.json");
require("dotenv").config();

// config = {
//   "startBlock": 0,
//   "projectName": "",
//   "addresses": {
//     "DefiCore": "0x..."
//   }
// }

const vault = require("node-vault")({
  apiVersion: "v1",
  endpoint: process.env.VAULT_ENDPOINT,
  token: process.env.VAULT_TOKEN,
});

const subgraphConfig = "./subgraph.yaml";
const contract = "DefiCore";

function validateConfig(config) {
  if (!config.startBlock || isNaN(parseInt(config.startBlock))) {
    throw new Error(`Invalid start block`);
  }

  if (!config.addresses) {
    throw new Error(`Invalid addresses`);
  }

  if (config.addresses[0] != contract) {
    throw new Error(`Unknown contract ${config.addresses[0]}`);
  }

}

async function getConfig() {
  const responseBody = (await vault.read(process.env.VAULT_CONFIG_PATH)).data;
  const config = responseBody.data;

  validateConfig(config);

  const doc = yaml.load(fs.readFileSync(subgraphConfig, "utf8"));

  doc.dataSources[0].source.address = config.addresses[contract];
  doc.dataSources[0].source.startBlock = config.startBlock;


  fs.writeFileSync(subgraphConfig, yaml.dump(doc));

  pkg.scripts["create"] = pkg.scripts["create"].replace(
    "<liquidation-monitor>",
    config.projectName
  );
  pkg.scripts["deploy"] = pkg.scripts["deploy"].replace(
    "<liquidation-monitor>",
    config.projectName
  );
  pkg.scripts["remove"] = pkg.scripts["remove"].replace(
    "<liquidation-monitor>",
    config.projectName
  );

  fs.writeFileSync("./package.json", JSON.stringify(pkg));

  const GlobalsFilePath = "../src/entities/Globals.ts";

  let globalsFile = fs.readFileSync(GlobalsFilePath)

  let newContent = globalsFile.toString().replace('0x0000000000000000000000000000000000000000', config.addresses[contract]);

  fs.writeFileSync(GlobalsFilePath, newContent);
}

getConfig().then();
