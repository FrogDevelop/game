const tg = window.Telegram?.WebApp;
const isTelegram = !!tg;

if (tg) {
  // Проверяем, открыто ли в Fullscreen
  if (!tg.isExpanded) {
    tg.expand(); // Принудительно разворачиваем
  }
  
  // Фиксируем размеры
  document.documentElement.style.height = `${tg.viewportHeight}px`;
  document.body.style.height = `${tg.viewportHeight}px`;
}

const _preloaderStart = Date.now();

// Глобальные переменные
let playerMoney = parseInt(localStorage.getItem('playerMoney')) || 10000;
let shishCount = parseInt(localStorage.getItem('shishCount')) || 0;
let inventory = JSON.parse(localStorage.getItem('inventory')) || {};
let inventoryItems; 
let baseItem = null;
let additiveItem = null;
// Активные бафы для растений
let growthBoostActive = false;
let yieldBoostActive = false;
let rareHarvestActive = false;
let superFoodActive = false;

const activeBuffs = {};
const moneyDisplay = document.querySelector('.money');

const shopItems = [
    { id: 'zip', name: 'Зип пакет', price: 5, type: 'zip', image: 'zip.png',
      description: 'Плотный пакет для хранения шишек.', displayName: 'зип-пакетов', quantitySelectable: true },
    { id: 'fertilizer', name: 'Удобрение', price: 500, type: 'fertilizer', image: 'fertilizer.png',
      description: 'Органическое удобрение для ускорения роста кустов.', displayName: 'удобрений', quantitySelectable: true },
    { id: 'plant_food', name: 'Еда для куста', price: 400, type: 'plant_food', image: 'plant_food.png',
      description: 'Специальное питание для растения.', displayName: 'еды для куста', quantitySelectable: true },
    { id: 'super_food', name: 'Супер-питание', price: 3000, type: 'super_food', image: 'super_food.png',
      description: 'Легендарная добавка для растений.', displayName: 'супер-питаний', quantitySelectable: true },
    { id: 'rare_fertilizer', name: 'Редкий удобритель', price: 300, type: 'rare_fertilizer', image: 'rare_fertilizer.png',
      description: 'Эксклюзивный продукт для максимального эффекта.', displayName: 'редких удобрителей', quantitySelectable: true }
];

function playSound(id) {
    const sound = document.getElementById(id);
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.log('Sound play failed:', e));
    }
}

const buffEffects = {
    growthBoost: {
        name: "Ускоренный рост",
        icon: 'fertilizer.png',
        duration: 120,
        description: "Растения растут в 2 раза быстрее",
        activate: function() {
            growthBoostActive = true;
        }
    },
    yieldBoost: {
        name: "Увеличенный урожай",
        icon: 'plant_food.png',
        duration: 60,
        description: "+1 шишка за сбор (всегда)",
        activate: function() {
            yieldBoostActive = true;
        }
    },
    rareHarvest: {
        name: "Редкий урожай",
        icon: 'rare_fertilizer.png',
        duration: 120,
        description: "50% шанс получить +1 шишку",
        activate: function() {
            rareHarvestActive = true;
        }
    },
    superFood: {
        name: "Супер питание",
        icon: 'super_food.png',
        duration: 30,
        description: "10% шанс получить 5 шишек вместо 1",
        activate: function() {
            superFoodActive = true;
        }
    }
};

// Добавляем функцию showNotification в начало кода
function showNotification(text, isError = false) {
    // Создаем элемент уведомления, если его еще нет
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
        `;
        document.body.appendChild(notificationContainer);
    }

    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : ''}`;
    notification.textContent = text;
    notification.style.cssText = `
        padding: 10px 20px;
        background: ${isError ? '#ff4444' : '#4CAF50'};
        color: white;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.3s ease;
    `;
    
    notificationContainer.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 10);
    
    // Автоматическое исчезновение через 3 секунды
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function activateBuff(buffId) {
    if (Object.keys(activeBuffs).length >= 1) {
        showNotification('Можно активировать только один бафф за раз!', true);
        return false;
    }

    const buff = buffEffects[buffId];
    if (!buff) return false;

    // Создаем визуальное отображение баффа
    const buffContainer = document.getElementById('buff-status-container');
    if (!buffContainer) return false;

    const buffElement = document.createElement('div');
    buffElement.className = 'buff-item';
    buffElement.id = `buff-${buffId}`;
    buffElement.innerHTML = `
        <img src="${buff.icon}" alt="${buff.name}" class="buff-icon">
        <div class="buff-timer">${Math.floor(buff.duration/60)}:${(buff.duration%60).toString().padStart(2, '0')}</div>
    `;
    buffContainer.appendChild(buffElement);

    const endTime = Date.now() + buff.duration * 1000;
    
    function updateTimer() {
        const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
        const secs = String(remaining % 60).padStart(2, '0');
        buffElement.querySelector('.buff-timer').textContent = `${mins}:${secs}`;

        if (remaining <= 0) {
            clearInterval(interval);
            buffElement.remove();
            delete activeBuffs[buffId];
            deactivateBuff(buffId);
            showNotification(`Бафф "${buff.name}" закончился`);
        }
    }

    const interval = setInterval(updateTimer, 1000);
    activeBuffs[buffId] = { interval, element: buffElement };
    
    // Активируем эффект баффа
    buff.activate();
    return true;
}

