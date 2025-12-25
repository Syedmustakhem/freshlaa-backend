import { API } from "./api";

export const getProducts = async () => {
  const res = await fetch(API.products);
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
};

export const searchProducts = async (query) => {
  const res = await fetch(`${API.products}/search?q=${query}`);
  if (!res.ok) throw new Error("Search failed");
  return res.json();
};

export const getByCategory = async (category) => {
  const res = await fetch(`${API.products}/category/${category}`);
  if (!res.ok) throw new Error("Category fetch failed");
  return res.json();
};
