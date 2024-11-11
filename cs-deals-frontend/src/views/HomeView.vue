<template>
<div class="main">
    <div class="controls">
        <!-- Кнопка Додати фільтр -->
        <div class="form-group">
            <button @click="addFilter" class="btn">{{ showForm ? 'Сховати': 'Додати фільтр' }}</button>
        </div>

         <!-- Динамічна форма для введення нового фільтра -->
      <div v-if="showForm" class="form-group">
        <div>
        <label>Назва предмету:</label>
          <input type="text" v-model="newFilter.itemName" class="input" placeholder="Назва предмету" />
        </div>

        <div>
          <label>Максимальна ціна:</label>
          <input type="number" v-model.number="newFilter.maxPrice" class="input" placeholder="Максимальна ціна" />
        </div>

        <div>
          <label>Кількість:</label>
          <input type="number" v-model.number="newFilter.amount" class="input" placeholder="Кількість" />
        </div>

        <div class="form-group">
          <button @click="saveFilter(newFilter,true)" class="btn">Зберегти фільтр</button>
        </div>
      </div>

        <!-- Інпут для мінімальної ціни -->
        <div class="form-group">
            <label for="minPriceGrey">Мінімальна ціна:</label>
            <input type="number" v-model.number="minPriceGrey" id="minPriceGrey" class="input" placeholder="Введіть мінімальну ціну" />
        </div>

        <!-- Інпут для мінімальної знижки -->
        <div class="form-group">
            <label for="minDiscountGrey">Мінімальна знижка:</label>
            <input type="number" v-model.number="minDiscountGrey" id="minDiscountGrey" class="input" placeholder="Введіть мінімальну знижку" />
        </div>

        <!-- Чекбокси з лейблами Білого та Сірого списку -->
        <div class="form-group checkbox-group">
            <label for="checkboxWhite">Почати покупки Білого списку</label>
            <input type="checkbox" v-model="checkboxWhite" id="checkboxWhite" class="checkbox" />

            <label for="checkboxGrey">Почати покупки Сірого списку</label>
            <input type="checkbox" v-model="checkboxGrey" id="checkboxGrey" class="checkbox" />
        </div>

        <!-- Кнопка Почати Покупки/Закінчити покупки -->
        <div class="form-group">
            <button @click="toggleShopping" class="btn">
                {{ shoppingActive ? 'Закінчити покупки' : 'Почати покупки' }}
            </button>
        </div>
        <div class="form-group">
            <button @click="saveFilters" class="btn">
                Зберегти фільтри
            </button>
        </div>
    </div>

    <!-- ------------------------------------------------- -->
    <div v-for="(item, index) in filters.sort((a, b) => b.active - a.active)" :key="index" class="item">
        <div class="item-details">
            <label style="width: 20%">{{ item.itemName }}</label>
            <div v-if="item.active">
                <label for="maxPrice">Максимальна ціна: </label>
                <input type="number" v-model.number="item.maxPrice" id="maxPrice" :placeholder="'Максимальна ціна для ' + item.itemName" />
            </div>

            <div v-if="item.active">
                <label for="amount">Кількість: </label>
                <input type="number" v-model.number="item.amount" id="amount" :placeholder="'Кількість для ' + item.itemName" />
            </div>

            <div>
                <label for="active">Активний: </label>
                <input type="checkbox" v-model="item.active" id="active" />
            </div>

        </div>
    </div>

</div>
</template>

<script lang="ts">
import {
    Options,
    Vue
} from 'vue-class-component';
import {
    ItemFilter
} from '../models/filters'
import {
    CsDealsItem,
    LootFarmItem
} from '../models/item'
import axios from 'axios';

export default class HomeView extends Vue {