function deactivateBuff(buffId) {
    switch(buffId) {
        case 'growthBoost': growthBoostActive = false; break;
        case 'yieldBoost': yieldBoostActive = false; break;
        case 'rareHarvest': rareHarvestActive = false; break;
        case 'superFood': superFoodActive = false; break;
    }
    console.log(`Баф "${buffId}" деактивирован.`);
}

function applyItemEffect(itemId, type, buffId, message) {
    if (!inventory[itemId] || inventory[itemId].count < 1) {
        showNotification('Недостаточно предметов!', true);
        return;
    }

    if (Object.keys(activeBuffs).length > 0) {
        showNotification('Нельзя активировать несколько бафов одновременно!', true);
        return;
    }

    if (activateBuff(buffId)) {
        showNotification(message);
        decreaseItem(itemId, 1);
    }
}

function applyFertilizer(itemId) {
    applyItemEffect(itemId, 'fertilizer', 'growthBoost', 
                   'Удобрение применено! Растения растут в 2 раза быстрее.');
}

function applyPlantFood(itemId) {
    applyItemEffect(itemId, 'plant_food', 'yieldBoost',
                   'Еда для куста применена! +1 шишка за каждый сбор.');
}

function applyRareFertilizer(itemId) {
    applyItemEffect(itemId, 'rare_fertilizer', 'rareHarvest',
                   'Редкий удобритель использован! 50% шанс получить дополнительную шишку.');
}

function applySuperFood(itemId) {
    applyItemEffect(itemId, 'super_food', 'superFood',
                   'Супер-питание применено! 10% шанс получить 5 шишек вместо 1.');
}

// Отключение зума на мобильных устройствах
document.addEventListener('touchstart', function(e) {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });

function updateMoneyDisplay() {
    if (moneyDisplay) {
        const currentAmount = parseInt(moneyDisplay.textContent);
        const diff = playerMoney - currentAmount;
        const duration = 500;
        let startTime = null;
        
        function animateMoney(timestamp) {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const progressRatio = Math.min(progress / duration, 1);
            moneyDisplay.textContent = currentAmount + Math.round(diff * progressRatio);
            if (progress < duration) {
                window.requestAnimationFrame(animateMoney);
            }
        }
        window.requestAnimationFrame(animateMoney);
    }
}

function updateInventory() {
    if (!inventoryItems) return;
    
    inventoryItems.innerHTML = '';
    let itemCount = 0;

    for (const [id, data] of Object.entries(inventory)) {
        if (itemCount >= 15) break;

        const itemElement = document.createElement('div');
        itemElement.classList.add('inventory-item');
        itemElement.dataset.itemId = id;

        const itemImage = document.createElement('img');
        itemImage.src = getItemImage(id);
        itemImage.alt = data?.name || ''; 

        const itemCountElement = document.createElement('div');
        itemCountElement.classList.add('item-count');
        itemCountElement.textContent = typeof data === 'object' && data?.count ? `x${data.count}` : 'x0';

        itemElement.append(itemImage, itemCountElement);
        itemElement.addEventListener('click', () => openItemActions(id, itemElement));
        inventoryItems.appendChild(itemElement);
        itemCount++;
    }

    while (itemCount < 15) {
        inventoryItems.appendChild(document.createElement('div')).classList.add('inventory-item');
        itemCount++;
    }
}

function getItemImage(id) {
    const items = {
        'mixer_machine': 'mixer.png',
        'shishka': 'bud.png',
        'fertilizer': 'fertilizer.png',
        'zip': 'zip.png',
        'zip_shishka': 'zip_shishka.png',
        'plant_food': 'plant_food.png',
        'pot': 'pot.png',
        'light': 'light.png',
        'booster': 'booster.png',
        'rare_fertilizer': 'rare_fertilizer.png',
        'super_food': 'super_food.png'
    };
    return items[id] || 'bud.png';
}

