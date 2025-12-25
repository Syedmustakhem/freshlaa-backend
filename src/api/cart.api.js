import { API } from "./api";
import { getToken } from "../utils/token";

export const syncCart = async (cart) => {
  const token = await getToken();

  const res = await fetch(`${API.cart}/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ cart }),
  });

  if (!res.ok) throw new Error("Cart sync failed");
  return res.json();
};
