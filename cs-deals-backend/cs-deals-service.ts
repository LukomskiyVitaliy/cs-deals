import { chromium, Browser, Page } from 'playwright';
import { ItemFilter, CsDealsItem, LootFarmItem } from './interface';
import axios from 'axios'

export class CsDealsSevice {
    private browser: Browser | null = null;  // Збереження стану браузера
    private page: Page | null = null;        // Сторінка браузера
    private url: string = "https://cs.deals/ru/market/"; // URL сторінки для скрапінгу
    private filters: ItemFilter[] = [];
    private isBuying: boolean = false;
    private intervalId: NodeJS.Timeout | null = null;

    constructor() {
        this.initBrowser();
    }

    // Метод для запуску браузера і переходу на сторінку
    public async initBrowser(): Promise<void> {
        this.browser = await chromium.launch({ headless: false });
        this.page = await this.browser.newPage();
        await this.openPage();
        await this.setCurrencyToUSD();
    }

    public setFilters(itemFilters: ItemFilter[]) {
        this.filters = itemFilters;
    }

    // Метод для закриття браузера
    public async closeBrowser(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
        }
    }

    public startLoop(): void {
        if (!this.isBuying) {
            this.isBuying = true;
            this.intervalId = setInterval(() => {
                this.monitor();
            }, 5000); // Виконувати код кожні 5 секунд
            console.log('Почали покупки.');
        } else {
            console.log('Вже купляємо.');
        }
    }

    // Метод для зупинки вічного циклу
    public stopLoop(): void {
        if (this.isBuying && this.intervalId) {
            clearInterval(this.intervalId);
            this.isBuying = false;
            this.intervalId = null;
            console.log('Покупки зупинено.');
        } else {
            console.log('Покупки не відбуваються.');
        }
    }

    // Дія, яка виконується в циклі
    private async monitor(): Promise<void> {
        const csDealsItems = (await this.getCsDealsItems()).filter(item => {
            return this.filters.some(filter => {
                return item.marketname == filter.itemName &&
                    item.lowest_price <= filter.maxPrice
            })
        });
        for (const item of csDealsItems) {
            await this.buyItem(item);
        }
    }



    public async buyItem(item: CsDealsItem): Promise<void> {
        if (this.page) {
            try {
                await this.searchItem(item);

                const addedToCart = await this.addItemToCart(item);
                if (addedToCart == 0) {
                    return;
                }

                await this.openCart();
                const operationSucces = await this.purchaseItem();
                if (operationSucces) {
                    const filter = this.filters.find(filter => filter.itemName === item.marketname);
                    if (filter?.amount) {
                        filter.amount -= addedToCart;
                    }

                }

            } catch (error) {
                console.error("Сталася помилка: ", error);
            }
        } else {
            console.error("Сторінка не ініціалізована");
        }
    }

    async openPage() {
        if (this.page)
            await this.page.goto(this.url);
    }

    async setCurrencyToUSD() {
        if (this.page) {
            await this.page.waitForSelector('#currencyDropdownLink', { state: 'visible' });
            await this.page.click('#currencyDropdownLink');
            await this.page.waitForSelector('[data-iso="USD"]', { state: 'visible' });
            await this.page.click('[data-iso="USD"]');
        }
    }

    async searchItem(item: CsDealsItem) {
        if (this.page) {
            await this.page.goto(encodeURI(`https://cs.deals/ru/market/rust/?min_price=${(item.lowest_price - 0.2).toString()}&max_price=${(item.lowest_price + 0.2).toString()}&name=${(item.marketname.trim())}&sort=price&sort_desc=1`))
        }
    }

    async addItemToCart(item: CsDealsItem) {
        let actualAmount = 0;
        if (this.page) {
            const response = await this.page.waitForResponse(response =>
                response.url() === 'https://cs.deals/ru/ajax/marketplace-search' && response.status() === 200
            );
            const itemCard = await this.page.waitForSelector('.item', { timeout: 5000, state: 'visible' });
            if (!itemCard) {
                console.log("Предмет не було знайдено");
                return 0;
            }

            await itemCard.click();
            const amountFrame = await this.page.$('.add-to-cart-amount');
            const filter = this.filters.find(filter => filter.itemName === item.marketname);


            if (amountFrame && filter) {
                await amountFrame.fill(filter.amount.toString());
                const amountFrameValue = await amountFrame.inputValue();
                actualAmount = Number(amountFrameValue);
                await amountFrame.press('Enter');
            } else if (!amountFrame && filter) {
                actualAmount = 1;
            }


        }
        return actualAmount;
    }

    async openCart() {
        if (this.page) {
            await this.page.click('#marketplace-open-cart-btn');
            await this.page.waitForResponse(response =>
                response.url().includes('cart') && response.status() === 200
            );
        }
    }

    async purchaseItem(): Promise<boolean> {
        if (this.page) {
            const buyButton = await this.page.$('.fab.fa-bitcoin');
            if (!buyButton) {
                console.log('Неавторизований на сайті. Будь ласка авторизуйтеся');
                return false;
            }

            await buyButton.click();

            const isDisabled = await this.page.$eval('#cart-btc-purchase-button', (button) => (button as HTMLButtonElement).disabled);

            if (!isDisabled) {
                await this.page.click('#cart-btc-purchase-button');
                await this.page.click('.acceptButton');
                return true;
            } else {
                console.log('Недостатньо коштів для покупки');
                return false;
            }
        }
        return false;

    }

    private async getCsDealsItems(): Promise<CsDealsItem[]> {
        const response = await axios.get('https://cs.deals/API/IPricing/GetLowestPrices/v1?appid=252490');
        return response.data.response.items;
    }
}