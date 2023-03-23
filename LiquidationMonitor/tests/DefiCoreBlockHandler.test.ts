import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { getBlock, getNextBlock, getTransaction } from "./utils";
import { assert, beforeAll, createMockedFunction, describe, test } from "matchstick-as";
import { getUser } from "../src/entities/User";
import { getGlobalList } from "../src/entities/GlobalList";
import { createBorrowed } from "./DefiCore.test";
import { onBlock, onBorrowed } from "../src/mappings/DefiCore";
import { DEFE_CORE_ADDRESS, GLOBAL_LIST_ID } from "../src/entities/Globals";

const users = [
  Address.fromString("0x96e08f7d84603AEb97cd1c89A80A9e914f181670"),
  Address.fromString("0x96e08f7d84603AEb97cd1c89A80A9e914f181671"),
  Address.fromString("0x96e08f7d84603AEb97cd1c89A80A9e914f181672"),
  Address.fromString("0x96e08f7d84603AEb97cd1c89A80A9e914f181673"),
  Address.fromString("0x96e08f7d84603AEb97cd1c89A80A9e914f181674"),
  Address.fromString("0x96e08f7d84603AEb97cd1c89A80A9e914f181675"),
  Address.fromString("0x96e08f7d84603AEb97cd1c89A80A9e914f181676"),
];

const amounts = [100, 0, 0, 0, 5, 0, 1];

let block = getBlock(BigInt.zero(), BigInt.zero());
const tx = getTransaction(Bytes.fromByteArray(Bytes.fromBigInt(BigInt.fromI32(1))));
const contractSender = Address.fromString("0x96e08f7d84603AEb97cd1c89A80A9e914f181670");

describe("onBlock", () => {
  beforeAll(() => {
    const recipient = Address.fromString("0x96e08f7d84603AEb97cd1c89A80A9e914f181671");
    const assetKey = Bytes.fromI32(55);
    const borrowedAmount = BigInt.fromI32(10).times(BigInt.fromI32(18));
    const usdAmount = BigInt.fromI32(10).times(BigInt.fromI32(17));

    for (let i = 0; i < users.length; i++) {
      const event = createBorrowed(users[i], recipient, assetKey, borrowedAmount, contractSender, block, tx);

      onBorrowed(event);
    }

    createMockedFunction(Address.fromString(DEFE_CORE_ADDRESS), "countPools", "countPools(string):(uint256)")
      .withArgs([ethereum.Value.fromAddressArray(users)])
      .returns([ethereum.Value.fromI32Array(amounts)]);
  });

  test("should hanlde block", () => {
    block = getNextBlock(block);
    onBlock(block);

    assert.fieldEquals("GlobalList", GLOBAL_LIST_ID, "liquidationList", "[]");
  });

  test("should handle block range 100", () => {
    for (let i = 1; i <= 100; i++) {
      onBlock(block);
      block = getNextBlock(block);
    }

    assert.fieldEquals(
      "GlobalList",
      GLOBAL_LIST_ID,
      "liquidationList",
      `[${users[0].toHexString()}, ${users[4].toHexString()}, ${users[6].toHexString()}]`
    );
  });
});
