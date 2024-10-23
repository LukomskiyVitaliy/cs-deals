import express, { Request, Response } from 'express';
import axios from 'axios';
import cors from 'cors';
import { LootFarmItem, ItemFilter, CsDealsItem } from './interface'
import { CsDealsSevice } from './cs-deals-service'
import * as fs from 'fs';
import path from 'path';
import * as readline from 'readline';

const app = express();
const PORT = 3000;
const FILEPATH = './filters.json'

let service = new CsDealsSevice();


app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, './dist')));




// Маршрут для отримання даних з CSDeals
app.get('/api/csdeals', async (req: Request, res: Response) => {
    try {
        // Запит до CSDeals API
        const response = await axios.get('https://cs.deals/API/IPricing/GetLowestPrices/v1?appid=252490');
        const csDealsItems: CsDealsItem[] = response.data.response.items;

        res.json(csDealsItems); // Відправляємо клієнту отримані дані
    } catch (error) {
        console.error('Error fetching CSDeals items:', error);
        res.status(500).json({ error: 'Error fetching CSDeals items' });
    }
});

app.get('/api/getFilters', async (req: Request, res: Response) => {
    try {
        const response = await axios.get<LootFarmItem[]>('https://loot.farm/fullpriceRUST.json');
        const lootFarmItems: LootFarmItem[] = response.data;
        // Мапимо кожен елемент (можна додати свою логіку)
        const filters = lootFarmItems.map(item => mapLootFarmItemtoItemFilter(item));
        ensureFileExists();
        const data = fs.readFileSync(FILEPATH, 'utf8');


        res.json(filters.concat(JSON.parse(data) as ItemFilter[])); // Відправляємо клієнту відфільтровані дані
    }
    catch (error) {
        console.error('Error fetching CSDeals items:', error);
        res.status(500).json({ error: 'Error fetching LootFarm items' });
    }

});

app.post('/api/toggleShoppingOn', async (req: Request, res: Response) => {
    const filters: ItemFilter[] = req.body.filters;
    service.setFilters(filters);
    service.startLoop();
    res.sendStatus(200);
});

app.post('/api/addFilter', async (req: Request, res: Response) => {
    const filter: ItemFilter = req.body.filter;
    ensureFileExists();
    try {
        const data = fs.readFileSync(FILEPATH, 'utf8');
        const filters: ItemFilter[] = JSON.parse(data);

        // Додаємо новий фільтр до масиву
        filters.push(filter);

        // Перезаписуємо файл з оновленим масивом
        fs.writeFileSync(FILEPATH, JSON.stringify(filters, null, 2), 'utf8');
        console.log('Фільтр успішно додано!');
        res.sendStatus(200);
    } catch (err) {
        console.error('Error writing file:', err);
        res.sendStatus(500);
    }
});

app.post('/api/deleteFilter', async (req: Request, res: Response) => {
    const filterName: string = req.body.filterName;
    try {
        ensureFileExists();
        let data = JSON.parse(fs.readFileSync(FILEPATH, 'utf8')) as ItemFilter[];
        fs.writeFileSync(FILEPATH, JSON.stringify(data.filter(filter => filter.itemName !== filterName), null, 2), 'utf8');
        res.sendStatus(200);
    } catch (err) {
        console.error('Error writing file:', err);
        res.sendStatus(500);
    }
});

app.get('/api/toggleShoppingOff', async (req: Request, res: Response) => {
    service.stopLoop();
    res.sendStatus(200);

});

app.get('/api/getServiceActiveFilters', async (req: Request, res: Response) => {
    res.json(service.getFilters()); // Відправляємо клієнту відфільтровані дані

});


app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, './dist/index.html'));
});

// Слухаємо на порту
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Press any key to exit...\n', () => {
    rl.close();
});

// Додаємо мапінг для LootFarmItem, якщо потрібно
function mapLootFarmItemtoItemFilter(item: LootFarmItem): any {
    return {
        itemName: item.name,
        minPrice: item.price / 100,
        maxPrice: item.price / 100,
        minDiscount: 0,
        active: false,
        amount: 0
    };
}

function ensureFileExists(): void {
    if (!fs.existsSync(FILEPATH)) {
        fs.writeFileSync(FILEPATH, '[]', 'utf8');  // Create the file with an empty array
        console.log('File created:', FILEPATH);
    }
};



