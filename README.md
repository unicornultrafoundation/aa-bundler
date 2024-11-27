# versatile AA bundler for U2U ecosystem

### Mainnet/Testnet Setup:

### Local Setup:
In order to implement the full spec storage access rules and opcode banning, it must run against a Geth compatible node which supports debug_traceCall.

1. Due to EIP155 protection, you need to deploy determistic-deployer contract yourself and set it with env (obviously not "determistic" anymore). Or you can run node with `--rpc.allow-unprotected-txs` to skip the fixes
-    `packages/utils/src/DeterministicDeployer.ts:40`
-    `u2u attach`
-        `tx = web3.u2u.sendTransaction({from: '0x239fa7623354ec26520de878b52f13fe84b06971', data: '0x604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3'});`
-        `web3.u2u.sendTransaction({from: '0x239fa7623354ec26520de878b52f13fe84b06971', to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', value: 1000e18});`
-        `web3.u2u.getTransactionReceipt(tx);`
-    `export LOCAL=1 DEPLOYER=0x`
2.  Deploy entryPoint
-   `yarn hardhat-deploy --network localhost`
3.  Update
-   `packages/bundler/localconfig/bundler.config.json` with newly deployed entryPoint
4.  Run bundler
-   `yarn bundler --unsafe --show-stack-traces`
5.  And tests
-   `yarn runop --deployFactory --network http://127.0.0.1:8545 --mnemonic key.txt --nonce 10001 --entryPoint 0x`

## SDK and Wallets
