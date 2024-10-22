"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CsDealsSevice = void 0;
const playwright_1 = require("playwright");
const axios_1 = __importDefault(require("axios"));
class CsDealsSevice {
    constructor() {
        this.browser = null; // Збереження стану браузера
        this.page = null; // Сторінка браузера
        this.url = "https://cs.deals/ru/market/"; // URL сторінки для скрапінгу
        this.filters = [];
        this.isBuying = false;
        this.intervalId = null;
        this.initBrowser();
    }
    // Метод для запуску браузера і переходу на сторінку
    initBrowser() {
        return __awaiter(this, void 0, void 0, function* () {
            this.browser = yield playwright_1.chromium.launch({ headless: false });
            this.page = yield this.browser.newPage();
            yield this.openPage();
            yield this.setCurrencyToUSD();
        });
    }
    setFilters(itemFilters) {
        this.filters = itemFilters;
    }
    // Метод для закриття браузера
    closeBrowser() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.browser) {
                yield this.browser.close();
            }
        });
    }
    startLoop() {
        if (!this.isBuying) {
            this.isBuying = true;
            this.intervalId = setInterval(() => {
                this.monitor();
            }, 5000); // Виконувати код кожні 5 секунд
            console.log('Почали покупки.');
        }
        else {
            console.log('Вже купляємо.');
        }
    }
    // Метод для зупинки вічного циклу
    stopLoop() {
        if (this.isBuying && this.intervalId) {
            clearInterval(this.intervalId);
            this.isBuying = false;
            this.intervalId = null;
            console.log('Покупки зупинено.');
        }
        else {
            console.log('Покупки не відбуваються.');
        }
    }
    // Дія, яка виконується в циклі
    monitor() {
        return __awaiter(this, void 0, void 0, function* () {
            const csDealsItems = (yield this.getCsDealsItems()).filter(item => {
                return this.filters.some(filter => {
                    return item.marketname == filter.itemName &&
                        item.lowest_price <= filter.maxPrice;
                });
            });
            for (const item of csDealsItems) {
                yield this.buyItem(item);
            }
        });
    }
    buyItem(item) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.page) {
                try {
                    yield this.searchItem(item);
                    const addedToCart = yield this.addItemToCart(item);
                    if (addedToCart == 0) {
                        return;
                    }
                    yield this.openCart();
                    const operationSucces = yield this.purchaseItem();
                    if (operationSucces) {
                        const filter = this.filters.find(filter => filter.itemName === item.marketname);
                        if (filter === null || filter === void 0 ? void 0 : filter.amount) {
                            filter.amount -= addedToCart;
                        }
                    }
                }
                catch (error) {
                    console.error("Сталася помилка: ", error);
                }
            }
            else {
                console.error("Сторінка не ініціалізована");
            }
        });
    }
    openPage() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.page)
                yield this.page.goto(this.url);
        });
    }
    setCurrencyToUSD() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.page) {
                yield this.page.waitForSelector('#currencyDropdownLink', { state: 'visible' });
                yield this.page.click('#currencyDropdownLink');
                yield this.page.waitForSelector('[data-iso="USD"]', { state: 'visible' });
                yield this.page.click('[data-iso="USD"]');
            }
        });
    }
    searchItem(item) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.page) {
                yield this.page.goto(encodeURI(`https://cs.deals/ru/market/rust/?min_price=${(item.lowest_price - 0.2).toString()}&max_price=${(item.lowest_price + 0.2).toString()}&name=${(item.marketname.trim())}&sort=price&sort_desc=1`));
            }
        });
    }
    addItemToCart(item) {
        return __awaiter(this, void 0, void 0, function* () {
            let actualAmount = 0;
            if (this.page) {
                const response = yield this.page.waitForResponse(response => response.url() === 'https://cs.deals/ru/ajax/marketplace-search' && response.status() === 200);
                const itemCard = yield this.page.waitForSelector('.item', { timeout: 5000, state: 'visible' });
                if (!itemCard) {
                    console.log("Предмет не було знайдено");
                    return 0;
                }
                yield itemCard.click();
                const amountFrame = yield this.page.$('.add-to-cart-amount');
                const filter = this.filters.find(filter => filter.itemName === item.marketname);
                if (amountFrame && filter) {
                    yield amountFrame.fill(filter.amount.toString());
                    const amountFrameValue = yield amountFrame.inputValue();
                    actualAmount = Number(amountFrameValue);
                    yield amountFrame.press('Enter');
                }
                else if (!amountFrame && filter) {
                    actualAmount = 1;
                }
            }
            return actualAmount;
        });
    }
    openCart() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.page) {
                yield this.page.click('#marketplace-open-cart-btn');
                yield this.page.waitForResponse(response => response.url().includes('cart') && response.status() === 200);
            }
        });
    }
    purchaseItem() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.page) {
                const buyButton = yield this.page.$('.fab.fa-bitcoin');
                if (!buyButton) {
                    console.log('Неавторизований на сайті. Будь ласка авторизуйтеся');
                    return false;
                }
                yield buyButton.click();
                const isDisabled = yield this.page.$eval('#cart-btc-purchase-button', (button) => button.disabled);
                if (!isDisabled) {
                    yield this.page.click('#cart-btc-purchase-button');
                    yield this.page.click('.acceptButton');
                    return true;
                }
                else {
                    console.log('Недостатньо коштів для покупки');
                    return false;
                }
            }
            return false;
        });
    }
    getCsDealsItems() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get('https://cs.deals/API/IPricing/GetLowestPrices/v1?appid=252490');
            return response.data.response.items;
        });
    }
}
exports.CsDealsSevice = CsDealsSevice;