function openItemActions(itemId, targetElement) {
    const item = inventory[itemId];
    if (!item) return;

    const actions = [];
    const actionMap = {
        'fertilizer': () => applyFertilizer(itemId),
        'plant_food': () => applyPlantFood(itemId),
        'rare_fertilizer': () => applyRareFertilizer(itemId),
        'super_food': () => applySuperFood(itemId)
    };

    if (actionMap[item.type]) {
        actions.push({ label: 'Применить', action: actionMap[item.type] });
    }

    if (itemId === 'mixer_machine') {
        actions.push({ 
            label: 'Использовать', 
            action: () => openMixerInterface() 
        });
    }

    if (item.type === 'zip' && inventory['shishka']?.count >= 5) {
        actions.push(
            { label: 'Расфасовать', action: () => packShishki(itemId) },
            { label: 'Расфасовать все', action: () => packAllShishki(itemId) }
        );
    }

    showActionMenu(actions, targetElement);
}

function openMixerInterface() {
    // Закрываем инвентарь
    document.getElementById('inventory-modal').classList.remove('open');
    
    // Создаем интерфейс смешивания
    const mixerModal = document.createElement('div');
    mixerModal.id = 'mixer-modal';
    mixerModal.innerHTML = `
        <div class="mixer-container">
            <h3>Машинка для смешивания</h3>
            <div class="mixer-slots">
                <div class="slot" id="slot-base"></div>
                <div class="mixer-plus">+</div>
                <div class="slot" id="slot-additive"></div>
                <div class="mixer-equals">=</div>
                <div class="slot" id="slot-result"></div>
            </div>
            <div class="mixer-items">
                ${Object.entries(inventory)
                  .filter(([id, item]) => id === 'shishka' || item.type === 'mix_component')
                  .map(([id, item]) => `
                    <div class="mixer-item" data-item-id="${id}">
                        <img src="${getItemImage(id)}" alt="${item.name}">
                        <span>${item.name} (${item.count})</span>
                    </div>
                  `).join('')}
            </div>
            <button id="mix-button">Смешать</button>
            <button id="close-mixer">Закрыть</button>
        </div>
    `;
    document.body.appendChild(mixerModal);
    
    // Логика перетаскивания предметов
    setupMixerDragAndDrop();
}

function setupMixerDragAndDrop() {
    // Убрали объявление переменных здесь, так как они теперь глобальные
    document.querySelectorAll('.mixer-item').forEach(item => {
        item.addEventListener('click', function() {
            const itemId = this.dataset.itemId;
            if (!baseItem) {
                baseItem = itemId;
                document.getElementById('slot-base').innerHTML = this.innerHTML;
            } else if (!additiveItem && itemId !== baseItem) {
                additiveItem = itemId;
                document.getElementById('slot-additive').innerHTML = this.innerHTML;
                showPossibleResult();
            }
        });
    });
    
    document.getElementById('mix-button').addEventListener('click', mixItems);
    document.getElementById('close-mixer').addEventListener('click', () => {
        document.getElementById('mixer-modal').remove();
        // Сброс переменных при закрытии интерфейса
        baseItem = null;
        additiveItem = null;
    });
}

function showPossibleResult() {
    const resultSlot = document.getElementById('slot-result');
    
    // Определяем результат смешивания
    let resultItem = null;
    if (baseItem === 'shishka' && additiveItem === 'mix_herbs') {
        resultItem = { id: 'shishka_herb', name: "Травяные шишки" };
    } 
    // Добавьте другие комбинации...
    
    if (resultItem) {
        resultSlot.innerHTML = `
            <img src="${getItemImage(resultItem.id)}" alt="${resultItem.name}">
            <span>${resultItem.name}</span>
        `;
    } else {
        resultSlot.innerHTML = "<span>Неизвестный результат</span>";
    }
}

function mixItems() {
    if (!baseItem || !additiveItem) {
        showNotification("Выберите два разных ингредиента!", true);
        return;
    }
    
    // Проверяем, есть ли ингредиенты
    if (inventory[baseItem].count < 1 || inventory[additiveItem].count < 1) {
        showNotification("Недостаточно ингредиентов!", true);
        return;
    }
    
    // Уменьшаем количество ингредиентов
    decreaseItem(baseItem, 1);
    decreaseItem(additiveItem, 1);
    
    // Определяем результат
    let resultItem = null;
    if (baseItem === 'shishka' && additiveItem === 'mix_herbs') {
        resultItem = { 
            id: 'shishka_herb', 
            name: "Травяные шишки",
            type: "product",
            effect: "Дают больше урожая"
        };
    }
    // Добавьте другие комбинации...
    
    if (resultItem) {
        // Добавляем результат в инвентарь
        if (!inventory[resultItem.id]) {
            inventory[resultItem.id] = { 
                count: 0, 
                type: resultItem.type, 
                name: resultItem.name 
            };
        }
        inventory[resultItem.id].count += 1;
        saveInventory();
        updateInventory();
        
        showNotification(`Получено: ${resultItem.name}! ${resultItem.effect || ''}`);
    } else {
        showNotification("Получена неизвестная субстанция...", true);
    }
    
    // Закрываем интерфейс и сбрасываем переменные
    document.getElementById('mixer-modal').remove();
    baseItem = null;
    additiveItem = null;
}