    lootFarmItems: LootFarmItem[] = [];
    csDealsItems: CsDealsItem[] = [];
    filters: ItemFilter[] = []
    minPriceGrey: number = 0;
    minDiscountGrey: number = 0;
    checkboxWhite: boolean = false;
    checkboxGrey: boolean = false;
    shoppingActive: boolean = false;
    showForm: boolean = false;
    newFilter: ItemFilter = {
        itemName: '',
        minPrice: 0,
        maxPrice: 0,
        minDiscount: 0,
        active: true,
        amount: 0,
        userCreated: true
    };
    activeFiltersInterval: number = 0;

    mounted() {
      this.getFilters();
    }

     async getFilters() {
      await axios.get('http://localhost:3000/api/getFilters')
      .then(response => {
        this.filters = response.data;
      })
    }
    async toggleShopping() {
        this.shoppingActive = !this.shoppingActive;
        if (this.shoppingActive) {
            const activeFilters = this.filters.filter(filter => filter.active);
            await axios.post('http://localhost:3000/api/toggleShoppingOn', {
            filters: activeFilters,
        });
            this.startPollingActiveFilters();
        } else {
            await axios.get('http://localhost:3000/api/toggleShoppingOff');
            this.stopPollingActiveFilters();
        }
    }

    addFilter() {
        this.showForm = !this.showForm;
    }

    async saveFilter(filter: ItemFilter, isNew: boolean) {
        const existingFilter = this.filters.find(i => i.itemName === filter.itemName);
    if (existingFilter) {
        console.warn(`Фільтр з назвою "${filter.itemName}" вже існує.`);
        return; // Виходимо, якщо фільтр вже існує
    }
        filter.userCreated = true;
        await axios.post('http://localhost:3000/api/addUserFilter', {
                filter: filter,
            });
        if (isNew) {
            this.filters.push({...this.newFilter});
            this.newFilter = {
               itemName: '',
                minPrice: 0,
                maxPrice: 0,
                minDiscount: 0,
                active: true,
                amount: 0,
                userCreated: true
            };
            this.addFilter();
            this.getFilters();
        }  
    }

    async saveFilters() {
    try {
        const activeFilters = this.filters.filter(f => f.active && ! f.userCreated);
        await axios.post('http://localhost:3000/api/saveFilters', {
            filters: activeFilters,
        });
        console.log('Filters saved successfully');
    } catch (error) {
        console.error('Error saving filters:', error);
    }
}

    async startPollingActiveFilters() {
        this.activeFiltersInterval = setInterval(async () => {
            try {
                const response = await axios.get('http://localhost:3000/api/getServiceActiveFilters');
                const data: ItemFilter[] = response.data;

                data.forEach(item => {
                    let filter = this.filters.find(filter => filter.itemName === item.itemName);
                    
                    if (filter && item.amount !== undefined) {
                        filter.amount = item.amount;
                    }
                });
            } catch (error) {
                console.error('Error fetching filters:', error);
            }
        }, 10000); // 10 секунд
    }

    stopPollingActiveFilters() {
        if (this.activeFiltersInterval) {
            clearInterval(this.activeFiltersInterval); // зупиняємо опитування
            this.activeFiltersInterval = 0; // обнуляємо ID таймера
        }
    }

}
</script>

<style scoped>
.main {
    background-color: #f2f2f2;
    padding: 20px;
}

.controls {
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin-bottom: 20px;
    background-color: #ffffff;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
}

.form-group {
    display: flex;
    flex-direction: column;
}

.input {
    padding: 10px;
    font-size: 14px;
    border: 1px solid #cccccc;
    border-radius: 4px;
}

.checkbox-group {
    display: flex;
    align-items: center;
    gap: 15px;
}

.checkbox {
    margin-right: 10px;
}

.btn {
    background-color: #4CAF50;
    color: white;
    padding: 10px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.btn:hover {
    background-color: #45a049;
}

.btn-delete {
    background-color: #ff6666;
    color: white;
    padding: 5px 10px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.btn-delete:hover {
    background-color: #ff4d4d;
}

.item {
    margin-bottom: 20px;
}

.item-details {
    display: flex;
    gap: 20px;
    align-items: center;
}
</style>
