# Ark of Dreams Smart Contracts

AoD smart contracts using Solidity and designed for Binance Smart Chain.

> WARNING: The contracts provided here are as is and Ark of Dreams does 
not warrant that these will work on a live environment. It is possible 
that these contracts are out dated and it is possible for Ark of Dreams 
to update these contracts without prior notification. Use at your own 
risk.

The contracts defined here are to allow auditors to evaluate the code 
that are being developed and specifically for the purpose of the Ark of
Dreams project. These contracts features cover the following business 
phases.

 1. Mystery Chest - BEP721
    - Admin minting
    - Lazy minting
 2. Mystery Pets - BEP1155
    - Conversion from Mystery Chest to Mystery Pets
    - Token Sale Contract
      - Provably fair lazy rolling
      - Define different floor prices per stage
 3. Land Titles - BEP1155
    - Token Sale Contract
      - Provably fair lazy rolling
      - Define different floor prices per stage
 4. AOD Token - BEP20
    - Blacklisting
    - Token Sale Contract
      - Define different stages
      - Creates vesting accounts
      - Accepts BUSD

## 1. Install

```bash
$ cp .env.sample to .env
$ npm install
```

You will need to provide an Binance Smart Chain private Key to deploy 
to a testnet and a Coin Market Cap Key to see gas price conversions when 
testing.

## 2. Testing

Make sure in `.env` to set the `BLOCKCHAIN_NETWORK` to `hardhat`.

```bash
$ npm test
```

## 3. Reports

The following is an example gas report from the tests ran in this 
project and could change based on the cost of `BNB` itself.

<pre>
·---------------------------------|---------------------------|-------------|-----------------------------·
|       Solc version: 0.8.9       ·  Optimizer enabled: true  ·  Runs: 200  ·  Block limit: 12450000 gas  │
··································|···························|·············|······························
|  Methods                        ·              200 gwei/gas               ·       526.80 usd/bnb        │
····················|·············|·············|·············|·············|···············|··············
|  Contract         ·  Method     ·  Min        ·  Max        ·  Avg        ·  # calls      ·  usd (avg)  │
····················|·············|·············|·············|·············|···············|··············
|  AODMysteryChest  ·  lazyMint   ·      67492  ·     104200  ·      77298  ·            4  ·       8.14  │
····················|·············|·············|·············|·············|···············|··············
|  AODMysteryChest  ·  mint       ·          -  ·          -  ·      98204  ·            3  ·      10.35  │
····················|·············|·············|·············|·············|···············|··············
|  AODPresale       ·  buy        ·          -  ·          -  ·     156467  ·            1  ·      16.49  │
····················|·············|·············|·············|·············|···············|··············
|  AODPresale       ·  release    ·      71291  ·     109205  ·      90248  ·            2  ·       9.51  │
····················|·············|·············|·············|·············|···············|··············
|  AODPresale       ·  trigger    ·          -  ·          -  ·      29219  ·            1  ·       3.08  │
····················|·············|·············|·············|·············|···············|··············
|  AODPresale       ·  vest       ·     136584  ·     170784  ·     153684  ·            2  ·      16.19  │
····················|·············|·············|·············|·············|···············|··············
|  AODPrivateSale   ·  buy        ·          -  ·          -  ·     173567  ·            1  ·      18.29  │
····················|·············|·············|·············|·············|···············|··············
|  AODPrivateSale   ·  release    ·      71291  ·     109205  ·      90248  ·            2  ·       9.51  │
····················|·············|·············|·············|·············|···············|··············
|  AODPrivateSale   ·  trigger    ·          -  ·          -  ·      29219  ·            1  ·       3.08  │
····················|·············|·············|·············|·············|···············|··············
|  AODPrivateSale   ·  vest       ·     136572  ·     187884  ·     162228  ·            2  ·      17.09  │
····················|·············|·············|·············|·············|···············|··············
|  AODToken         ·  grantRole  ·          -  ·          -  ·     101228  ·            2  ·      10.67  │
····················|·············|·············|·············|·············|···············|··············
|  Deployments                    ·                                         ·  % of limit   ·             │
··································|·············|·············|·············|···············|··············
|  AODMysteryChest                ·          -  ·          -  ·    2671762  ·       21.5 %  ·     281.50  │
··································|·············|·············|·············|···············|··············
|  AODPresale                     ·          -  ·          -  ·    1990022  ·         16 %  ·     209.67  │
··································|·············|·············|·············|···············|··············
|  AODPrivateSale                 ·          -  ·          -  ·    1990046  ·         16 %  ·     209.67  │
··································|·············|·············|·············|···············|··············
|  AODToken                       ·          -  ·          -  ·    2074021  ·       16.7 %  ·     218.52  │
·---------------------------------|-------------|-------------|-------------|---------------|-------------·
</pre>

## 4. Faucets

 - https://testnet.venus.io/faucet
 - https://testnet.binance.org/faucet-smart

## 5. Verifying Contracts

```bash
$ npx hardhat verify --network mainnet DEPLOYED_TOKEN_CONTRACT_ADDRESS
$ npx hardhat verify --network mainnet DEPLOYED_TOKEN_SALE_CONTRACT_ADDRESS "AOD_CONTRACT_ADDRESS" "BUSD_CONTRACT_ADDRESS" "FUND_WALLET_ADDRESS"
```