// Показ меню действий
function showActionMenu(actions, targetElement) {
    const actionMenu = document.getElementById('action-menu');
    if (!actionMenu) return;
    
    actionMenu.innerHTML = '';
    
    if (actions.length === 0) {
        actionMenu.classList.add('hidden');
        return;
    }

    actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = 'action-button';
        btn.textContent = action.label;
        btn.addEventListener('click', () => {
            action.action();
            hideActionMenu();
        });
        actionMenu.appendChild(btn);
    });

    positionActionMenu(actionMenu, targetElement);
}

function positionActionMenu(menu, target) {
    const rect = target.getBoundingClientRect();
    menu.style.visibility = 'hidden'; // Сначала скрываем
    menu.classList.remove('hidden');
    
    // Принудительно применяем стили и получаем размеры
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Рассчитываем позиции для всех вариантов
    const positions = {
        right: {
            left: rect.right + 5,
            top: Math.min(rect.top, viewportHeight - menuRect.height - 10)
        },
        left: {
            left: rect.left - menuRect.width - 5,
            top: Math.min(rect.top, viewportHeight - menuRect.height - 10)
        },
        bottom: {
            left: Math.max(10, Math.min(rect.left, viewportWidth - menuRect.width - 10)),
            top: rect.bottom + 5
        }
    };
    
    // Выбираем лучшую позицию
    let bestPosition = positions.right;
    
    if (positions.right.left + menuRect.width > viewportWidth) {
        if (positions.left.left >= 10) {
            bestPosition = positions.left;
        } else {
            bestPosition = positions.bottom;
        }
    }
    
    // Гарантируем, что меню не выйдет за границы
    bestPosition.left = Math.max(10, Math.min(bestPosition.left, viewportWidth - menuRect.width - 10));
    bestPosition.top = Math.max(10, Math.min(bestPosition.top, viewportHeight - menuRect.height - 10));
    
    // Применяем финальную позицию
    menu.style.cssText = `
        position: fixed;
        left: ${bestPosition.left}px;
        top: ${bestPosition.top}px;
        opacity: 1;
        transform: scale(1);
        z-index: 100000;
        visibility: visible;
    `;
}

// Скрытие меню
function hideActionMenu() {
    const actionMenu = document.getElementById('action-menu');
    if (actionMenu) actionMenu.classList.add('hidden');
}

// Закрытие меню при клике вне его
document.addEventListener('click', (e) => {
    const actionMenu = document.getElementById('action-menu');
    if (actionMenu && !actionMenu.contains(e.target) && !e.target.closest('.inventory-item')) {
        hideActionMenu();
    }
});

function packShishki(zipId) {
    if (inventory['shishka']?.count >= 5 && inventory[zipId]?.count >= 1) {
        decreaseItem('shishka', 5);
        decreaseItem(zipId, 1);

        if (!inventory['zip_shishka']) {
            inventory['zip_shishka'] = { count: 0, type: 'packed_product', name: 'Zip с шишкой' };
        }
        inventory['zip_shishka'].count += 1;
        saveInventory();
        updateInventory();
    } else {
        showNotification('Не хватает шишек или zip пакетов!', true);
    }
}

function packAllShishki(zipId) {
    const shishkaItem = inventory['shishka'];
    const zipItem = inventory[zipId];

    if (!shishkaItem || !zipItem) {
        showNotification('Нет шишек или zip пакетов!', true);
        return;
    }

    const maxPackable = Math.min(Math.floor(shishkaItem.count / 5), zipItem.count);
    if (maxPackable === 0) {
        showNotification('Не хватает шишек или zip пакетов для расфасовки!', true);
        return;
    }

    decreaseItem('shishka', maxPackable * 5);
    decreaseItem(zipId, maxPackable);

    if (!inventory['zip_shishka']) {
        inventory['zip_shishka'] = { count: 0, type: 'packed_product', name: 'Zip с шишкой' };
    }
    inventory['zip_shishka'].count += maxPackable;
    saveInventory();
    updateInventory();
    showNotification(`Успешно упаковано ${maxPackable} пакетов!`);
}

