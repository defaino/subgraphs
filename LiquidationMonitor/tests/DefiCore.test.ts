import { Address, Bytes, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { BorrowRepaid, Borrowed } from "../generated/DefiCore/DefiCore";
import { afterEach, assert, clearStore, describe, newMockEvent, test } from "matchstick-as";
import { getBlock, getNextBlock, getNextTx, getTransaction } from "./utils";
import { onBorrowRepaid, onBorrowed } from "../src/mappings/DefiCore";
import { GLOBAL_LIST_ID } from "../src/entities/Globals";

export function createBorrowed(
  borrower: Address,
  recipient: Address,
  assetKey: Bytes,
  borrowedAmount: BigInt,
  sender: Address,
  block: ethereum.Block,
  tx: ethereum.Transaction
): Borrowed {
  let event = changetype<Borrowed>(newMockEvent());
  event.parameters = new Array();

  event.parameters.push(new ethereum.EventParam("borrower", ethereum.Value.fromAddress(borrower)));
  event.parameters.push(new ethereum.EventParam("recipient", ethereum.Value.fromAddress(recipient)));
  event.parameters.push(new ethereum.EventParam("assetKey", ethereum.Value.fromBytes(assetKey)));
  event.parameters.push(new ethereum.EventParam("borrowedAmount", ethereum.Value.fromUnsignedBigInt(borrowedAmount)));

  event.block = block;
  event.transaction = tx;
  event.address = sender;

  return event;
}

function createBorrowRepaid(
  userAddr: Address,
  assetKey: Bytes,
  repaidAmount: BigInt,
  sender: Address,
  block: ethereum.Block,
  tx: ethereum.Transaction
): BorrowRepaid {
  let event = changetype<BorrowRepaid>(newMockEvent());
  event.parameters = new Array();

  event.parameters.push(new ethereum.EventParam("userAddr", ethereum.Value.fromAddress(userAddr)));
  event.parameters.push(new ethereum.EventParam("assetKey", ethereum.Value.fromBytes(assetKey)));
  event.parameters.push(new ethereum.EventParam("repaidAmount", ethereum.Value.fromUnsignedBigInt(repaidAmount)));

  event.block = block;
  event.transaction = tx;
  event.address = sender;

  return event;
}

const block = getBlock(BigInt.fromI32(1), BigInt.fromI32(1));
const tx = getTransaction(Bytes.fromByteArray(Bytes.fromBigInt(BigInt.fromI32(1))));
const contractSender = Address.fromString("0x96e08f7d84603AEb97cd1c89A80A9e914f181670");

describe("DefiCore", () => {
  test("should handle Borrowed", () => {
    const borrower = Address.fromString("0x96e08f7d84603AEb97cd1c89A80A9e914f181671");
    const recipient = Address.fromString("0x96e08f7d84603AEb97cd1c89A80A9e914f181671");
    const assetKey = Bytes.fromI32(55);
    const borrowedAmount = BigInt.fromI32(10).times(BigInt.fromI32(18));
    const usdAmount = BigInt.fromI32(10).times(BigInt.fromI32(17));

    const event = createBorrowed(borrower, recipient, assetKey, borrowedAmount, contractSender, block, tx);

    onBorrowed(event);

    assert.fieldEquals("User", borrower.toHexString(), "borrowed", usdAmount.toString());
    assert.fieldEquals("GlobalList", GLOBAL_LIST_ID, "list", `[${borrower.toHexString()}]`);
  });

  test("should handle BorrowRepaid", () => {
    const borrower = Address.fromString("0x96e08f7d84603AEb97cd1c89A80A9e914f181671");
    const assetKey = Bytes.fromI32(55);
    const repaidAmount = BigInt.fromI32(10).times(BigInt.fromI32(18));
    const usdAmount = BigInt.fromI32(10).times(BigInt.fromI32(17)).minus(BigInt.fromI32(1));

    const event = createBorrowRepaid(borrower, assetKey, repaidAmount, contractSender, block, tx);

    onBorrowRepaid(event);

    assert.fieldEquals("User", borrower.toHexString(), "borrowed", "1");
    assert.fieldEquals("GlobalList", GLOBAL_LIST_ID, "list", `[${borrower.toHexString()}]`);
  });

  test("should handle BorrowRepaid and delete borrower from list", () => {
    const borrower = Address.fromString("0x96e08f7d84603AEb97cd1c89A80A9e914f181671");
    const assetKey = Bytes.fromI32(55);
    const repaidAmount = BigInt.fromI32(10).times(BigInt.fromI32(18));
    const usdAmount = BigInt.fromI32(1);

    const event = createBorrowRepaid(borrower, assetKey, repaidAmount, contractSender, block, tx);

    onBorrowRepaid(event);

    assert.fieldEquals("User", borrower.toHexString(), "borrowed", "0");
    assert.fieldEquals("GlobalList", GLOBAL_LIST_ID, "list", `[]`);
  });
});
