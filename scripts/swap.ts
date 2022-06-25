import hre from "hardhat";
import { ethers, BigNumber } from "ethers";
import * as fs from "fs";

const oneSplitABI = JSON.parse(fs.readFileSync("./abis/onesplit.json", "utf8"));
const erc20ABI = JSON.parse(fs.readFileSync("./abis/erc20.json", "utf8"));

const daiAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const onesplitAddress = "0xC586BeF4a0992C495Cf22e1aeEE4E446CECDee0E"; // 1plit contract address on Main net

const fromAddress = "0x5d38b4e4783e34e2301a2a36c39a03c45798c4dd"; // Your wallet address

const fromToken = daiAddress;
const fromTokenDecimals = 18;

const toToken = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"; // ETH
const toTokenDecimals = 18;

const amountToExchange = BigNumber.from("1000");

const oneSplitDexes = [
  "Uniswap",
  "Kyber",
  "Bancor",
  "Oasis",
  "Curve Compound",
  "Curve USDT",
  "Curve Y",
  "Curve Binance",
  "Curve Synthetix",
  "Uniswap Compound",
  "Uniswap CHAI",
  "Uniswap Aave",
  "Mooniswap",
  "Uniswap V2",
  "Uniswap V2 ETH",
  "Uniswap V2 DAI",
  "Uniswap V2 USDC",
  "Curve Pax",
  "Curve renBTC",
  "Curve tBTC",
  "Dforce XSwap",
  "Shell",
  "mStable mUSD",
  "Curve sBTC",
  "Balancer 1",
  "Balancer 2",
  "Balancer 3",
  "Kyber 1",
  "Kyber 2",
  "Kyber 3",
  "Kyber 4",
];

async function getQuote(
  onesplitContract: ethers.Contract,
  fromToken: string,
  toToken: string,
  amount: BigNumber
) {
  let quote = null;
  try {
    quote = await onesplitContract.getExpectedReturn(
      fromToken,
      toToken,
      amount,
      100,
      0
    );
    console.log("Trade From: " + fromToken);
    console.log("Trade To: " + toToken);
    console.log("Trade Amount: " + amountToExchange);
    console.log(
      "Trade Expected Return: " +
      hre.ethers.utils.formatEther(quote.returnAmount)
    );
    console.log("Using Dexes:");
    for (let index = 0; index < quote.distribution.length; index++) {
      console.log(
        oneSplitDexes[index] + ": " + quote.distribution[index] + "%"
      );
    }
  } catch (error) {
    console.log("Failed to get quote", error);
  }
  return quote;
}

async function approveToken(
  tokenInstance: ethers.Contract,
  receiver: string,
  amount: BigNumber,
  signer: ethers.Signer
) {
  try {
    const approveTx = await tokenInstance
      .connect(signer)
      .approve(receiver, amount, {
        from: fromAddress,
      });
    await approveTx.wait(1);
  } catch (error) {
    console.log("Failed to approve token", error);
  }
}

async function impersonateAccount(address: string) {
  // impersonating a address with large DAI balance
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });
}

async function swap(
  onesplitContract: ethers.Contract,
  daiToken: ethers.Contract,
  amount: BigNumber,
  quote: { returnAmount: BigNumber; distribution: number[] },
  signer: ethers.Signer
) {
  // Balances before trade
  const ethBalanceBefore = await hre.ethers.provider.getBalance(fromAddress);
  const daiBalanceBefore = await daiToken.balanceOf(fromAddress);

  try {
    const swapTx = await onesplitContract
      .connect(signer)
      .swap(
        fromToken,
        toToken,
        amount,
        quote.returnAmount,
        quote.distribution,
        0,
        { from: fromAddress }
      );
    await swapTx.wait(1);
    const ethBalanceAfter = await hre.ethers.provider.getBalance(fromAddress);
    const daiBalanceAfter = await daiToken.balanceOf(fromAddress);
    console.log(
      "Change in DAI balance: ",
      ethers.utils.formatUnits(
        daiBalanceAfter.sub(daiBalanceBefore),
        fromTokenDecimals
      )
    );
    console.log(
      "Change in ETH balance: ",
      ethers.utils.formatUnits(
        ethBalanceAfter.sub(ethBalanceBefore),
        toTokenDecimals
      )
    );
  } catch (error) {
    console.log("Failed to swap", error);
  }
}

async function main() {
  // impersonate account and fetch signer for the account
  console.log("Impersonating account: " + fromAddress);
  await impersonateAccount(fromAddress);
  const signer = await hre.ethers.getSigner(fromAddress);

  // fetch the contract instance
  const onesplitContract = new hre.ethers.Contract(
    onesplitAddress,
    oneSplitABI,
    await hre.ethers.provider
  );
  const daiToken = new hre.ethers.Contract(daiAddress, erc20ABI, signer);

  // amount to exchange
  const amountWithDecimals = hre.ethers.utils.parseUnits(
    amountToExchange.toString(),
    fromTokenDecimals
  );

  // Getting quote
  console.log("Getting quote...");
  const quote = await getQuote(
    onesplitContract,
    fromToken,
    toToken,
    amountWithDecimals
  );

  // approve oneSplit contract to spend DAI
  console.log("Approving token...");
  await approveToken(daiToken, onesplitAddress, amountWithDecimals, signer);

  // swap
  console.log("Swapping...");
  await swap(onesplitContract, daiToken, amountWithDecimals, quote, signer);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
