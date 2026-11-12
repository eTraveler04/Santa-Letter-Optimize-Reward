export type GiftStatus = "free" | "mine" | "taken";

export interface GiftDTO {
  id: number;
  name: string;
  /** cena w złotych */
  price: number;
  priceCents: number;
  url: string;
  rank: number;
  reason: string | null;
  groupId: number | null;
  groupName: string | null;
  groupReason: string | null;
  chosen: boolean;
  /** z perspektywy pytającego Mikołaja */
  status: GiftStatus;
  createdAt: string;
}

export interface GroupDTO {
  id: number;
  name: string;
  reason: string | null;
  giftIds: number[];
  totalPrice: number;
  createdAt: string;
}

export interface ListDTO {
  /** fragment adresu: /l/<slug> */
  slug: string;
  name: string;
  giftCount: number;
  hasPassword: boolean;
  createdAt: string;
}
