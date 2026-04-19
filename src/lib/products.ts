export type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
};

export const products: Product[] = [
  {
    id: "digital-item-a",
    name: "Neon Badge",
    price: 2,
    description:
      "A lightweight cosmetic preview item with a polished visual accent.",
  },
  {
    id: "digital-item-b",
    name: "Pulse Frame",
    price: 4,
    description:
      "A richer preview reward with a brighter themed finish for future unlocks.",
  },
  {
    id: "digital-item-c",
    name: "Vault Pass",
    price: 6,
    description:
      "A higher-tier placeholder reward that hints at upcoming premium items.",
  },
];
