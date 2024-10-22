export interface ItemFilter {
    itemName: string;
    minPrice: number;
    maxPrice: number;
    minDiscount: number;
    active: boolean;
    amount: number;
    userCreated: boolean;
}