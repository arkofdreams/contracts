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
      - Creates vesting wallets
      - Accepts BUSD
    - Vesting Wallet Contract
      - Start Date
      - Locked Duration
      - Vested Duration

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
|  Methods                        ·              200 gwei/gas               ·       553.86 usd/bnb        │
····················|·············|·············|·············|·············|···············|··············
|  Contract         ·  Method     ·  Min        ·  Max        ·  Avg        ·  # calls      ·  usd (avg)  │
····················|·············|·············|·············|·············|···············|··············
|  AODMysteryChest  ·  lazyMint   ·      67492  ·     104200  ·      77298  ·            4  ·       8.56  │
····················|·············|·············|·············|·············|···············|··············
|  AODMysteryChest  ·  mint       ·          -  ·          -  ·      98204  ·            3  ·      10.88  │
····················|·············|·············|·············|·············|···············|··············
|  AODToken         ·  grantRole  ·     100844  ·     101228  ·     101036  ·            2  ·      11.19  │
····················|·············|·············|·············|·············|···············|··············
|  AODTokenSale     ·  addStage   ·          -  ·          -  ·     115894  ·            1  ·      12.84  │
····················|·············|·············|·············|·············|···············|··············
|  AODTokenSale     ·  vest       ·          -  ·          -  ·     873281  ·            1  ·      96.74  │
····················|·············|·············|·············|·············|···············|··············
|  VestingWallet    ·  release    ·      57211  ·      91411  ·      74311  ·            2  ·       8.23  │
····················|·············|·············|·············|·············|···············|··············
|  Deployments                    ·                                         ·  % of limit   ·             │
··································|·············|·············|·············|···············|··············
|  AODMysteryChest                ·          -  ·          -  ·    2671762  ·       21.5 %  ·     295.96  │
··································|·············|·············|·············|···············|··············
|  AODToken                       ·          -  ·          -  ·    2095754  ·       16.8 %  ·     232.15  │
··································|·············|·············|·············|···············|··············
|  AODTokenSale                   ·          -  ·          -  ·    2387160  ·       19.2 %  ·     264.43  │
·---------------------------------|-------------|-------------|-------------|---------------|-------------·
</pre>