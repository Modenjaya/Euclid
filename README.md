# Euclid Auto Bot

**Euclid Auto Bot** is a Node.js-based automation tool designed for interacting with the Euclid Protocol on the Arbitrum Sepolia testnet. It facilitates automated token swaps (ETH to EUCLID, ETH to ANDR, or random swaps) with a user-friendly terminal-based UI powered by `blessed` and `blessed-contrib`. The bot supports multiple transactions, handles rate limits, and tracks transactions for airdrop eligibility.

**Created By: Kazuha**

## Table of Contents
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Repository](#repository)
- [Contributing](#contributing)
- [License](#license)
- [Credits](#credits)

## Features
- **Interactive UI**: Terminal-based graphical interface with menu navigation, transaction logs, and a live transaction graph.
- **Swap Options**:
  - ETH to EUCLID (Arbitrum)
  - ETH to ANDR (Arbitrum)
  - Random Swap (alternates between EUCLID and ANDR)
- **Automation**: Perform multiple transactions with configurable ETH amounts.
- **Rate Limit Handling**: Exponential backoff for API rate limits.
- **Transaction Tracking**: Logs transactions to Euclid's API for airdrop eligibility.
- **Error Handling**: Robust checks for insufficient balance, invalid inputs, and transaction failures.
- **Visual Feedback**: Animated ASCII banner, color-coded logs, and real-time transaction graph.

## Prerequisites
- **Node.js**: Version 16 or higher.
- **npm**: Node package manager.
- **Arbitrum Sepolia Testnet**:
  - A wallet with a private key.
  - Sufficient ETH for transactions and gas fees.
- **Terminal**: A compatible terminal (Linux, macOS, or Windows with WSL).

## Installation
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Kazuha787/Euclid-Auto-Bot.git
   cd Euclid-Auto-Bot
   ```
## Install Dependencies
```
npm install
```
## Set Up Environment
- Create a `.env` file in the project root.
- Add your wallet's private key
  ```
  PRIVATE_KEY=your_private_key_here
  ```
## UsageRun the Script
```
node main.js
```
## Interact with the UI
Menu Navigation 
- Use arrow keys to select a swap option (ETH-EUCLID, ETH-ANDR, Random Swap, or Exit).
- Input Prompts
- Enter the number of transactions.
- Specify the ETH amount per transaction.
- Confirm settings with y or n.Logs:
- View real-time transaction logs in the log panel.Graph:
- Monitor transaction counts in the live graph.Exit:
-  Press q, Ctrl+C, or Escape to quit.Example Workflow:
-  Select "ETH - EUCLID (Arbitrum)".Input 5 transactions and 0.001 ETH per transaction.Confirm with y.
-  Watch logs and graph update as transactions complete.
-  Configuration.env File:PRIVATE_KEY: Your wallet's private key (required).Script Settings:
-  Modify index.js for custom gas limits, API endpoints, or swap routes if needed.
-  Adjust minDelay and randomDelay for transaction intervals.
-  RepositoryGitHub: Kazuha787/Euclid-Auto-BotIssues:
-  Report bugs or request features here.
  ## Contributing Contributions are welcome!
  Follow these steps:
  ```
  Fork the repository.Create a feature branch (git checkout -b feature-name).Commit changes (git commit -m 'Add feature').Push to the branch (git push origin feature-name).Open a pull request.Please ensure code follows the existing style and includes tests where applicable.LicenseThis project is licensed under the MIT License. See the LICENSE file for details.
```
## Credits

Created By: KazuhaContact: 
TelegramChannel: 
Telegram ChannelRePLIT: 
Kazuha787Dependencies:
ethers.js axios blessed blessed-contrib chalk gradient-string