function decreaseItem(itemId, amount) {
    if (inventory[itemId]) {
        inventory[itemId].count -= amount;
        if (inventory[itemId].count <= 0) {
            delete inventory[itemId];
        }
        saveInventory();
        updateInventory();
    }
}

function saveInventory() {
    localStorage.setItem('inventory', JSON.stringify(inventory));
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    // Инициализация элементов интерфейса
    const inventoryBtn = document.getElementById('inventar_button');
    const inventoryModal = document.getElementById('inventory-modal');
    const closeModalBtn = document.getElementById('close-inventory');
    inventoryItems = document.querySelector('.inventory-items');

    const shopButton = document.getElementById('shop_button');
    const shopModal = document.getElementById('shop-modal');
    const closeShopButton = document.getElementById('close-shop-button');
    const shopItemsContainer = document.querySelector('.shop-items');

    const buds = document.querySelectorAll('.bud');
    const darknetButton = document.getElementById('darknet_button');
    

    // Магазин

    // Функции для работы с магазином
    function showShop() {
        if (shopModal) {
            shopModal.classList.add('open');
            renderShopItems();
            updateMoneyDisplay();
        }
    }

    function closeShop() {
        if (shopModal) shopModal.classList.remove('open');
        updateMoneyDisplay();
    }

    function renderShopItems() {
        if (!shopItemsContainer) return;
        
        shopItemsContainer.innerHTML = '';
        shopItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.classList.add('shop-item');
            itemElement.dataset.itemId = item.id;
            
            itemElement.innerHTML = `
                <div class="img-cnt"><img src="${item.image}" alt="${item.name}"></div>
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-description">${item.description}</div>
                    <div class="item-price">Цена: ${item.price} $</div>
                </div>
                <div class="buy-conteiner">
                    <button class="buy-button">Купить</button>
                    <div class="quantity-controls">
                        <button class="quantity-button minus">-</button>
                        <div class="quantity">1</div>
                        <button class="quantity-button plus">+</button>
                    </div>
                </div>
            `;
            
            shopItemsContainer.appendChild(itemElement);
        });
    }

    // Обработчики событий
    if (inventoryBtn && inventoryModal) {
        inventoryBtn.addEventListener('click', () => {
            inventoryModal.classList.add('open');
            updateInventory();
            playSound('open-inv');
            
        });
    }

    if (closeModalBtn && inventoryModal) {
        closeModalBtn.addEventListener('click', () => inventoryModal.classList.remove('open'));
    }

    if (shopButton) {
        shopButton.addEventListener('click', showShop);
    }

    if (closeShopButton) {
        closeShopButton.addEventListener('click', () => {
            closeShop();
            const inventoryModal = document.getElementById('inventory-modal');
            if (inventoryModal) inventoryModal.classList.remove('open');
        });
    }

    if (darknetButton) {
        darknetButton.addEventListener('click', openMessenger);
    }

    // Работа с растениями
    function showBud(bud) {
        if (!bud) return;
        
        createLeaves(bud);
        bud.style.cssText = 'opacity: 1; transform: scale(1);';
        setTimeout(() => bud.classList.add('active'), 50);
    }

    function hideBud(bud) {
        if (!bud?.classList?.contains('active') || bud.classList.contains('collecting')) return;
    
        bud.classList.add('collecting');
        createLeaves(bud);
        playSound('harvest-sound');
    
        setTimeout(() => {
            bud.classList.remove('collecting');
            bud.style.cssText = 'transform: scale(0); opacity: 0;';
    
            let harvestedCount = 1; // Базовая урожайность
            
            // Применяем эффекты баффов
            if (yieldBoostActive) {
                harvestedCount += 1; // +1 шишка всегда
            }
            
            if (rareHarvestActive && Math.random() < 0.5) {
                harvestedCount += 1; // 50% шанс +1 шишка
            }
            
            if (superFoodActive && Math.random() < 0.1) {
                harvestedCount += 4; // 10% шанс +4 шишки (итого 5)
            }
    
            if (!inventory['shishka']) {
                inventory['shishka'] = { count: 0, type: 'product', name: 'Шишка' };
            }
            inventory['shishka'].count += harvestedCount;
    
            saveInventory();
            updateInventory();
    
            // Время респавна зависит от баффа роста
            const respawnTime = growthBoostActive ? 1000 : 5000;
            setTimeout(() => showBud(bud), respawnTime);
        }, 1000);
    }

    function createLeaves(bud) {
        if (!bud?.parentElement) return;
        
        const leafContainer = document.createElement('div');
        leafContainer.className = 'leaves';
        
        const budRect = bud.getBoundingClientRect();
        const parentRect = bud.parentElement.getBoundingClientRect();
        
        leafContainer.style.cssText = `
            position: absolute;
            left: ${budRect.left - parentRect.left}px;
            top: ${budRect.top - parentRect.top}px;
        `;
        
        for (let i = 0; i < 4; i++) {
            const leaf = document.createElement('div');
            leaf.className = 'leaf';
            leaf.style.setProperty('--x', `${Math.random() * 40 - 20}px`);
            leaf.style.setProperty('--y', `${Math.random() * -40}px`);
            leafContainer.appendChild(leaf);
        }
        
        bud.parentElement.appendChild(leafContainer);
        setTimeout(() => leafContainer.remove(), 500);
    }

    buds.forEach(bud => {
        showBud(bud);
        bud.addEventListener('click', () => hideBud(bud));
    });

    // Инициализация денег
    updateMoneyDisplay();
});

