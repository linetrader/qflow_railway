// src/worker/sweep/types.ts

import type { Contract, Interface, TransactionResponse } from "ethers";

export type Erc20 = Contract & {
  decimals(): Promise<number>;
  balanceOf(addr: string): Promise<bigint>;
  transfer(
    to: string,
    amount: bigint,
    overrides?: { gasLimit?: bigint }
  ): Promise<TransactionResponse>;
  estimateGas: {
    transfer(to: string, amount: bigint): Promise<bigint>;
  };
  interface: Interface;
};

export type AdminWalletLoaded = {
  adminAddress: `0x${string}`;
  adminSigner?: import("ethers").Wallet;
};
