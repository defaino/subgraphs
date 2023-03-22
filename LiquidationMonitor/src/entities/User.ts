import { Address, BigInt } from "@graphprotocol/graph-ts";
import { User } from "../../generated/schema";

export function getUser(userAddress: Address): User {
  let user = User.load(userAddress);

  if (user == null) {
    user = new User(userAddress);

    user.borowed = BigInt.zero();
    user.liquidationAmount = BigInt.zero();
  }

  return user;
}
