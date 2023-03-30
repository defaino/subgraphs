const yaml = require("js-yaml");
const fs = require("fs");
const pkg = require("../package.json");
require("dotenv").config();

const vault = require("node-vault")({
  apiVersion: "v1",
  endpoint: process.env.VAULT_ENDPOINT,
  token: process.env.VAULT_TOKEN,
});

const subgraphConfig = "./subgraph.yaml";
const contracts = [
  "DefiCore",
];

function validateConfig(config) {
  if (!config.startBlock || isNaN(parseInt(config.startBlock))) {
    throw new Error(`Invalid start block`);
  }

  if (!config.addresses) {
    throw new Error(`Invalid addresses`);
  }

  for (const contractName in config.addresses) {
    if (!contracts.includes(contractName)) {
      throw new Error(`Unknown contract ${contractName}`);
    }
  }
}

async function getConfig() {
  const responseBody = (await vault.read(process.env.VAULT_CONFIG_PATH)).data;
  const config = responseBody.data;

  validateConfig(config);

  const doc = yaml.load(fs.readFileSync(subgraphConfig, "utf8"));

  for (const contractName in config.addresses) {
    const index = doc.dataSources.findIndex((val) => val.name === contractName);

    doc.dataSources[index].source.address = config.addresses[contractName];
    doc.dataSources[index].source.startBlock = config.startBlock;
  }

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

  let globalsFile = fs.readFileSync("./src/entities/Globals.ts")

  let newContent = globalsFile.toString().replace('"0x0000000000000000000000000000000000000000"', config.addresses[contractName]);

  fs.writeFileSync(newContent);
}

getConfig().then();
