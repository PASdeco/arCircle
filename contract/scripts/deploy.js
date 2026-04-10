const hre = require("hardhat");

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

async function main() {
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  console.log("Deploying with:", deployer.address);

  const arCircle = await hre.ethers.deployContract("arCircle", [USDC_ADDRESS]);
  await arCircle.waitForDeployment();

  console.log("arCircle deployed to:", await arCircle.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
