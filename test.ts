/**
 * Plain samples code for standard Account Abstraction with Paymaster
 * If not deployed, run deploy() in separate script first then fill out config for better coherent results
 * What it do:
 * 0. Deployed (if enabled)
 * 1. Fully init the SDK (v0.7)
 * 2. Send tx with smart account own money (using provider wrapper)
 * 3. Mint and send ERC20 using money sponsored by requesting key from a paymaster (verifying type)
*/

import { ethers } from 'ethers';
import { SimpleAccountAPI, ERC4337EthersProvider, HttpRpcClient } from './packages/sdk';
import { DeterministicDeployer } from './packages/utils';
// { packUserOp }

// contracts
import { IEntryPoint__factory } from './submodules/account-abstraction/typechain/factories/contracts/interfaces/IEntryPoint__factory';
import { TestToken__factory } from './submodules/account-abstraction/typechain/factories/contracts/test/TestToken__factory';

import { SimpleAccountFactory__factory } from './submodules/account-abstraction/contracts/types/factories/SimpleAccountFactory__factory';
import { VerifyingPaymaster__factory } from './submodules/account-abstraction/contracts/types/factories/VerifyingPaymaster__factory';
//import { UserOperationStruct } from './submodules/account-abstraction/contracts/types/VerifyingPaymaster';

// signing key for this type of smart account
// its address will be bound to this key too and no funds needed for this account
const key = '0xed9fd4a8e268f724e9aa7787b556419b0cc42927be6c11632fa3991354a76233';

// wallet with native coin
const deployer = key;

// only entryPointAddress, bundlerUrl, rpcUrl is global
const config = {
  // '0x65619456Bd4221a35C886B69838Cd2a15cb437Db' || '0x12900bBD3E8178700877CE546275B117d16cD838'
  paymasterAddress: '0xf1B7588A3E9C1b07521E7058e46c942876e90Fe0',
  factoryAddress: '0xf17bbeF5aCb9aCc410cf6D48218b8D3Ee05837e9',
  tokenAddress: '0xa80189B35C39E9cAabb56e1438d30BBEd45B2DB3',
  entryPointAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
  walletAddress: '',
  redeploy: false,

  bundlerUrl: 'https://bundler.khoa.io.vn/rpc' || 'https://bundler-dev.u2u.xyz/rpc',
  rpcUrl: 'https://rpc-nebulas-testnet.u2u.xyz',
  chainId: 2484
};

const deploy = async () => {
  const signer = new ethers.Wallet(deployer, rpc);
  const dd = new DeterministicDeployer(rpc, signer);
  const value = ethers.utils.parseEther('0.1');

  // entryPoint is predeployed
  console.log('deploy():');
  config.factoryAddress = (await (new SimpleAccountFactory__factory(signer)).deploy(config.entryPointAddress)).address;
  console.log('deploy():');
  config.paymasterAddress = (await (new VerifyingPaymaster__factory(signer)).deploy(config.entryPointAddress, signer.address)).address;
  console.log('deploy():');
  config.tokenAddress = (await (new TestToken__factory(signer)).deploy()).address;

  //await dd.deterministicDeploy(new SimpleAccountFactory__factory(signer), '0', [config.entryPointAddress]);
  //await dd.deterministicDeploy(new VerifyingPaymaster__factory(signer), '0', [config.entryPointAddress, signer.address]);
  //await dd.deterministicDeploy(new TestToken__factory(signer), '0');

  // fund the paymaster and smart account
  config.walletAddress = await sa.getCounterFactualAddress();
  console.log('deposit():');
  await signer.sendTransaction({ to: config.paymasterAddress, value, data: '0xd0e30db0' });
  console.log('transfer():');
  await signer.sendTransaction({ to: config.walletAddress, value });

  console.log('deployed:', config);
};

const rpc = new ethers.providers.JsonRpcProvider(config.rpcUrl);
const signer = new ethers.Wallet(key, rpc);
const sa = new SimpleAccountAPI({...config, owner: signer, provider: rpc});
const paymaster = VerifyingPaymaster__factory.connect(config.paymasterAddress, rpc);
//const erc20 = TestToken__factory.connect(config.tokenAddress, rpc);