// Обработка магазина через делегирование событий
document.addEventListener('click', function(e) {
    // Кнопки +/-
    if (e.target.classList.contains('plus')) {
        const control = e.target.closest('.quantity-controls');
        if (control) {
            const quantityEl = control.querySelector('.quantity');
            if (quantityEl) {
                let quantity = parseInt(quantityEl.textContent) || 1;
                quantityEl.textContent = quantity + 1;
            }
        }
    }
    
    if (e.target.classList.contains('minus')) {
        const control = e.target.closest('.quantity-controls');
        if (control) {
            const quantityEl = control.querySelector('.quantity');
            if (quantityEl) {
                let quantity = parseInt(quantityEl.textContent) || 1;
                if (quantity > 1) {
                    quantityEl.textContent = quantity - 1;
                }
            }
        }
    }
    
    // Кнопка Купить
    if (e.target.classList.contains('buy-button')) {
        const itemElement = e.target.closest('.shop-item');
        if (itemElement) {
            const itemId = itemElement.dataset.itemId;
            const quantity = parseInt(itemElement.querySelector('.quantity')?.textContent) || 1;
            buyItem(itemId, quantity, e);
        }
    }
});

function buyItem(id, quantity, event) {
    const item = shopItems.find(i => i.id === id);
    if (!item) return;
    
    const totalPrice = item.price * quantity;
    
    if (playerMoney >= totalPrice) {
        playerMoney -= totalPrice;
        
        if (!inventory[id]) {
            inventory[id] = { count: 0, type: id, name: item.name };
        }
        inventory[id].count += quantity;
        
        saveInventory();
        localStorage.setItem('playerMoney', playerMoney);
        updateMoneyDisplay();
        updateInventory();
        playSound('buy-sound');
        
        let itemName;
        if (quantity === 1) {
            itemName = item.name.toLowerCase();
        } else {
            itemName = item.displayName || `${item.name.toLowerCase()}ов`;
        }
        
        showNotification(`Куплено ${quantity} ${itemName} за ${totalPrice}$`);
        
        if (event?.target) {
            event.target.textContent = 'Куплено!';
            setTimeout(() => {
                if (event.target) event.target.textContent = 'Купить';
            }, 1000);
        }
    } else {
        showNotification('Недостаточно денег!', true);
    }
}

// Мессенджер (Darknet)
const messengerModal = document.getElementById('messenger-modal');
const closeMessengerBtn = document.getElementById('close-messenger');
const chatList = document.getElementById('chat-list');
const chatWindow = document.getElementById('chat-window');
const messages = document.getElementById('messages');
const replyButtons = document.getElementById('reply-buttons');
const uncleRedji = document.getElementById('uncle-redji');
const sylvesterChat = document.getElementById('sylvester-chat');

// Открытие/закрытие мессенджера
function openMessenger() {
    if (messengerModal) {
        messengerModal.classList.add('open');
        chatWindow?.classList.add('hidden');
        chatList?.classList.remove('hidden');
    }
}

function closeMessenger() {
    messengerModal?.classList.remove('open');
}

closeMessengerBtn?.addEventListener('click', closeMessenger);

if (sylvesterChat) {
    sylvesterChat.addEventListener('click', () => {
        chatList.classList.add('hidden');
        chatWindow.classList.remove('hidden');
        startChatWithSylvester();
    });
}

