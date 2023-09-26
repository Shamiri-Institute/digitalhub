import { typeid } from "typeid-js";

export function objectId(prefix: string) {
  return typeid(prefix).toString();
}