const provider = new ERC4337EthersProvider(
  config.chainId,
  config,
  signer,
  rpc,
  new HttpRpcClient(config.bundlerUrl, config.entryPointAddress, config.chainId),
  IEntryPoint__factory.connect(config.entryPointAddress, rpc),
  sa
);
const $ = provider.getSigner();

const send = (to: string, value: ethers.BigNumberish = 0, data = '0x') =>
  $.sendTransaction({ to, value, data }).then(tx => {
    console.log('send: tx =', tx);
    return tx.wait().then(_ => {
      console.log('send: receipt =', _);
      return _;
    });
  });

const pack = (until: number, from = 0, sig = '0x' + '00'.repeat(65)) => paymaster.address.toLowerCase() + ethers.utils.defaultAbiCoder.encode(['uint48', 'uint48'], [until, from]).substring(2) + sig.substring(2);
// as simple as possible

const fill = (target: string, data = '0x', expiry = 3600) =>
  sa.createUnsignedUserOp({ target, data }).then(op => {
    const now = ~~(Date.now()/1000);
    const until = now + expiry;

    console.log('op: orig =', op);

    op.preVerificationGas = 50000;
    //op.callGasLimit = await provider.estimateGas({ to: target, data });
    //op.maxFeePerGas = ethers.BigNumber.from(op.maxFeePerGas).add(1e9);
    //op.maxPriorityFeePerGas = ethers.BigNumber.from(op.maxPriorityFeePerGas).add(1e9);

    return Promise.all([
      // getHash: sender, nonce, initCode, callData, paymasterAndData(without sig), preVerificationGas, chainid, paymaster, until, after
      //paymaster.getHash({ ...op, paymasterAndData: pack(until, now), initCode: '0x', signature: '0x' }, until, now),
      //paymaster.verifyingSigner(),
      paymaster.getDeposit()
    ]).then(async (ret) => {
      console.log('hash/signer/deposit:', ret);

      Object.assign(op, {
        paymaster: config.paymasterAddress,
        paymasterVerificationGasLimit: 200_000,
        paymasterPostOpGasLimit: 0,
        paymasterData: pack(until, now, await signer.signMessage(ethers.utils.arrayify(ret[0])))
      });

      // nearly last
      op.signature = await sa.signUserOpHash(await sa.getUserOpHash(op));
      // at last
      //op.preVerificationGas = await sa.getPreVerificationGas(op);
      return op;
    });
  })

const test = async () => {
  console.log('testing:\n', 'wallet =', config.walletAddress = await $.getAddress(), 'nonce =', await sa.getNonce(), 'signer =', signer.address);

  const value = ethers.utils.parseEther('0.001');

  // send eth, both to & data required to be valid
  await send(signer.address, value);

  const calls = [
    TestToken__factory.createInterface().encodeFunctionData('mint', [config.walletAddress, value]),
    TestToken__factory.createInterface().encodeFunctionData('transfer', [config.paymasterAddress, value.div(2)]),
    TestToken__factory.createInterface().encodeFunctionData('approve', [config.walletAddress, value])
  ];

  const op = await fill(config.tokenAddress, calls[0]);
  console.log('op: filled =', op);

  await provider.httpRpcClient.sendUserOpToBundler(op).then(tx => {
    //console.log(await provider.getTransaction(tx));
    //console.log(await provider.httpRpcClient.getUserOp(tx).then(_ => console.error(_)));
    console.log('send: tx =', tx);
    return provider.waitForTransaction(tx).then(_ => {
      console.log('send: receipt =', _);
    });
  });
};

if (!config.factoryAddress || !config.paymasterAddress || !config.tokenAddress || config.redeploy) {
  deploy();
} else {
  test();
}