function startChatWithSylvester() {
    messages.innerHTML = '';
    replyButtons.innerHTML = '';

    addMessage("bot", "Йоу, ковбой! Я Сильвестр - король миксологии.");
    
    setTimeout(() => {
        const options = [];
        
        // Проверяем, куплена ли уже машинка
        if (!inventory['mixer_machine']) {
            options.push({ 
                text: "Купить машинку для смешивания ($2000)", 
                action: () => offerMixerMachine() 
            });
        }
        
        // Всегда показываем вариант с препаратами
        options.push({ 
            text: "Посмотреть препараты для смешивания", 
            action: () => showMixComponents() 
        });
        
        options.push({ text: "Назад", action: () => chatList.classList.remove('hidden') });
        
        setReplyOptions(options);
    }, 1000);
}

// Начало диалога
uncleRedji?.addEventListener('click', () => {
    chatList?.classList.add('hidden');
    chatWindow?.classList.remove('hidden');
    startChatWithUncle();
});

function startChatWithUncle() {
    if (!messages || !replyButtons) return;
    
    messages.innerHTML = '';
    replyButtons.innerHTML = '';

    addMessage("user", "Привет, Дядя Реджи!");
    setTimeout(() => {
        addMessage("bot", "Здарова, чем могу помочь?");
        setReplyOptions([
            { text: "Хочу продать пакеты с шишками", action: startSelling }
        ]);
    }, 1000);
}

// Продажа zip-пакетов с шишками
function startSelling() {
    if (!messages || !replyButtons) return;
    
    addMessage("user", "Хочу продать пакеты с шишками.");
    replyButtons.innerHTML = '';

    setTimeout(() => { 
        addMessage("bot", "Сколько у тебя пакетов?");
        setReplyOptions([
            { text: "5 пакетов", action: () => offerPrice(5) },
            { text: "10 пакетов", action: () => offerPrice(10) },
            { text: "Продать всё", action: () => offerPrice('all') }
        ]);
    }, 1000);
}

function offerPrice(amount) {
    if (!messages || !replyButtons) return;
    
    const totalZips = inventory['zip_shishka']?.count || 0;
    const packCount = amount === 'all' ? totalZips : Math.min(amount, totalZips);
    
    // Если запрошено конкретное количество, но его нет
    if (amount !== 'all' && totalZips < amount) {
        addMessage("user", `У меня ${amount} пакетов.`);
        replyButtons.innerHTML = '';
        
        setTimeout(() => {
            // Случайный выбор грубого ответа
            const angryResponses = [
                "Ты что, меня за лоха держишь? У тебя всего " + totalZips + " пакетов!",
                "Эй, дружок, у тебя только " + totalZips + "! Не пудри мне мозги!",
                totalZips + " - вот сколько у тебя на самом деле. Не ври мне!",
                "Я тебе не дурак! Проверил - у тебя " + totalZips + " пакетов."
            ];
            const randomResponse = angryResponses[Math.floor(Math.random() * angryResponses.length)];
            
            addMessage("bot", randomResponse);
            
            // Предлагаем продать то, что есть
            if (totalZips > 0) {
                setTimeout(() => {
                    addMessage("bot", `Ладно, предлагаю по-честному - продать ${totalZips} за ${totalZips * 15}$?`);
                    setReplyOptions([
                        { text: "Да", action: () => confirmDeal(totalZips, totalZips * 15) },
                        { text: "Нет", action: cancelDeal }
                    ]);
                }, 1500);
            } else {
                setTimeout(() => {
                    addMessage("bot", "Даже не знаю, зачем ты вообще ко мне пришел...");
                }, 1500);
            }
        }, 1000);
        return;
    }
    
    addMessage("user", `У меня ${packCount} пакетов.`);
    replyButtons.innerHTML = '';

    if (packCount === 0) {
        setTimeout(() => {
            addMessage("bot", "У тебя нет пакетов для продажи!");
            setTimeout(() => {
                addMessage("bot", "Иди выращивай сначала, потом приходи!");
            }, 1500);
        }, 1000);
        return;
    }

    const pricePerPack = Math.floor(Math.random() * (30 - 15 + 1)) + 15;
    const totalPrice = pricePerPack * packCount;

    setTimeout(() => {
        addMessage("bot", `Готов взять ${packCount} пакетов за ${totalPrice}$. Согласен?`);
        setReplyOptions([
            { text: "Да", action: () => confirmDeal(packCount, totalPrice) },
            { text: "Нет", action: cancelDeal }
        ]);
    }, 1000);
}

