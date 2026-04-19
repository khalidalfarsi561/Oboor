export type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
};

export const products: Product[] = [
  {
    id: "digital-item-a",
    name: "Digital Item A",
    price: 2,
    description: "Unlocks a clean cosmetic boost for your collection.",
  },
  {
    id: "digital-item-b",
    name: "Digital Item B",
    price: 4,
    description: "Premium themed item with a stronger visual impact.",
  },
  {
    id: "digital-item-c",
    name: "Digital Item C",
    price: 6,
    description: "High-tier digital reward for dedicated players.",
  },
];
