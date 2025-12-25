import { API } from "./api";

export const loginUser = async (phone) => {
  const res = await fetch(`${API.auth}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });

  if (!res.ok) throw new Error("Login failed");
  return res.json();
};
