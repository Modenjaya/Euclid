require('dotenv').config();
const axios = require('axios');
const ethers = require('ethers');
const blessed = require('blessed');
const contrib = require('blessed-contrib');
const chalk = require('chalk');
const gradient = require('gradient-string');

// New Banner
const asciiBannerLines = [
    '███████╗    ██╗   ██╗     ██████╗    ██╗         ██╗    ██████╗ ',
    '██╔════╝    ██║   ██║    ██╔════╝    ██║         ██║    ██╔══██╗',
    '█████╗      ██║   ██║    ██║         ██║         ██║    ██║  ██║',
    '██╔══╝      ██║   ██║    ██║         ██║         ██║    ██║  ██║',
    '███████╗    ╚██████╔╝    ╚██████╗    ███████╗    ██║    ██████╔╝',
    '╚══════╝     ╚═════╝      ╚═════╝    ╚══════╝    ╚═╝    ╚═════╝ ',
    '                                                                '
];

// Menu Options
const menuOptions = [
    { label: 'ETH - EUCLID (Arbitrum)', value: 'eth_euclid' },
    { label: 'ETH - ANDR (Arbitrum)', value: 'eth_andr' },
    { label: 'Random Swap (Arbitrum)', value: 'random_swap' },
    { label: 'Exit', value: 'exit' }
];

// Transaction Data for Graph
let transactionData = {
    x: Array(30).fill(0).map((_, i) => i.toString()),
    y: Array(30).fill(0)
};

// Logger for UI
const logger = {
    info: (msg, panelBox, screen) => {
        panelBox.log(chalk.green(`[✓] ${msg}`));
        screen.render();
    },
    warn: (msg, panelBox, screen) => {
        panelBox.log(chalk.yellow(`[⚠] ${msg}`));
        screen.render();
    },
    error: (msg, panelBox, screen) => {
        panelBox.log(chalk.red(`[✗] ${msg}`));
        screen.render();
    },
    success: (msg, panelBox, screen) => {
        panelBox.log(chalk.green(`[✅] ${msg}`));
        screen.render();
    },
    loading: (msg, panelBox, screen) => {
        panelBox.log(chalk.cyan(`[⟳] ${msg}`));
        screen.render();
    },
    step: (msg, panelBox, screen) => {
        panelBox.log(chalk.white(`[➤] ${msg}`));
        screen.render();
    }
};

// Animate Banner
function animateBanner(bannerBox, screen, callback) {
    let idx = 0;
    const total = asciiBannerLines.length;
    const lines = [];
    function showNextLine() {
        if (idx < total) {
            lines.push(asciiBannerLines[idx]);
            bannerBox.setContent(gradient.pastel.multiline(lines.join('\n')));
            screen.render();
            idx++;
            setTimeout(showNextLine, 100);
        } else if (callback) {
            setTimeout(callback, 300);
        }
    }
    showNextLine();
}

// Pulse Banner
function pulseBanner(bannerBox, screen) {
    let bright = true;
    setInterval(() => {
        const content = asciiBannerLines.join('\n');
        bannerBox.setContent(bright ? gradient.cristal.multiline(content) : gradient.pastel.multiline(content));
        screen.render();
        bright = !bright;
    }, 1500);
}

// Input Modal
function requestInput(screen, promptText, type = 'text', defaultValue = '') {
    return new Promise((resolve) => {
        const promptBox = blessed.prompt({
            parent: screen,
            top: 'center',
            left: 'center',
            width: '50%',
            height: 7,
            border: 'line',
            label: ' Input ',
            tags: true,
            keys: true,
            vi: true,
            mouse: true,
            style: {
                fg: 'white',
                bg: 'black',
                border: { fg: '#ff8c00' },
                label: { fg: '#ff8c00' }
            }
        });

        promptBox.input(
            promptText + (defaultValue !== undefined && defaultValue !== '' ? ` [${defaultValue}]` : ''),
            '',
            (err, value) => {
                if (type === 'number') value = Number(value);
                if (isNaN(value) || value === '' || value === undefined) value = defaultValue;
                promptBox.destroy();
                screen.render();
                resolve(value);
            }
        );
        screen.render();
    });
}

// Update Transaction Graph
function updateTransactionGraph(graph, txCount) {
    transactionData.y.shift();
    transactionData.y.push(txCount);
    graph.setData([{ title: 'Transactions', x: transactionData.x, y: transactionData.y, style: { line: 'cyan' } }]);
    graph.screen.render();
}