/*
{
  sender: '0xDf62d259018e9de149636084A3ceeDE448d9FFE1',
  nonce: '0x0',
  factory: '0xf17bbeF5aCb9aCc410cf6D48218b8D3Ee05837e9',
  factoryData: '0x5fbfb9cf000000000000000000000000326da2e79418b5e275e2c527f350114152cbf7a00000000000000000000000000000000000000000000000000000000000000000',
  callData: '0xb61d27f6000000000000000000000000df62d259018e9de149636084a3ceede448d9ffe100000000000000000000000000000000000000000000000000005af3107a400000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000',
  callGasLimit: '0x5208',
  verificationGasLimit: '0x42f7f',
  maxFeePerGas: '0xd09dc300',
  maxPriorityFeePerGas: '0x59682f00',
  preVerificationGas: '0xae7c',
  signature: '0xd3d07848d79f732ad27418d0f3340e4c4669f4f6f3ec6cdf6d78d442ce0f74e177b0346fb18b06f24d95867cdef16d7d4eeee197e761e32fa8dfb36e4a202a8e1c'
}
{
  hash: '0x55f503cc26911db45e413dd4440f6bab18fe447ebca6d7217f88cdb6b08350bd',
  confirmations: 0,
  from: '0xDf62d259018e9de149636084A3ceeDE448d9FFE1',
  nonce: 0,
  gasLimit: BigNumber { _hex: '0x5208', _isBigNumber: true },
  value: BigNumber { _hex: '0x00', _isBigNumber: true },
  data: '0xb61d27f6000000000000000000000000df62d259018e9de149636084a3ceede448d9ffe100000000000000000000000000000000000000000000000000005af3107a400000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000',
  chainId: 2484,
  wait: [AsyncFunction: wait]
}
> {
  sender: '0xDf62d259018e9de149636084A3ceeDE448d9FFE1',
  nonce: '0x0',
  factory: '0xf17bbeF5aCb9aCc410cf6D48218b8D3Ee05837e9',
  factoryData: '0x5fbfb9cf000000000000000000000000326da2e79418b5e275e2c527f350114152cbf7a00000000000000000000000000000000000000000000000000000000000000000',
  callData: '0xb61d27f6000000000000000000000000df62d259018e9de149636084a3ceede448d9ffe100000000000000000000000000000000000000000000000000005af3107a400000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000',
  callGasLimit: '0x5208',
  verificationGasLimit: '0x42f7f',
  maxFeePerGas: '0xd09dc300',
  maxPriorityFeePerGas: '0x59682f00',
  preVerificationGas: '0xae7c',
  signature: '0xd3d07848d79f732ad27418d0f3340e4c4669f4f6f3ec6cdf6d78d442ce0f74e177b0346fb18b06f24d95867cdef16d7d4eeee197e761e32fa8dfb36e4a202a8e1c'
}
undefined
> $.getAddress()
Promise {
  '0xDf62d259018e9de149636084A3ceeDE448d9FFE1',
  [Symbol(async_id_symbol)]: 5366,
  [Symbol(trigger_async_id_symbol)]: 4
}
*/
/*
{"method":"eth_sendUserOperation","params":[{
  sender: '0x1969fba03185Edb87c26b1f91c9772B0e1096c6b',
  nonce: '0x0',
  factory: '0x4491cb8438c2b714905d067b63fc5d25f15bc800',
  factoryData: '0xbb0b365100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000080f0baf58f26d9145444f9284bdd33e8595ab270887ef6a28f9679c1781600ae7a8b159d58fa30bb6bd8215ac332618ded172184da2817a0c607819845a05de67b00000000000000000000000000000000000000000000000000000000000000165f44646a354c4431666b38394541754373763634644100000000000000000000',
  callData: '0xb61d27f60000000000000000000000001969fba03185edb87c26b1f91c9772b0e1096c6b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000',
  callGasLimit: '0xffff',
  verificationGasLimit: '0xffffff',//'0xd5adf',
  maxFeePerGas: '0xd09dc300',
  maxPriorityFeePerGas: '0x59682f00',
  paymasterAndData: '0x',
  preVerificationGas: '0xffffff',//'0x38630',
  signature: '0xd63979437cd248c5a90dc976cf38df79f5eac1b39ef891458c88edf3f4a52c18d923c3cc68e2c8a42138fe1a79c2a8a970e554e60217f29a0e1236cbe7b10283f393496965313c8ece0b3c710b2b6742847bf51640289bae19aba54dafc6793d00000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000180000000000000000000000000000000000000000000000000000000000000002547f6257c35f3afbe9ea8beda0f26983eaa3e6deb46490235a1c1b7e31c7a9fac1d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000247b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000038222c226f726967696e223a2268747470733a2f2f6170702e6b686f612e696f2e766e222c2263726f73734f726967696e223a66616c73657d0000000000000000'
},"0x0000000071727De22E5E9d8BAf0edAc6f37da032"],"id":44,"jsonrpc":"2.0"}
*/