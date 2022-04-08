import { ethers, BigNumber } from "ethers"
import * as fs from "fs"
import('dotenv/config')

const oneSplitABI = JSON.parse(fs.readFileSync("./abis/onesplit.json", "utf8"))

const onesplitAddress = "0xC586BeF4a0992C495Cf22e1aeEE4E446CECDee0E"; // 1plit contract address on Main net

const fromToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'; // ETHEREUM
const fromTokenDecimals = 18;

const toToken = '0x6b175474e89094c44da98b954eedeac495271d0f'; // DAI Token
const toTokenDecimals = 18;

const amountToExchange = 1 // 1 ETH

const provider = new ethers.providers.AlchemyProvider('homestead', process.env.ALCHEMY_API_KEY);

const onesplitContract = new ethers.Contract(onesplitAddress, oneSplitABI, provider);

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
];

(async function main() {
    try {
        const result = await onesplitContract.getExpectedReturn(fromToken, toToken, BigNumber.from(amountToExchange).pow(fromTokenDecimals).toString(), 100, 0, { from: '0x9759A6Ac90977b93B58547b4A71c78317f391A28' })
        console.log("Trade From: " + fromToken)
        console.log("Trade To: " + toToken);
        console.log("Trade Amount: " + amountToExchange);
        console.log(result.returnAmount.toString());
        console.log("Using Dexes:");
        for (let index = 0; index < result.distribution.length; index++) {
            console.log(oneSplitDexes[index] + ": " + result.distribution[index] + "%");
        }
    } catch (error) {
        console.log(error)
    }
})();

