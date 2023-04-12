import { Address, BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts";
import { Borrowed, BorrowRepaid, DefiCore } from "../../generated/DefiCore/DefiCore";
import { getUser } from "../entities/User";
import { getGlobalList } from "../entities/GlobalList";
import { extendArray, reduceArray } from "../helpers/ArrayHelper";
import { BATCH_SIZE, BLOCK_INTERVAL, DEFI_CORE_ADDRESS } from "../entities/Globals";

export function onBorrowed(event: Borrowed): void {
  let user = getUser(event.params.borrower);
  let globalList = getGlobalList();

  user.borrowed = user.borrowed.plus(event.params.borrowedAmountInUSD);

  globalList.list = extendArray(globalList.list, [user.id]);

  globalList.save();
  user.save();
}

export function onBorrowRepaid(event: BorrowRepaid): void {
  let user = getUser(event.params.userAddr);
  let globalList = getGlobalList();

  user.borrowed = user.borrowed.minus(event.params.repaidAmountInUSD);

  if (user.borrowed.equals(BigInt.zero())) {
    globalList.list = reduceArray(globalList.list, [user.id]);
  }

  globalList.save();
  user.save();
}

export function onBlock(block: ethereum.Block): void {
  if (block.number.mod(BigInt.fromI32(BLOCK_INTERVAL)).equals(BigInt.zero())) {
    let globalList = getGlobalList();
    if (globalList.list.length > 0) {
      let dcProptotype = DefiCore.bind(Address.fromString(DEFI_CORE_ADDRESS));
      let iters = Math.ceil(F64.parseFloat(globalList.list.length.toString()) / BATCH_SIZE);
      let newLiquidationList = new Array<Bytes>();

      for (let i = 0; i < iters; i++) {
        let currentInterval = globalList.list.slice(BATCH_SIZE * i, BATCH_SIZE * (i + 1));
        let addressArray = bytesArrayToAddressArray(currentInterval);

        let response = dcProptotype.try_getAvailableLiquidityBatch(addressArray);

        if (!response.reverted) {
          newLiquidationList = extendArray(
            newLiquidationList,
            getLiqudationAddresses(response.value.getDebtsArr_(), currentInterval)
          );
        } else {
          log.warning("function is reverted, interval ({} ; {}), in block {}", [
            BigInt.fromI32(BATCH_SIZE * i).toString(),
            BATCH_SIZE.toString(),
            block.number.toString(),
          ]);
        }
      }
      globalList.liquidationList = newLiquidationList;
    }
    globalList.save();
  }
}

function getLiqudationAddresses(balances: Array<BigInt>, users: Array<Bytes>): Array<Bytes> {
  let toLiquidation = new Array<Bytes>();
  for (let i = 0; i < balances.length; i++) {
    if (balances[i].gt(BigInt.zero())) {
      toLiquidation.push(users[i]);
    }
  }

  return toLiquidation;
}

function bytesArrayToAddressArray(array: Array<Bytes>): Array<Address> {
  let addressArray = new Array<Address>();

  for (let i = 0; i < array.length; i++) {
    addressArray.push(Address.fromBytes(array[i]));
  }

  return addressArray;
}
