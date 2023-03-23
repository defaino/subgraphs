import { GlobalList } from "../../generated/schema";
import { GLOBAL_LIST_ID } from "./Globals";

export function getGlobalList(): GlobalList {
  let globalList = GlobalList.load(GLOBAL_LIST_ID);

  if (globalList == null) {
    globalList = new GlobalList(GLOBAL_LIST_ID);

    globalList.list = new Array();
    globalList.liquidationList = new Array();
  }

  return globalList;
}