// Retry Function
const retry = async (fn, panelBox, screen, retries = 5, delay = 5000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fn();
            if (response.headers) {
                logger.info(`Rate Limit Headers: ${JSON.stringify({
                    limit: response.headers['x-ratelimit-limit'],
                    remaining: response.headers['x-ratelimit-remaining'],
                    reset: response.headers['x-ratelimit-reset']
                })}`, panelBox, screen);
            }
            return response;
        } catch (error) {
            if (error.response && error.response.status === 429) {
                logger.warn(`Rate limit hit (429). Retrying in ${delay}ms...`, panelBox, screen);
                await new Promise((resolve) => setTimeout(resolve, delay));
                delay *= 2;
            } else if (i === retries - 1) {
                throw error;
            } else {
                logger.warn(`API retry ${i + 1}/${retries} failed: ${error.message}. Retrying in ${delay}ms...`, panelBox, screen);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }
};

// Main Function
async function main() {
    const screen = blessed.screen({
        smartCSR: true,
        title: 'Euclid Testnet Auto Bot',
        autoPadding: true,
        fullUnicode: true
    });

    // Banner
    const bannerBox = blessed.box({
        top: 0,
        left: 'center',
        width: '100%',
        height: asciiBannerLines.length,
        align: 'center',
        tags: true,
        content: '',
        style: { fg: 'white', bg: 'black' }
    });

    // Menu
    const menuBox = blessed.list({
        top: asciiBannerLines.length,
        left: 0,
        width: 22,
        height: `70%-${asciiBannerLines.length}`,
        label: chalk.bold.hex('#00eaff')(' MENU '),
        tags: true,
        keys: true,
        mouse: true,
        vi: true,
        border: { type: 'line', fg: '#00eaff' },
        style: {
            fg: 'white',
            bg: 'black',
            border: { fg: '#00eaff' },
            selected: { bg: '#00eaff', fg: 'black', bold: true },
            item: { hover: { bg: '#00eaff', fg: 'black', bold: true } },
            label: { fg: '#00eaff', bold: true }
        },
        items: menuOptions.map(opt => opt.label),
        scrollbar: {
            ch: ' ',
            track: { bg: 'grey' },
            style: { inverse: true }
        }
    });

    // Log Panel
    const panelBox = contrib.log({
        top: asciiBannerLines.length,
        left: 23,
        width: '78%-1',
        height: `70%-${asciiBannerLines.length}`,
        label: chalk.bold.hex('#ff8c00')(' TRANSACTION LOGS '),
        tags: true,
        border: { type: 'line', fg: '#ff8c00' },
        style: {
            fg: 'white',
            bg: 'black',
            border: { fg: '#ff8c00' },
            label: { fg: '#ff8c00', bold: true }
        },
        scrollable: true,
        alwaysScroll: true,
        scrollbar: {
            ch: ' ',
            track: { bg: 'grey' },
            style: { inverse: true }
        }
    });
    panelBox.log(chalk.cyanBright('Select a swap option from the menu...'));

    // Transaction Graph
    const graphBox = contrib.line({
        top: `70%`,
        left: 0,
        width: '100%',
        height: 10,
        label: chalk.bold.hex('#00ff00')(' TRANSACTION GRAPH '),
        showLegend: true,
        border: { type: 'line', fg: '#00ff00' },
        style: {
            fg: 'cyan',
            bg: 'black',
            border: { fg: '#00ff00' },
            label: { fg: '#00ff00', bold: true },
            baseline: 'white',
            text: 'white'
        },
        xLabel: 'Time',
        yLabel: 'TX Count',
        showNthLabel: 5
    });

    // Status Bar
    const statusBar = blessed.box({
        bottom: 0,
        left: 0,
        width: '100%',
        height: 3,
        align: 'center',
        tags: true,
        style: { fg: 'black', bg: '#00eaff' },
        content: chalk.blackBright.bold(' Kazuha787 ') +
                 chalk.blackBright(' | ') +
                 chalk.black('Press ') + chalk.bold('q') + chalk.black(' to quit')
    });

    // Append Widgets
    screen.append(bannerBox);
    screen.append(menuBox);
    screen.append(panelBox);
    screen.append(graphBox);
    screen.append(statusBar);

    // Set Graph Data
    graphBox.setData([{ title: 'Transactions', x: transactionData.x, y: transactionData.y, style: { line: 'cyan' } }]);

    menuBox.focus();

    // Animate and Pulse Banner
    animateBanner(bannerBox, screen, () => {
        pulseBanner(bannerBox, screen);
        screen.render();
    });

    // Smooth Focus Transition
    screen.key(['tab'], () => {
        const widgets = [menuBox, panelBox];
        const current = widgets.find(w => w.focused) || menuBox;
        const next = widgets[(widgets.indexOf(current) + 1) % widgets.length];
        next.focus();
        screen.render();
    });

    // Exit Keys
    function closeUI() {
        screen.destroy();
        process.exit(0);
    }
    screen.key(['q', 'C-c', 'escape'], closeUI);

    // Menu Navigation
    menuBox.on('select', async (item, idx) => {
        const selected = menuOptions[idx];
        if (!selected) return;

        if (selected.value === 'exit') {
            closeUI();
            return;
        }

        try {
            const numTransactions = await requestInput(screen, 'Enter number of transactions to perform: ', 'number', 1);
            const ethAmount = await requestInput(screen, 'Enter ETH amount per transaction: ', 'number', 0.001);

            if (isNaN(numTransactions) || isNaN(ethAmount) || numTransactions <= 0 || ethAmount <= 0) {
                logger.error('Invalid input. Please enter positive numbers.', panelBox, screen);
                menuBox.focus();
                return;
            }

            const privateKey = process.env.PRIVATE_KEY;
            if (!privateKey) {
                logger.error('Private key not found in .env file', panelBox, screen);
                menuBox.focus();
                return;
            }

            const ethersVersion = parseInt(ethers.version.split('.')[0], 10);
            const isEthersV6 = ethersVersion >= 6;
            let provider, wallet;
            if (isEthersV6) {
                provider = new ethers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');
                wallet = new ethers.Wallet(privateKey, provider);
            } else {
                provider = new ethers.providers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');
                wallet = new ethers.Wallet(privateKey, provider);
            }

            const walletAddress = wallet.address;
            logger.info(`Connected to wallet: ${walletAddress}`, panelBox, screen);
            logger.info('Network: Arbitrum Sepolia (Chain ID: 421614)', panelBox, screen);

            const contractAddress = '0x7f2CC9FE79961f628Da671Ac62d1f2896638edd5';
            const balance = await provider.getBalance(walletAddress);
            let requiredEth, gasEstimatePerTx, totalRequiredEth;

            if (isEthersV6) {
                requiredEth = ethers.parseEther(ethAmount.toString()) * BigInt(numTransactions);
                gasEstimatePerTx = ethers.parseEther('0.00009794');
                totalRequiredEth = requiredEth + gasEstimatePerTx * BigInt(numTransactions);
            } else {
                requiredEth = ethers.utils.parseEther((numTransactions * ethAmount).toString());
                gasEstimatePerTx = ethers.utils.parseUnits('0.00009794', 'ether');
                totalRequiredEth = requiredEth.add(gasEstimatePerTx.mul(numTransactions));
            }

            const isBalanceInsufficient = isEthersV6 ? balance < totalRequiredEth : balance.lt(totalRequiredEth);
            if (isBalanceInsufficient) {
                logger.error(
                    `Insufficient ETH balance. Required: ${
                        isEthersV6 ? ethers.formatEther(totalRequiredEth) : ethers.utils.formatEther(totalRequiredEth)
                    } ETH, Available: ${
                        isEthersV6 ? ethers.formatEther(balance) : ethers.utils.formatEther(balance)
                    } ETH`,
                    panelBox,
                    screen
                );
                menuBox.focus();
                return;
            }

            logger.warn('Summary:', panelBox, screen);
            logger.step(`Swap type: ${selected.label}`, panelBox, screen);
            logger.step(`Number of transactions: ${numTransactions}`, panelBox, screen);
            logger.step(`ETH per transaction: ${ethAmount} ETH`, panelBox, screen);
            logger.step(`Total ETH (incl. gas): ${
                isEthersV6 ? ethers.formatEther(totalRequiredEth) : ethers.utils.formatEther(totalRequiredEth)
            } ETH`, panelBox, screen);

            const confirm = await requestInput(screen, 'Continue with these settings? (y/n): ', 'text', 'y');
            if (confirm.toLowerCase() !== 'y') {
                logger.error('Operation cancelled by user.', panelBox, screen);
                menuBox.focus();
                return;
            }

            const isRandomSwap = selected.value === 'random_swap';
            const swapType = selected.value === 'eth_euclid' ? '1' : selected.value === 'eth_andr' ? '2' : '3';

            for (let i = 0; i < numTransactions; i++) {
                const isEuclidSwap = isRandomSwap ? (i % 2 === 0) : swapType === '1';
                const swapDescription = isEuclidSwap ? 'ETH to EUCLID' : 'ETH to ANDR';

                logger.loading(`Transaction ${i + 1}/${numTransactions} (${swapDescription}):`, panelBox, screen);
                try {
                    logger.step('Fetching swap quote for amount_out...', panelBox, screen);

                    const targetChainUid = isEuclidSwap ? 'optimism' : 'andromeda';
                    const targetToken = isEuclidSwap ? 'euclid' : 'andr';
                    const defaultAmountOut = isEuclidSwap ? '11580659' : '1471120';
                    const swapRoute = isEuclidSwap ? ['eth', 'euclid'] : ['eth', 'euclid', 'usdc', 'usdt', 'andr'];
                    const gasLimit = isEuclidSwap ? 812028 : 1500000;
                    const targetAddress = walletAddress;

                    const quotePayload = {
                        amount_in: (isEthersV6
                            ? ethers.parseEther(ethAmount.toString())
                            : ethers.utils.parseEther(ethAmount.toString())).toString(),
                        asset_in: {
                            token: 'eth',
                            token_type: { __typename: 'NativeTokenType', native: { __typename: 'NativeToken', denom: 'eth' } }
                        },
                        slippage: '500',
                        cross_chain_addresses: [{ user: { address: targetAddress, chain_uid: targetChainUid }, limit: { less_than_or_equal: defaultAmountOut } }],
                        partnerFee: { partner_fee_bps: 10, recipient: walletAddress },
                        sender: { address: walletAddress, chain_uid: 'arbitrum' },
                        swap_path: {
                            path: [{
                                route: swapRoute,
                                dex: 'euclid',
                                amount_in: (isEthersV6
                                    ? ethers.parseEther(ethAmount.toString())
                                    : ethers.utils.parseEther(ethAmount.toString())).toString(),
                                amount_out: '0',
                                chain_uid: 'vsl',
                                amount_out_for_hops: swapRoute.map((token) => `${token}: 0`)
                            }],
                            total_price_impact: '0.00'
                        }
                    };

                    const quoteResponse = await retry(
                        () => axios.post('https://testnet.api.euclidprotocol.com/api/v1/execute/astro/swap', quotePayload, {
                            headers: {
                                accept: 'application/json, text/plain, */*',
                                'content-type': 'application/json',
                                Referer: 'https://testnet.euclidswap.io/'
                            }
                        }),
                        panelBox,
                        screen
                    );

                    logger.info('Quote received', panelBox, screen);

                    const amountOut = quoteResponse.data.meta
                        ? JSON.parse(quoteResponse.data.meta).swaps.path[0].amount_out
                        : defaultAmountOut;
                    if (!amountOut || amountOut === '0') {
                        logger.error('Invalid amount_out in API response. Skipping transaction.', panelBox, screen);
                        continue;
                    }

                    logger.step('Building swap transaction...', panelBox, screen);

                    const swapPayload = {
                        amount_in: (isEthersV6
                            ? ethers.parseEther(ethAmount.toString())
                            : ethers.utils.parseEther(ethAmount.toString())).toString(),
                        asset_in: {
                            token: 'eth',
                            token_type: { __typename: 'NativeTokenType', native: { __typename: 'NativeToken', denom: 'eth' } }
                        },
                        slippage: '500',
                        cross_chain_addresses: [{ user: { address: targetAddress, chain_uid: targetChainUid }, limit: { less_than_or_equal: amountOut } }],
                        partnerFee: { partner_fee_bps: 10, recipient: walletAddress },
                        sender: { address: walletAddress, chain_uid: 'arbitrum' },
                        swap_path: {
                            path: [{
                                route: swapRoute,
                                dex: 'euclid',
                                amount_in: (isEthersV6
                                    ? ethers.parseEther(ethAmount.toString())
                                    : ethers.utils.parseEther(ethAmount.toString())).toString(),
                                amount_out: amountOut,
                                chain_uid: 'vsl',
                                amount_out_for_hops: isEuclidSwap
                                    ? [`euclid: ${amountOut}`]
                                    : [
                                        `euclid: ${Math.floor(parseInt(amountOut) * 9.934)}`,
                                        `usdc: ${Math.floor(parseInt(amountOut) * 139.36)}`,
                                        `usdt: ${Math.floor(parseInt(amountOut) * 271.87)}`,
                                        `andr: ${amountOut}`
                                    ]
                            }],
                            total_price_impact: '0.00'
                        }
                    };

                    const swapResponse = await retry(
                        () => axios.post('https://testnet.api.euclidprotocol.com/api/v1/execute/astro/swap', swapPayload, {
                            headers: {
                                accept: 'application/json, text/plain, */*',
                                'content-type': 'application/json',
                                Referer: 'https://testnet.euclidswap.io/'
                            }
                        }),
                        panelBox,
                        screen
                    );

                    logger.info('Swap response received', panelBox, screen);

                    let txData = swapResponse.data.msgs?.[0]?.data;
                    if (!txData) {
                        logger.error('Calldata not found in API response. Skipping transaction.', panelBox, screen);
                        continue;
                    }

                    if (swapResponse.data.sender?.address.toLowerCase() !== walletAddress.toLowerCase()) {
                        logger.error(
                            `API returned incorrect sender address: ${swapResponse.data.sender.address}. Expected: ${walletAddress}. Skipping transaction.`,
                            panelBox,
                            screen
                        );
                        continue;
                    }

                    logger.loading('Executing swap transaction...', panelBox, screen);

                    const tx = {
                        to: contractAddress,
                        value: isEthersV6
                            ? ethers.parseEther(ethAmount.toString())
                            : ethers.utils.parseEther(ethAmount.toString()),
                        data: txData,
                        gasLimit: gasLimit,
                        nonce: await provider.getTransactionCount(walletAddress, 'pending'),
                        maxFeePerGas: isEthersV6 ? ethers.parseUnits('0.1', 'gwei') : ethers.utils.parseUnits('0.1', 'gwei'),
                        maxPriorityFeePerGas: isEthersV6 ? ethers.parseUnits('0.1', 'gwei') : ethers.utils.parseUnits('0.1', 'gwei')
                    };

                    try {
                        const gasEstimate = await provider.estimateGas(tx);
                        logger.info(`Estimated gas: ${gasEstimate.toString()}`, panelBox, screen);
                        tx.gasLimit = isEthersV6 ? (gasEstimate * 110n) / 100n : gasEstimate.mul(110).div(100);
                    } catch (gasError) {
                        logger.warn(`Gas estimation failed: ${gasError.message}. Using manual gas limit: ${gasLimit}`, panelBox, screen);
                    }

                    try {
                        await provider.call(tx);
                    } catch (simulationError) {
                        logger.error(`Transaction simulation failed: ${simulationError.reason || simulationError.message}`, panelBox, screen);
                        continue;
                    }

                    const txResponse = await wallet.sendTransaction(tx);
                    logger.info(`Transaction sent! Hash: ${txResponse.hash}`, panelBox, screen);

                    logger.loading('Waiting for confirmation...', panelBox, screen);
                    const receipt = await txResponse.wait();

                    if (receipt.status === 1) {
                        logger.success(`Transaction successful! Gas used: ${receipt.gasUsed.toString()}`, panelBox, screen);
                        updateTransactionGraph(graphBox, 1);

                        await retry(
                            () => axios.post('https://testnet.euclidswap.io/api/intract-track', {
                                chain_uid: 'arbitrum',
                                tx_hash: txResponse.hash,
                                wallet_address: walletAddress,
                                referral_code: 'EUCLIDEAN667247',
                                type: 'swap'
                            }, {
                                headers: {
                                    accept: 'application/json, text/plain, */*',
                                    'content-type': 'application/json',
                                    Referer: 'https://testnet.euclidswap.io/swap?ref=EUCLIDEAN667247'
                                }
                            }),
                            panelBox,
                            screen
                        );

                        logger.success('Transaction tracked with Euclid', panelBox, screen);
                        logger.step(`View transaction: https://sepolia.arbiscan.io/tx/${txResponse.hash}`, panelBox, screen);
                    } else {
                        logger.error('Transaction failed!', panelBox, screen);
                    }

                    if (i < numTransactions - 1) {
                        const minDelay = 15000;
                        const randomDelay = minDelay + Math.floor(Math.random() * 10000);
                        logger.loading(`Waiting ${randomDelay / 1000} seconds before next transaction...`, panelBox, screen);
                        await new Promise((resolve) => setTimeout(resolve, randomDelay));
                    }
                } catch (error) {
                    logger.error(`Error during transaction: ${error.message}`, panelBox, screen);
                    if (error.reason) logger.error(`Revert reason: ${error.reason}`, panelBox, screen);
                }
            }

            logger.success('All transactions completed!', panelBox, screen);
        } catch (error) {
            logger.error(`Fatal error: ${error.message}`, panelBox, screen);
        }
        menuBox.focus();
        screen.render();
    });

    // On Highlight
    menuBox.on('highlight item', (item, idx) => {
        if (!item) return;
        const selected = menuOptions[idx];
        if (!selected) return;
        panelBox.setContent(chalk.yellowBright(`\n${selected.label}\n\n`) +
                           chalk.gray('Press Enter to run this swap.'));
        screen.render();
    });

    // Initial Highlight
    menuBox.select(0);
    menuBox.emit('highlight item', menuBox.items[0], 0);

    screen.render();
}

main().catch((error) => {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
});