function confirmDeal(count, totalPrice) {
    if (!messages) return;
    
    addMessage("user", "Да, забирай!");
    if (replyButtons) replyButtons.innerHTML = '';

    if (inventory['zip_shishka']?.count >= count) {
        inventory['zip_shishka'].count -= count;
        if (inventory['zip_shishka'].count <= 0) {
            delete inventory['zip_shishka'];
        }
        playerMoney += totalPrice;
        saveInventory();
        localStorage.setItem('playerMoney', playerMoney);
        updateInventory();
        updateMoneyDisplay();
    }

    setTimeout(() => addMessage("bot", "Отлично, бабки перевёл."), 1000);
}

// Вспомогательные функции
function addMessage(sender, text) {
    if (!messages) return;
    
    const msg = document.createElement('div');
    msg.classList.add('message');
    if (sender === "user") msg.classList.add('user');
    msg.innerText = text;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
}

function setReplyOptions(options) {
    if (!replyButtons) return;
    
    replyButtons.innerHTML = '';
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.innerText = opt.text;
        btn.addEventListener('click', opt.action);
        replyButtons.appendChild(btn);
    });
}

function cancelDeal() {
    if (!messages || !replyButtons) return;
    
    addMessage("user", "Нет, передумал.");
    replyButtons.innerHTML = '';
    setTimeout(() => addMessage("bot", "Ну окей, обращайся."), 1000);
}

function offerMixerMachine() {
    if (playerMoney >= 2000) {
        addMessage("user", "Я хочу купить машинку для смешивания");
        setTimeout(() => {
            addMessage("bot", "Отличный выбор! Держи свою новую игрушку.");
            playerMoney -= 2000;
            localStorage.setItem('playerMoney', playerMoney);
            updateMoneyDisplay();
            
            // Добавляем машинку в инвентарь
            inventory['mixer_machine'] = { 
                count: 1, 
                type: 'tool', 
                name: 'Машинка для смешивания',
                usable: true
            };
            saveInventory();
            updateInventory();
            
            // Обновляем чат (убираем вариант покупки)
            setTimeout(startChatWithSylvester, 1500);
        }, 1000);
    } else {
        addMessage("user", "Я хочу купить машинку");
        setTimeout(() => {
            addMessage("bot", "Эй, у тебя даже бабла нет! Приходи когда будут деньги.");
            setTimeout(startChatWithSylvester, 1500);
        }, 1000);
    }
}

function showMixComponents() {
    messages.innerHTML = '';
    replyButtons.innerHTML = '';
    
    addMessage("bot", "У меня есть крутые штуки для миксования:");
    
    const components = [
        { id: 'mix_herbs', name: "Травяная смесь", price: 500, effect: "Увеличивает урожайность" },
        { id: 'mix_minerals', name: "Минеральный порошок", price: 700, effect: "Ускоряет рост" },
        { id: 'mix_special', name: "Секретный ингредиент", price: 1500, effect: "Шанс получить редкие шишки" }
    ];
    
    setTimeout(() => {
        components.forEach(comp => {
            const btn = document.createElement('button');
            btn.className = 'action-button';
            btn.innerHTML = `${comp.name} - ${comp.price}$<br><small>${comp.effect}</small>`;
            btn.addEventListener('click', () => buyMixComponent(comp));
            replyButtons.appendChild(btn);
        });
        
        const backBtn = document.createElement('button');
        backBtn.className = 'action-button';
        backBtn.textContent = "Назад";
        backBtn.addEventListener('click', startChatWithSylvester);
        replyButtons.appendChild(backBtn);
    }, 1000);
}

function buyMixComponent(component) {
    if (playerMoney >= component.price) {
        playerMoney -= component.price;
        localStorage.setItem('playerMoney', playerMoney);
        updateMoneyDisplay();
        
        if (!inventory[component.id]) {
            inventory[component.id] = { 
                count: 0, 
                type: 'mix_component', 
                name: component.name 
            };
        }
        inventory[component.id].count += 1;
        saveInventory();
        updateInventory();
        
        showNotification(`Куплено: ${component.name}`);
        setTimeout(startChatWithSylvester, 1500);
    } else {
        showNotification("Недостаточно денег!", true);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (isTelegram) {
        // Отключаем масштабирование
        tg.enableClosingConfirmation();
        tg.setHeaderColor('#4CAF50');
        tg.setBackgroundColor('#111');
        
        // Для отладки
        console.log('Telegram WebApp initialized');
        console.log('User:', tg.initDataUnsafe?.user);
    }
});

// Загрузка
window.addEventListener('load', () => {
    const loader = document.getElementById('loading-screen');
    if (loader) {
        setTimeout(() => {
            loader.classList.add('loaded');
            setTimeout(() => loader.remove(), 500);
        }, 5000);
    }
});