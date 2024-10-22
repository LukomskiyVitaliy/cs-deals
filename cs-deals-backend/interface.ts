// Інтерфейс для типів (замінити на реальні типи)
export interface LootFarmItem {
    name: string;
    price: number;
    have: number;
    max: number;
    rate: number;
}

export interface CsDealsItem {
    marketname: string;
    lowest_price: number;
}

export interface ItemFilter {
    itemName: string;
    minPrice: number;
    maxPrice: number;
    minDiscount: number;
    active: boolean;
    amount: number;
    userCreated: boolean;
}