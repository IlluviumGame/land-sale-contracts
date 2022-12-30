# Illuvium Land Sale #
Illuvium Land Sale Protocol, also known as Land Sale Protocol, or Land Sale,
powers the series of sales (a.k.a sale events), selling in total up to around 100,000 Land NFTs.
The protocol operates either completely on Layer 1, or in a mixed Layer 1/2 mode
(when sale happens in Layer 1 and NFT minting happens in Layer 2),
and consists of a Land ERC721 token itself, sale supporting smart contracts (helpers),
backend and frontend services powering the initial sale of the token and simplifying the interaction with it later on.

[[Continue reading]](docs/Illuvium%20Land%20Sale%20On-chain%20Architecture.pdf)

This repo contains the blockchain part of the protocol, a so called
[on-chain protocol architecture](docs/Illuvium%20Land%20Sale%20On-chain%20Architecture.pdf) implementation.

The project is built using
* [Hardhat](https://hardhat.org/), a popular Ethereum development environment,
* [Web3.js](https://web3js.readthedocs.io/), a collection of libraries that allows interacting with
local or remote Ethereum node using HTTP, IPC or WebSocket, and
* [Truffle](https://www.trufflesuite.com/truffle), a popular development framework for Ethereum.

Smart contracts deployment is configured to use [Infura](https://infura.io/)
and [HD Wallet](https://www.npmjs.com/package/@truffle/hdwallet-provider)

## Repository Description ##
What's inside?

* [Illuvium Land Sale Protocol On-chain Architecture Version 1.1.4_04/28/22
](docs/Illuvium%20Land%20Sale%20On-chain%20Architecture.pdf), containing
    * Protocol Overview
    * Access Control Technical Design, including
        * Upgradeable Access Control modification
    * Land Plot NFT (ERC721 Token) Technical Design, including
        * functional/non-functional Requirements
        * data structures
        * internal land structure (land gen) description
    * Land Sale (Helper) Technical Design, including
        * functional/non-functional Requirements
        * data structures
        * input data generation and validation process description
    * Land Sale Price Oracle (Helper) Technical Design, including
        * functional/non-functional Requirements
        * implementation overview
* Audits
    * [CertiK Audit Report](docs/audits/REP-final-20220519T032215Z.pdf)
    * [PeckShield Audit Report](docs/audits/PeckShield-Audit-Report-Illuvium-LandSale-v1.0.pdf)
    * [Internal Audit Report by David Lee](docs/audits/interal_audit_0307-David_Lee.md)
* Access Control
    * Smart Contract(s):
        * [AccessControl](contracts/utils/AccessControl.sol)
          – replaces OpenZeppelin AccessControl
        * [UpgradeableAccessControl](contracts/utils/UpgradeableAccessControl.sol)
          – replaces OpenZeppelin AccessControlUpgradeable
    * Test(s):
        * [acl_core.js](test/util/acl_core.js)
        * [acl_upgradeable.js](test/util/acl_upgradeable.js)
* Land Plot NFT (ERC721 Token)
    * Smart Contract(s):
        * Token Implementation
            * [LandERC721](contracts/token/LandERC721.sol)
            * [RoyalERC721](contracts/token/RoyalERC721.sol)
            * [UpgradeableERC721](contracts/token/UpgradeableERC721.sol)
        * Auxiliary Modules
            * [LandDescriptor](contracts/token/LandDescriptorImpl.sol)
        * Auxiliary Libraries
            * [LandLib](contracts/lib/LandLib.sol) – defines token data structures,
              internal land structure generation algorithm
            * [LandBlobLib](contracts/lib/LandBlobLib.sol)
              – string parsing lib to help with IMX `mintFor` `mintingBlob` param parsing
            * [LandSvgLib.sol](contracts/lib/LandSvgLib.sol) – land plot SVG generator
        * Interfaces
            * [ImmutableMintableERC721](contracts/interfaces/ImmutableSpec.sol)
            * [LandERC721Metadata](contracts/interfaces/LandERC721Spec.sol)
            * [LandDescriptor](contracts/interfaces/LandERC721Spec.sol)
            * [EIP2981](contracts/interfaces/EIP2981Spec.sol)
            * [MintableERC721](contracts/interfaces/ERC721SpecExt.sol)
            * [BurnableERC721](contracts/interfaces/ERC721SpecExt.sol)
            * [ERC721](contracts/interfaces/ERC721Spec.sol)
            * [ERC165](contracts/interfaces/ERC165Spec.sol)
    * Test(s):
        * [erc721_zeppelin.js](test/land_nft/erc721_zeppelin.js) – ERC-721 compliance tests ported from
          [OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts/)
          (see [ERC721.behavior.js](test/land_nft/include/zeppelin/ERC721.behavior.js), and
          [ERC721URIStorage.behaviour.js](test/land_nft/include/zeppelin/ERC721URIStorage.behaviour.js))
        * [eip2981_royalties.js](test/land_nft/eip2981_royalties.js)
        * [erc165_support.js](test/land_nft/erc165_support.js)
        * [metadata.js](test/land_nft/metadata.js)
        * [mint_for.js](test/land_nft/mint_for.js) – IMX mintFor tests
        * [land_blob_lib_test.js](test/land_blob/land_blob_lib_test.js) – LandBlobLib tests
        * [rescue_erc20.js](test/land_nft/rescue_erc20.js)
        * [acl.js](test/land_nft/acl.js) – access control related tests
        * [land_lib_test.js](test/land_gen/land_lib_test.js) – LandLib tests (land_lib.js/LandLib.sol match)
        * [isomorphic_grid.js](test/land_gen/isomorphic_grid.js) – land gen tests
        * [land_svg_lib_test.js](test/svg_gen/land_svg_lib_test.js) – SVG generator tests
* Land Sale
    * Smart Contract(s):
        * [LandSale.sol](contracts/protocol/LandSale.sol)
    * Test(s):
        * [land_sale.js](test/protocol/land_sale.js) – exhaustive set of test cases, including corner cases
        * [land_sale_acl.js](test/protocol/land_sale_acl.js) – access control related tests
        * [land_sale_price.js](test/protocol/land_sale_price.js) – price formula, price calculation tests
        * [land_sale-sim.js](test/protocol/land_sale-sim.js) – sale simulation buying big number of land plots
        * [land_sale-proto.js](test/protocol/land_sale-proto.js) – simple success-scenario test
        * [land_sale-gas_usage.js](test/protocol/land_sale-gas_usage.js)
* Land Sale Price Oracle
    * Smart Contract(s):
        * Implementation
            * [LandSalePriceOracleV1](contracts/protocol/LandSalePriceOracleV1.sol)
        * Interfaces
            * [LandSalePriceOracle.sol](contracts/interfaces/PriceOracleSpec.sol)
    * Test(s):
        * [land_sale_price_oracle.js](test/protocol/land_sale_price_oracle.js)

## Installation ##

Following steps were tested to work in macOS Catalina

1. Clone the repository  
    ```git clone git@github.com:IlluviumGame/land-sale-core.git```
2. Navigate into the cloned repository  
    ```cd land-sale-core```
3. Install [Node Version Manager (nvm)](https://github.com/nvm-sh/nvm) – latest  
    ```brew install nvm```
4. Install [Node package manager (npm)](https://www.npmjs.com/) and [Node.js](https://nodejs.org/) – version 16.8.1
 or higher  
    ```nvm install 16```
5. Activate node version installed  
    ```nvm use 16```
6. Install project dependencies  
    ```npm install```

### Troubleshooting ###
* After executing ```nvm use 16``` I get  
    ```
    nvm is not compatible with the npm config "prefix" option: currently set to "/usr/local/Cellar/nvm/0.37.2/versions/node/v16.8.1"
    Run `npm config delete prefix` or `nvm use --delete-prefix v16.8.1` to unset it.
    ```
    Fix:  
    ```
    nvm use --delete-prefix v16.8.1
    npm config delete prefix
    npm config set prefix "/usr/local/Cellar/nvm/0.37.2/versions/node/v16.8.1"
    ```
* After executing ```npm install``` I get
    ```
    npm ERR! code 127
    npm ERR! path ./land-sale-core/node_modules/utf-8-validate
    npm ERR! command failed
    npm ERR! command sh -c node-gyp-build
    npm ERR! sh: node-gyp-build: command not found
    
    npm ERR! A complete log of this run can be found in:
    npm ERR!     ~/.npm/_logs/2022-08-30T07_10_23_362Z-debug.log
    ```
    Fix:  
    ```
    npm install -g node-gyp
    npm install -g node-gyp-build
    ```

### Notes on Ubuntu 20.04 LTS ###
- [How to install Node.js 16 on Ubuntu 20.04 LTS](https://joshtronic.com/2021/05/09/how-to-install-nodejs-16-on-ubuntu-2004-lts/)
- [How to Run Linux Commands in Background](https://linuxize.com/post/how-to-run-linux-commands-in-background/)

## Configuration ##
1. Create or import 12-word mnemonics for
   1. Mainnet
   2. Ropsten
   3. Rinkeby
   4. Kovan
   5. Goerli

    You can use MetaMask to create mnemonics: https://metamask.io/

    Note: you can use same mnemonic for test networks (ropsten, rinkeby and kovan).
    Always use a separate one for mainnet, keep it secure.

    Note: you can add more configurations to connect to the networks not listed above.
    Check and add configurations required into the [hardhat.config.js](hardhat.config.js).

    Note: you can use private keys instead of mnemonics (see Alternative Configuration section below)

2. Create an infura access key at https://infura.io/

    Note: you can use alchemy API key instead of infura access key (see Alternative Configuration section below)

3. Create etherscan API key at https://etherscan.io/

4. Export mnemonics, infura access key, and etherscan API key as system environment variables
    (they should be available for hardhat):

   | Name         | Value             |
   |--------------|-------------------|
   | MNEMONIC1    | Mainnet mnemonic  |
   | MNEMONIC3    | Ropsten mnemonic  |
   | MNEMONIC4    | Rinkeby mnemonic  |
   | MNEMONIC42   | Kovan mnemonic    |
   | MNEMONIC5    | Goerli mnemonic   |
   | INFURA_KEY   | Infura access key |
   | ETHERSCAN_KEY| Etherscan API key |

Note:  
Read [How do I set an environment variable?](https://www.schrodinger.com/kb/1842) article for more info on how to
set up environment variables in Linux, Windows and macOS.

### Example Script: macOS Catalina ###
```
export MNEMONIC1="witch collapse practice feed shame open despair creek road again ice least"
export MNEMONIC3="someone relief rubber remove donkey jazz segment nose spray century put beach"
export MNEMONIC4="someone relief rubber remove donkey jazz segment nose spray century put beach"
export MNEMONIC42="someone relief rubber remove donkey jazz segment nose spray century put beach"
export MNEMONIC5="someone relief rubber remove donkey jazz segment nose spray century put beach"
export INFURA_KEY="000ba27dfb1b3663aadfc74c3ab092ae"
export ETHERSCAN_KEY="9GEEN6VPKUR7O6ZFBJEKCWSK49YGMPUBBG"
```

## Alternative Configuration: Using Private Keys instead of Mnemonics, and Alchemy instead if Infura ##
Alternatively to using mnemonics, private keys can be used instead.
When both mnemonics and private keys are set in the environment variables, private keys are used.

Similarly, alchemy can be used instead of infura.
If both infura and alchemy keys are set, alchemy is used.

1. Create or import private keys of the accounts for
   1. Mainnet
   2. Ropsten
   3. Rinkeby
   4. Kovan
   5. Goerli

    You can use MetaMask to export private keys: https://metamask.io/

    Note: you can use the same private key for test networks (ropsten, rinkeby and kovan).
    Always use a separate one for mainnet, keep it secure.

2. Create an alchemy API key at https://alchemy.com/

3. Create etherscan API key at https://etherscan.io/

4. Export private keys, infura access key, and etherscan API key as system environment variables
    (they should be available for hardhat):

   | Name         | Value               |
   |--------------|---------------------|
   | P_KEY1       | Mainnet private key |
   | P_KEY3       | Ropsten private key |
   | P_KEY4       | Rinkeby private key |
   | P_KEY42      | Kovan private key   |
   | P_KEY5       | Goerli private key  |
   | ALCHEMY_KEY  | Alchemy API key   |
   | ETHERSCAN_KEY| Etherscan API key   |

Note: private keys should start with ```0x```

### Example Script: macOS Catalina ###
```
export P_KEY1="0x5ed21858f273023c7fc0683a1e853ec38636553203e531a79d677cb39b3d85ad"
export P_KEY3="0xfb84b845b8ea672939f5f6c9a43b2ae53b3ee5eb8480a4bfc5ceeefa459bf20c"
export P_KEY4="0xfb84b845b8ea672939f5f6c9a43b2ae53b3ee5eb8480a4bfc5ceeefa459bf20c"
export P_KEY42="0xfb84b845b8ea672939f5f6c9a43b2ae53b3ee5eb8480a4bfc5ceeefa459bf20c"
export P_KEY5="0xfb84b845b8ea672939f5f6c9a43b2ae53b3ee5eb8480a4bfc5ceeefa459bf20c"
export ALCHEMY_KEY="hLe1XqWAUlvmlW42Ka5fdgbpb97ENsMJ"
export ETHERSCAN_KEY="9GEEN6VPKUR7O6ZFBJEKCWSK49YGMPUBBG"
```

## Using Custom JSON-RPC Endpoint URL ##
To use custom JSON-RPC endpoint instead of infura/alchemy public endpoints, set the corresponding RPC URL as
an environment variable:

| Name            | Value                         |
|-----------------|-------------------------------|
| MAINNET_RPC_URL | Mainnet JSON-RPC endpoint URL |
| ROPSTEN_RPC_URL | Ropsten JSON-RPC endpoint URL |
| RINKEBY_RPC_URL | Rinkeby JSON-RPC endpoint URL |
| KOVAN_RPC_URL   | Kovan JSON-RPC endpoint URL   |

## Compilation ##
Execute ```npx hardhat compile``` command to compile smart contracts.

Compilation settings are defined in [hardhat.config.js](./hardhat.config.js) ```solidity``` section.

Note: Solidity files *.sol use strict compiler version, you need to change all the headers when upgrading the
compiler to another version 

## Testing ##
Smart contract tests are built with Truffle – in JavaScript (ES6) and [web3.js](https://web3js.readthedocs.io/)

The tests are located in [test](./test) folder. 
They can be run with built-in [Hardhat Network](https://hardhat.org/hardhat-network/).

Run ```npx hardhat test``` to run all the tests or ```.npx hardhat test <test_file>``` to run individual test file.
Example: ```npx hardhat test ./test/erc721/erc721_zeppelin.js```

### Troubleshooting ###
* After running any test (executing ```npx hardhat test ./test/erc721/erc721_zeppelin.js``` for example) I get
    ```
    An unexpected error occurred:
    
    Error: This method only supports Buffer but input was: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
    ```
    Fix: downgrade @nomiclabs/hardhat-truffle5 plugin to 2.0.0 (see https://issueexplorer.com/issue/nomiclabs/hardhat/1885)
    ```
    npm install -D @nomiclabs/hardhat-truffle5@2.0.0
    ```

## Test Coverage ##
Smart contracts test coverage is powered by [solidity-coverage] plugin.

Run `npx hardhat coverage` to run test coverage and generate the report.

### Troubleshooting ###
* After running the coverage I get
    ```
    <--- Last few GCs --->

    [48106:0x7f9b09900000]  3878743 ms: Scavenge 3619.3 (4127.7) -> 3606.1 (4128.2) MB, 5.2 / 0.0 ms  (average mu = 0.262, current mu = 0.138) task
    [48106:0x7f9b09900000]  3878865 ms: Scavenge 3620.6 (4128.2) -> 3606.9 (4129.2) MB, 4.9 / 0.0 ms  (average mu = 0.262, current mu = 0.138) allocation failure
    [48106:0x7f9b09900000]  3882122 ms: Mark-sweep 3619.5 (4129.2) -> 3579.6 (4128.4) MB, 3221.6 / 0.7 ms  (average mu = 0.372, current mu = 0.447) task scavenge might not succeed


    <--- JS stacktrace --->

    FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
     1: 0x10610e065 node::Abort() (.cold.1) [/usr/local/opt/nvm/versions/node/v14.18.0/bin/node]
     2: 0x104dabc19 node::Abort() [/usr/local/opt/nvm/versions/node/v14.18.0/bin/node]
     3: 0x104dabd8f node::OnFatalError(char const*, char const*) [/usr/local/opt/nvm/versions/node/v14.18.0/bin/node]
     4: 0x104f29ef7 v8::Utils::ReportOOMFailure(v8::internal::Isolate*, char const*, bool) [/usr/local/opt/nvm/versions/node/v14.18.0/bin/node]
     5: 0x104f29e93 v8::internal::V8::FatalProcessOutOfMemory(v8::internal::Isolate*, char const*, bool) [/usr/local/opt/nvm/versions/node/v14.18.0/bin/node]
     6: 0x1050f8be5 v8::internal::Heap::FatalProcessOutOfMemory(char const*) [/usr/local/opt/nvm/versions/node/v14.18.0/bin/node]
     7: 0x1050fccb6 v8::internal::Heap::RecomputeLimits(v8::internal::GarbageCollector) [/usr/local/opt/nvm/versions/node/v14.18.0/bin/node]
     8: 0x1050f94f6 v8::internal::Heap::PerformGarbageCollection(v8::internal::GarbageCollector, v8::GCCallbackFlags) [/usr/local/opt/nvm/versions/node/v14.18.0/bin/node]
     9: 0x1050f6c4d v8::internal::Heap::CollectGarbage(v8::internal::AllocationSpace, v8::internal::GarbageCollectionReason, v8::GCCallbackFlags) [/usr/local/opt/nvm/versions/node/v14.18.0/bin/node]
    10: 0x105103dca v8::internal::Heap::AllocateRawWithLightRetrySlowPath(int, v8::internal::AllocationType, v8::internal::AllocationOrigin, v8::internal::AllocationAlignment) [/usr/local/opt/nvm/versions/node/v14.18.0/bin/node]
    11: 0x105103e51 v8::internal::Heap::AllocateRawWithRetryOrFailSlowPath(int, v8::internal::AllocationType, v8::internal::AllocationOrigin, v8::internal::AllocationAlignment) [/usr/local/opt/nvm/versions/node/v14.18.0/bin/node]
    12: 0x1050d425c v8::internal::Factory::NewFillerObject(int, bool, v8::internal::AllocationType, v8::internal::AllocationOrigin) [/usr/local/opt/nvm/versions/node/v14.18.0/bin/node]
    13: 0x10546fe0f v8::internal::Runtime_AllocateInYoungGeneration(int, unsigned long*, v8::internal::Isolate*) [/usr/local/opt/nvm/versions/node/v14.18.0/bin/node]
    14: 0x105839d19 Builtins_CEntry_Return1_DontSaveFPRegs_ArgvOnStack_NoBuiltinExit [/usr/local/opt/nvm/versions/node/v14.18.0/bin/node]
    Abort trap: 6
    ```

    Fix: increase Node.js memory limit to 8 GB:
    ```
    export NODE_OPTIONS="--max-old-space-size=8192"
    ```

## Deployment ##
Deployments are implemented via [hardhat-deploy plugin](https://github.com/wighawag/hardhat-deploy) by Ronan Sandford.

Deployment scripts perform smart contracts deployment itself and their setup configuration.
Executing a script may require several transactions to complete, which may fail. To help troubleshoot
partially finished deployment, the scripts are designed to be rerunnable and execute only the transactions
which were not executed in previous run(s).

Deployment scripts are located under [deploy](./deploy) folder.
Deployment execution state is saved under [deployments](./deployments) folder.

To run fresh deployment (rinkeby):

1. Delete [deployments/rinkeby](./deployments/rinkeby) folder contents.

2. Run the deployment of interest with the ```npx hardhat deploy``` command
    ```
    npx hardhat deploy --network rinkeby --tags v1_deploy
    ```
    where ```v1_deploy``` specifies the deployment script tag to run,
    and ```--network rinkeby``` specifies the network to run script for
    (see [hardhat.config.js](./hardhat.config.js) for network definitions).

3. Verify source code on Etherscan with the ```npx hardhat etherscan-verify``` command
    ```
    npx hardhat etherscan-verify --network rinkeby
    ```

4. Enable the roles (see Access Control) required by the protocol
    ```
    npx hardhat deploy --network rinkeby --tags v1_roles
    ```
    Note: this step can be done via Etherscan UI manually

5. Setup the sale data Merkle root (see ```LandSale.setInputDataRoot()```) via Etherscan UI manually

6. Initialize the sale (see ```LandSale.initialize()```) via Etherscan UI manually

7. Enable the features (see Access Control) required by the protocol
    ```
    npx hardhat deploy --network rinkeby --tags v1_features
    ```
    Note: this step can be done via Etherscan UI manually

To rerun the deployment script and continue partially completed script skip the first step
(do not cleanup the [deployments](./deployments) folder).

## Contributing
Please see the [Contribution Guide](./CONTRIBUTING.md) document to get understanding on how to report issues,
contribute to the source code, fix bugs, introduce new features, etc.

(c) 2020–2022 Illuvium [
[WWW](https://illuvium.io/)
| [Medium](https://illuvium.medium.com/)
| [Twitter](https://twitter.com/illuviumio)
| [Discord](https://discord.gg/T5pMyU8QtH)
]
