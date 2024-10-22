"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const cors_1 = __importDefault(require("cors"));
const cs_deals_service_1 = require("./cs-deals-service");
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const readline = __importStar(require("readline"));
const app = (0, express_1.default)();
const PORT = 3000;
const FILEPATH = './filters.json';
let service = new cs_deals_service_1.CsDealsSevice();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, './dist')));
// Маршрут для отримання даних з CSDeals
app.get('/api/csdeals', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Запит до CSDeals API
        const response = yield axios_1.default.get('https://cs.deals/API/IPricing/GetLowestPrices/v1?appid=252490');
        const csDealsItems = response.data.response.items;
        res.json(csDealsItems); // Відправляємо клієнту отримані дані
    }
    catch (error) {
        console.error('Error fetching CSDeals items:', error);
        res.status(500).json({ error: 'Error fetching CSDeals items' });
    }
}));
app.get('/api/getFilters', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield axios_1.default.get('https://loot.farm/fullpriceRUST.json');
    const lootFarmItems = response.data;
    // Мапимо кожен елемент (можна додати свою логіку)
    const filters = lootFarmItems.map(item => mapLootFarmItemtoItemFilter(item));
    ensureFileExists();
    const data = fs.readFileSync(FILEPATH, 'utf8');
    res.json(filters.concat(JSON.parse(data))); // Відправляємо клієнту відфільтровані дані
}));
app.post('/api/toggleShoppingOn', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const filters = req.body.filters;
    service.setFilters(filters);
    service.startLoop();
    res.sendStatus(200);
}));
app.post('/api/addFilter', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const filter = req.body.filter;
    ensureFileExists();
    try {
        const data = fs.readFileSync(FILEPATH, 'utf8');
        const filters = JSON.parse(data);
        // Додаємо новий фільтр до масиву
        filters.push(filter);
        // Перезаписуємо файл з оновленим масивом
        fs.writeFileSync(FILEPATH, JSON.stringify(filters, null, 2), 'utf8');
        console.log('Фільтр успішно додано!');
        res.sendStatus(200);
    }
    catch (err) {
        console.error('Error writing file:', err);
        res.sendStatus(500);
    }
}));
app.post('/api/deleteFilter', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const filterName = req.body.filterName;
    try {
        ensureFileExists();
        let data = JSON.parse(fs.readFileSync(FILEPATH, 'utf8'));
        fs.writeFileSync(FILEPATH, JSON.stringify(data.filter(filter => filter.itemName !== filterName), null, 2), 'utf8');
        res.sendStatus(200);
    }
    catch (err) {
        console.error('Error writing file:', err);
        res.sendStatus(500);
    }
}));
app.get('/api/toggleShoppingOff', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    service.stopLoop();
    res.sendStatus(200);
}));
app.get('/api/getServiceActiveFilters', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json(service.getFilters()); // Відправляємо клієнту відфільтровані дані
}));
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, './dist/index.html'));
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
function mapLootFarmItemtoItemFilter(item) {
    return {
        itemName: item.name,
        minPrice: item.price / 100,
        maxPrice: item.price / 100,
        minDiscount: 0,
        active: false,
        amount: 0
    };
}
function ensureFileExists() {
    if (!fs.existsSync(FILEPATH)) {
        fs.writeFileSync(FILEPATH, '[]', 'utf8'); // Create the file with an empty array
        console.log('File created:', FILEPATH);
    }
}
;
