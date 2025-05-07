const tg = window.Telegram?.WebApp;
const isTelegram = !!tg;

function getReputationTitle(reputation) {
    if (reputation >= 1000) return "Legend";
    if (reputation >= 500) return "Veteran";
    if (reputation >= 200) return "Experienced";
    if (reputation >= 100) return "Intermediate";
    if (reputation >= 50) return "Beginner";
    return "Newbie";
}

function openBuyInterface(app) {
    alert("Открыт интерфейс покупки для: " + (app?.name || "неизвестного товара"));
    // Здесь можно добавить отображение интерфейса покупки, создание модального окна и т.п.
}

function getDarkItemImage(id) {
    return `zip_shishka.png`; // или путь, который у тебя в проекте
}

if (tg) {
  if (!tg.isExpanded) {
    tg.expand(); 
  }
  
  document.documentElement.style.height = `${tg.viewportHeight}px`;
  document.body.style.height = `${tg.viewportHeight}px`;
}

const _preloaderStart = Date.now();


// Добавьте в начало script.js с другими переменными
let darknetReputation = parseInt(localStorage.getItem('darknetReputation')) || 0;
let darknetUnlocked = localStorage.getItem('darknetUnlocked') === 'true';

let playerMoney = parseInt(localStorage.getItem('playerMoney')) || 500;
let shishCount = parseInt(localStorage.getItem('shishCount')) || 0;
let inventory = JSON.parse(localStorage.getItem('inventory')) || {};
let inventoryItems; 
let baseItem = null;
let additiveItem = null;

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

function showNotification(text, isError = false) {
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
    
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 10);
    
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
        'shishka': 'bud.png',
        'fertilizer': 'fertilizer.png',
        'zip': 'zip.png',
        'zip_shishka': 'zip_shishka.png',
        'plant_food': 'plant_food.png',
        'pot': 'pot.png',
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
    menu.style.visibility = 'hidden'; 
    menu.classList.remove('hidden');
    
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
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
    
    let bestPosition = positions.right;
    
    if (positions.right.left + menuRect.width > viewportWidth) {
        if (positions.left.left >= 10) {
            bestPosition = positions.left;
        } else {
            bestPosition = positions.bottom;
        }
    }
    
    bestPosition.left = Math.max(10, Math.min(bestPosition.left, viewportWidth - menuRect.width - 10));
    bestPosition.top = Math.max(10, Math.min(bestPosition.top, viewportHeight - menuRect.height - 10));
    
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

function hideActionMenu() {
    const actionMenu = document.getElementById('action-menu');
    if (actionMenu) actionMenu.classList.add('hidden');
}

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

document.addEventListener('DOMContentLoaded', () => {
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

    if (inventoryBtn && inventoryModal) {
        inventoryBtn.addEventListener('click', () => {
            inventoryModal.classList.add('open');
            updateInventory();
            
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
    
        setTimeout(() => {
            bud.classList.remove('collecting');
            bud.style.cssText = 'transform: scale(0); opacity: 0;';
    
            let harvestedCount = 1; 
            
            if (yieldBoostActive) {
                harvestedCount += 1; 
            }
            
            if (rareHarvestActive && Math.random() < 0.5) {
                harvestedCount += 1; 
            }
            
            if (superFoodActive && Math.random() < 0.1) {
                harvestedCount += 4; 
            }
    
            if (!inventory['shishka']) {
                inventory['shishka'] = { count: 0, type: 'product', name: 'Шишка' };
            }
            inventory['shishka'].count += harvestedCount;
    
            saveInventory();
            updateInventory();
    
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

    updateMoneyDisplay();
});

document.addEventListener('click', function(e) {

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

//________________________________________________________________________________Мессенджер (Darknet)
const Phone = (() => {

    function openApp(appId) {
        if (!apps[appId]) return;
        
        const phoneHeader = document.querySelector('.phone-header');
        phoneHeader.innerHTML = `
            <button class="back-button">←</button>
            <span>${apps[appId].title}</span>
        `;
        
        phoneHeader.querySelector('.back-button').addEventListener('click', goHome);
        
        document.querySelector('.home-screen').style.display = 'none';
        document.querySelector('.app-screen').style.display = 'block';
        
        apps[appId].init();
    }

    function goHome() {
        const phoneHeader = document.querySelector('.phone-header');
        phoneHeader.innerHTML = ''; 
        
        document.querySelector('.app-screen').style.display = 'none';
        document.querySelector('.home-screen').style.display = 'block';
    }

    let elements = {};
    
    const apps = {
        chats: {
            title: "Чаты",
            init: initChatsApp
        },
        darknet: {
            title: "Darknet",
            init: initDarknetApp
        }
    };

    function initElements() {
        elements = {
            phoneModal: document.getElementById('phone-modal'),
            homeScreen: document.querySelector('.home-screen'),
            appScreen: document.querySelector('.app-screen'),
            appTitle: document.querySelector('.app-title'),
            appContent: document.querySelector('.app-content'),
            closeBtn: document.querySelector('.close-phone-button'),
            darknetButton: document.getElementById('darknet_button')
        };
    }

    function initChatsApp() {
        if (!elements.appContent) return;
        
        elements.appContent.innerHTML = `
            <div class="chat-list">
                <div class="chat-item" data-contact="uncle">
                    <img src="uncle.png" alt="Дядя Реджи">
                    <span>Дядя Реджи</span>
                </div>
                <div class="chat-item" data-contact="sylvester">
                    <img src="sylvester.png" alt="Сильвестр">
                    <span>Сильвестр</span>
                </div>
            </div>
        `;

        setTimeout(() => {
            const chatItems = document.querySelectorAll('.chat-item');
            if (chatItems.length) {
                chatItems.forEach(item => {
                    item.addEventListener('click', function() {
                        const contact = this.dataset.contact;
                        openChat(contact);
                    });
                });
            }
        }, 0);
    }

    function openChat(contact) {
        if (!elements.appContent) return;
        
        elements.appContent.innerHTML = `
            <div class="chat-window">
                <div class="messages"></div>
                <div class="reply-buttons"></div>
            </div>
        `;
        
        if (contact === 'uncle') startChatWithUncle();
        else if (contact === 'sylvester') startChatWithSylvester();
    }

    function openApp(appId) {
        if (!apps[appId] || !elements.appTitle || !elements.appContent) return;
        
        elements.appTitle.textContent = apps[appId].title;
        apps[appId].init();
        elements.homeScreen.style.display = 'none';
        elements.appScreen.style.display = 'block';
    }

    function goHome() {
        if (!elements.homeScreen || !elements.appScreen) return;
        
        elements.homeScreen.style.display = 'block';
        elements.appScreen.style.display = 'none';
    }

    function open() {
        if (!elements.phoneModal) return;
        
        // Сброс состояния перед открытием
        elements.phoneModal.style.display = 'flex';
        elements.phoneModal.classList.remove('closing');
        
        // Запуск анимации после небольшой задержки
        setTimeout(() => {
            elements.phoneModal.classList.add('open');
        }, 10);
        
        goHome();
    }

    function close() {
        if (!elements.phoneModal) return;
        
        // Начинаем анимацию закрытия
        elements.phoneModal.classList.add('closing');
        elements.phoneModal.classList.remove('open');
        
        // Полное скрытие после анимации
        setTimeout(() => {
            elements.phoneModal.style.display = 'none';
            elements.phoneModal.classList.remove('closing');
        }, 400); // Должно совпадать с длительностью анимации
    }

    document.addEventListener('DOMContentLoaded', () => {
        Phone.init();
    });


    const phoneApps = document.querySelectorAll('.phone-app');
    function init() {
        initElements();
        const phoneAppsContainer = document.querySelector('.phone-apps');
        if (phoneAppsContainer && !document.querySelector('.phone-app[data-app="darknet"]')) {
            const darknetApp = document.createElement('div');
            darknetApp.className = 'phone-app';
            darknetApp.dataset.app = 'darknet';
            darknetApp.style.backgroundColor = '#000';
            darknetApp.innerHTML = `
                <img src="darknet.png" alt="Darknet">
            `;
            phoneAppsContainer.appendChild(darknetApp);
        }
    
        if (elements.closeBtn) {
            elements.closeBtn.addEventListener('click', close);
        }
        
        // Добавьте этот обработчик
        document.querySelectorAll('.phone-app').forEach(app => {
            app.addEventListener('click', function() {
                openApp(this.dataset.app);
            });
        });
    
        const backButton = document.querySelector('.back-button');
        if (backButton) {
            backButton.addEventListener('click', goHome);
        }
        
        if (elements.darknetButton) {
            elements.darknetButton.addEventListener('click', open);
        }
    }

    return { init, open, close };
})();

function unlockDarknet() {
    darknetUnlocked = true;
    localStorage.setItem('darknetUnlocked', 'true');
    
    const phoneApps = document.querySelector('.phone-apps');
    if (phoneApps) {
        const darknetApp = document.createElement('div');
        darknetApp.className = 'phone-app';
        darknetApp.dataset.app = 'darknet';
        darknetApp.style.backgroundColor = '#000';
        darknetApp.innerHTML = `
            <img src="darknet.png" alt="Darknet">
        `;
        phoneApps.appendChild(darknetApp);
        
        // Добавляем обработчик клика для нового приложения
        darknetApp.addEventListener('click', function() {
            openApp('darknet');
        });
    }
    
    addMessage('uncle', "Вот тебе доступ к Darknet Market. Будь осторожен!");
    addMessage('system', 'Darknet Market теперь доступен в вашем телефоне');
}

let uncleDeals = parseInt(localStorage.getItem('uncleDeals')) || 0;
const MAX_DEALS = 5;
let uncleStoppedBuying = localStorage.getItem('uncleStoppedBuying') === 'true';
let currentDealPrice = parseInt(localStorage.getItem('currentDealPrice')) || 0;

if (currentDealPrice === 0) {
    currentDealPrice = generateRandomPrice();
    localStorage.setItem('currentDealPrice', currentDealPrice);
}

const dialogs = {
    uncle: {
        start: {
            message: "Ну что, мелкий, есть чем поделиться?",
            replies: [
                { 
                    text: "Продать через даркнет", 
                    next: "darknet_advice" 
                },
                { 
                    text: "Продать тебе", 
                    condition: () => uncleDeals < MAX_DEALS,
                    next: "selling_options" 
                },
                {
                    text: "Ничего",
                    next: null
                }
            ]
        },
        darknet_advice: {
            message: "Darknet - рискованно, но прибыльно. Риск конфискации 30%, но цены в 2-3 раза выше.",
            replies: [
                {
                    text: "Понял",
                    next: "start"
                }
            ]
        },
        selling_options: {
            message: `Сколько скинешь? (${generateRandomPrice()}$ за упаковку)`,
            replies: [
                { 
                    text: "Не жмоть, давай нормально", 
                    action: () => negotiateBetterPrice()
                },
                { 
                    text: "5 упаковок", 
                    condition: () => inventory['zip_shishka']?.count >= 5,
                    action: () => completeDeal(5)
                },
                { 
                    text: "Все что есть", 
                    condition: () => inventory['zip_shishka']?.count > 0,
                    action: () => completeDeal(inventory['zip_shishka'].count)
                },
                { 
                    text: "Передумал", 
                    next: "start"
                }
            ]
        },
        
        darknet_offer: {
            message: "Хочешь научиться продавать через даркнет? Там цены в 2 раза выше, но и риск соответствующий.",
            replies: [
                {
                    text: "Расскажи подробнее",
                    next: "darknet_explain"
                },
                {
                    text: "Не сейчас",
                    next: "start"
                }
            ]
        },
        
        darknet_explain: {
            message: "Тебе понадобится: 1) Тор браузер 2) Криптовалюта 3) Репутация. Когда будешь готов - заходи.",
            replies: [
                {
                    text: "Я готов сейчас",
                    action: () => unlockDarknet()
                },
                {
                    text: "Понял, позже",
                    next: "start"
                }
            ]
        },
        darknet_explain: {
            message: function() {
                return darknetReputation < 5 ? 
                    "Тебе понадобится: 1) Тор браузер 2) Криптовалюта 3) Репутация. Начни с малого." :
                    `Твоя репутация: ${darknetReputation}/10. Продолжай в том же духе!`;
            },
            replies: [
                {
                    text: "Как повысить репутацию?",
                    next: "reputation_help"
                },
                {
                    text: "Понял, позже",
                    next: "start"
                }
            ]
        },
        reputation_help: {
            message: "Репутация растет при успешных сделках. Чем больше продашь - тем лучше цены и ниже риски.",
            replies: [
                {
                    text: "Спасибо за совет",
                    next: "start"
                }
            ]
        }
    }
};

function saveUncleState() {
    localStorage.setItem('uncleDeals', uncleDeals);
    localStorage.setItem('currentDealPrice', currentDealPrice);
}

function generateRandomPrice() {
    currentDealPrice = Math.floor(Math.random() * 16) + 15;
    return currentDealPrice;
}

function startChatWithUncle() {
    if (uncleStoppedBuying) {
        addMessage('uncle', "Я больше не покупаю товар. Осваивай даркнет!");
        showDialogStep('uncle', 'darknet_offer');
        return;
    }
    
    generateRandomPrice();
    showDialogStep('uncle', 'start');
}

function showDialogStep(character, stepId, customStep = null) {
    const step = customStep || dialogs[character][stepId];
    if (!step) return;

    addMessage(character, step.message);

    if (step.replies) {
        showReplies(step.replies);
    }
}

function showReplies(replies) {
    const replyButtons = document.querySelector('.reply-buttons');
    if (!replyButtons) return;

    replyButtons.innerHTML = '';

    replies.forEach(reply => {
        if (reply.condition && !reply.condition()) return;

        const btn = document.createElement('button');
        btn.textContent = reply.text;
        
        btn.addEventListener('click', () => {
            addMessage('user', reply.text);
            replyButtons.innerHTML = '';
            setTimeout(() => {
                if (reply.next) {
                    showDialogStep('uncle', reply.next);
                } else if (reply.action) {
                    reply.action();
                }
            }, 800);
        });
        
        replyButtons.appendChild(btn);
    });
}

function sellProduct(amount, pricePerUnit) {
    if (uncleDeals >= MAX_DEALS) {
        addMessage('uncle', "Я уже рисковал достаточно. Ищи других покупателей!");
        return;
    }
    
    if (!inventory['zip_shishka'] || inventory['zip_shishka'].count < amount) {
        addMessage('uncle', "У тебя даже столько нет! Не смеши меня.");
        return;
    }

    const total = amount * pricePerUnit;
    decreaseItem('zip_shishka', amount);
    playerMoney += total;
    uncleDeals++;
    updateMoneyDisplay();
    saveInventory();

    addMessage('uncle', `Ладно, держи ${total}$. (${MAX_DEALS - uncleDeals} раз осталось)`);
    
    if (uncleDeals >= MAX_DEALS) {
        addMessage('uncle', "Это был последний раз. Больше не пиши мне!");
    }
}
function completeDeal(amount) {
    if (uncleStoppedBuying) return;
    
    const total = amount * currentDealPrice;
    decreaseItem('zip_shishka', amount);
    playerMoney += total;
    uncleDeals++;
    
    // Сохраняем состояние
    localStorage.setItem('uncleDeals', uncleDeals);
    updateMoneyDisplay();
    saveInventory();
    
    // Показываем уведомление о сделке
    showNotification(
        `Продано ${amount} упаковок по ${currentDealPrice}$ = ${total}$`,
        false
    );
    
    // Обновляем чат
    addMessage('uncle', `Деньги перевел! Не забывай, я не смогу постоянно приносить тебе деньги, слишком много рисков!`);
    
    if (uncleDeals >= MAX_DEALS) {
        uncleStoppedBuying = true;
        localStorage.setItem('uncleStoppedBuying', 'true');
        
        setTimeout(() => {
            showNotification(
                'Дядя Реджи больше не покупает товар. Используйте даркнет!',
                false
            );
            addMessage('uncle', "Всё, хватит! Больше не буду покупать.");
            setTimeout(() => showDialogStep('uncle', 'darknet_offer'), 1500);
        }, 2000);
    }
}
function negotiateBetterPrice() {
    const oldPrice = currentDealPrice;
    const success = Math.random() > 0.5;
    
    if (success) {
        currentDealPrice += 5;
        addMessage('uncle', `Ладно, сегодня добрый - дам ${currentDealPrice}$!`);
    } else {
        currentDealPrice = Math.max(15, currentDealPrice - 3);
        addMessage('uncle', `Нет, так уж и быть - ${currentDealPrice}$ и точка!`);
    }
    
    document.querySelector('.reply-buttons').innerHTML = '';
    saveUncleState();
    
    setTimeout(() => {
        const tempStep = {
            message: `Итак, по ${currentDealPrice}$ за упаковку. Сколько скинешь?`,
            replies: dialogs.uncle.selling_options.replies
        };
        showDialogStep('uncle', 'selling_options', tempStep);
    }, 1000);
}

function updateDarknetPrices() {
    // Каждые 5 продаж увеличиваем сложность
    if (darknetReputation >= 5 && darknetReputation < 10) {
        // Увеличиваем риски но и цены
        dialogs.uncle.darknet_explain.message = 
            "Ты привлекаешь внимание! Риски выше, но и цены растут.";
    } else if (darknetReputation >= 10) {
        // Открываем новые товары
        dialogs.uncle.darknet_explain.message = 
            "Теперь ты серьезный игрок. Доступны эксклюзивные товары!";
    }
}


function addMessage(sender, text) {
    const messages = document.querySelector('.messages');
    if (!messages) return;
    
    const msg = document.createElement('div');
    msg.className = `message ${sender === 'user' ? 'user' : 'npc'}`;
    msg.innerHTML = `
        <div class="message-text">${text}</div>
    `;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
}

const priceHistory = [];

function getCurrentPrice() {
    const base = 120;
    const fluctuation = Math.floor(Math.random() * 20 - 10); // ±10
    const currentPrice = base + fluctuation + (darknetReputation * 10);
    priceHistory.push(currentPrice);
    if (priceHistory.length > 10) priceHistory.shift(); // ограничим длину
    return currentPrice;
}

function generateDemand() {
    return Math.floor(Math.random() * 100);
}

function renderPriceChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');
    if (window.priceChartInstance) {
        window.priceChartInstance.destroy();
    }

    window.priceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: priceHistory.map((_, i) => `Тик ${i + 1}`),
            datasets: [{
                label: 'Цена на шишки ($)',
                data: priceHistory,
                borderColor: 'limegreen',
                borderWidth: 2,
                fill: false,
                tension: 0.2
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: false }
            }
        }
    });
}

// let sellQuantity = 1;
// const maxQty = inventory['zip_shishka']?.count || 0;

// const qtyInput = document.getElementById('sell-quantity');
// document.getElementById('decrease-qty').addEventListener('click', () => {
//     if (sellQuantity > 1) {
//         sellQuantity--;
//         qtyInput.value = sellQuantity;
//     }
// });

// document.getElementById('increase-qty').addEventListener('click', () => {
//     if (sellQuantity < maxQty) {
//         sellQuantity++;
//         qtyInput.value = sellQuantity;
//     }
// });


function initDarknetApp() {
    const appContent = document.querySelector('.app-content');
    appContent.innerHTML = `
        <div class="darknet-app">
            <div class="darknet-header">
                <h2>🕶️ DARKNET MARKET v3.2</h2>
                <p>Репутация: ${darknetReputation}/10</p>
                <div class="darknet-rep">Ваш статус: ${getReputationTitle()}</div>
            </div>
            
            <canvas id="priceChart" width="300" height="150"></canvas>

            <div class="market-item">
                <img src="${getDarkItemImage('zip_shishka')}" alt="Пакет шишек" style="height: 60px;">
                <div class="item-name">Пакет шишек</div>
                <div class="item-price">Текущая цена: ${getCurrentPrice()}$</div>
                <div class="item-demand">Спрос: ${generateDemand()}%</div>
                <div class="item-inventory">У вас: ${inventory['zip_shishka']?.count || 0} шт.</div>
                <div class="quantity-selector">
                    <button id="decrease-qty">-</button>
                    <input type="text" id="sell-quantity" value="1" readonly />
                    <button id="increase-qty">+</button>
                </div>
                <button class="darknet-button" id="sell-shishka">Продать</button>
            </div>
        </div>
    `;

    // После того как весь контент добавлен, инициализируем события
    let sellQuantity = 1;
    const maxQty = inventory['zip_shishka']?.count || 0;

    const qtyInput = document.getElementById('sell-quantity');
    document.getElementById('decrease-qty').addEventListener('click', () => {
        if (sellQuantity > 1) {
            sellQuantity--;
            qtyInput.value = sellQuantity;
        }
    });

    document.getElementById('increase-qty').addEventListener('click', () => {
        if (sellQuantity < maxQty) {
            sellQuantity++;
            qtyInput.value = sellQuantity;
        }
    });

    document.getElementById('sell-shishka').addEventListener('click', () => {
        const qty = sellQuantity;
        if (qty > 0) {
            sellOnDarknet('zip_shishka', qty);
        }
    });

    renderPriceChart();
}


function renderDarknetMarket() {
    const market = document.getElementById('darknet-market');
    if (!market) return;
    
    market.innerHTML = '';
    
    // Пример товаров в даркнете
    const darknetItems = [
        { id: 'shishka_pack', name: "Пакет шишек", price: 150, risk: 30 },
        { id: 'fertilizer_pro', name: "Профессиональное удобрение", price: 800, risk: 15 },
        { id: 'booster_xtreme', name: "Экстремальный бустер", price: 1200, risk: 40 }
    ];
    
    darknetItems.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'market-item';
        itemElement.innerHTML = `
            <div class="item-name">${item.name}</div>
            <div class="item-price">${item.price}$ (Риск: ${item.risk}%)</div>
            <button class="darknet-button buy-item">Купить</button>
        `;
        
        itemElement.querySelector('.buy-item').addEventListener('click', () => {
            attemptDarknetPurchase(item);
        });
        
        market.appendChild(itemElement);
    });
}

function attemptDarknetPurchase(item) {
    if (playerMoney < item.price) {
        showNotification('Недостаточно денег!', true);
        return;
    }
    
    const success = Math.random() * 100 > item.risk;
    
    if (success) {
        playerMoney -= item.price;
        // Добавить предмет в инвентарь
        if (!inventory[item.id]) {
            inventory[item.id] = { count: 0, type: 'darknet_item', name: item.name };
        }
        inventory[item.id].count += 1;
        
        // Увеличить репутацию
        darknetReputation = Math.min(10, darknetReputation + 1);
        localStorage.setItem('darknetReputation', darknetReputation);
        
        showNotification(`Успешная покупка! ${item.name} добавлен в инвентарь.`);
        updateMoneyDisplay();
        updateInventory();
        renderDarknetMarket(); // Обновить список товаров
    } else {
        playerMoney -= item.price;
        showNotification('Провал! Товар конфискован, деньги потеряны.', true);
        updateMoneyDisplay();
    }
}

function calculateDarknetPrice(itemId) {
    // Базовая цена + бонус за репутацию
    const basePrice = {
        'zip_shishka': 120,
        'shishka_herb': 180
    }[itemId] || 100;
    
    return basePrice + (darknetReputation * 10);
}

function sellOnDarknet(itemId, quantity) {
    if (!inventory[itemId] || inventory[itemId].count < quantity) {
        showNotification('Недостаточно товара!', true);
        return;
    }
    
    const price = calculateDarknetPrice(itemId) * quantity;
    const risk = Math.max(5, 30 - (darknetReputation * 2));
    
    if (Math.random() * 100 < risk) {
        // Неудача - товар конфискован
        decreaseItem(itemId, quantity);
        showNotification(`Провал! Товар конфискован полицией. (Риск: ${risk}%)`, true);
    } else {
        // Успех
        decreaseItem(itemId, quantity);
        playerMoney += price;
        darknetReputation = Math.min(10, darknetReputation + 0.5);
        
        localStorage.setItem('darknetReputation', darknetReputation);
        localStorage.setItem('playerMoney', playerMoney);
        
        showNotification(`Успешно продано! +${price}$ (Риск: ${risk}%)`);
        updateMoneyDisplay();
        initDarknetApp();
    }
}

function getPriceHistory(itemId) {
    const key = `priceHistory_${itemId}`;
    const stored = localStorage.getItem(key);
    let history = stored ? JSON.parse(stored) : [];

    const newPrice = calculateDarknetPrice(itemId);
    if (history.length >= 10) history.shift();
    history.push(newPrice);

    localStorage.setItem(key, JSON.stringify(history));
    return history;
}

function drawPriceChart(data) {
    const ctx = document.getElementById('priceChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map((_, i) => `День ${i + 1}`),
            datasets: [{
                label: 'Цена за пакет',
                data,
                fill: false,
                borderColor: '#00ff99',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: { callback: value => `${value}$` }
                }
            }
        }
    });
}

function getPriceHistory(itemId) {
    const key = `priceHistory_${itemId}`;
    const stored = localStorage.getItem(key);
    let history = stored ? JSON.parse(stored) : [];

    const newPrice = calculateDarknetPrice(itemId);
    if (history.length >= 10) history.shift();
    history.push(newPrice);

    localStorage.setItem(key, JSON.stringify(history));
    return history;
}

function drawPriceChart(data) {
    const ctx = document.getElementById('priceChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map((_, i) => `День ${i + 1}`),
            datasets: [{
                label: 'Цена за пакет',
                data,
                fill: false,
                borderColor: '#00ff99',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: { callback: value => `${value}$` }
                }
            }
        }
    });
}

//________________________________________________________________________________Мессенджер (Darknet)

//____________________________________________________________________LOAD
document.addEventListener('DOMContentLoaded', () => {
    if (isTelegram) {
        tg.enableClosingConfirmation();
        tg.setHeaderColor('#4CAF50');
        tg.setBackgroundColor('#111');
        
        console.log('Telegram WebApp initialized');
        console.log('User:', tg.initDataUnsafe?.user);
    }
});

window.addEventListener('load', () => {
    const loader = document.getElementById('loading-screen');
    if (loader) {
        setTimeout(() => {
            loader.classList.add('loaded');
            setTimeout(() => {
                loader.remove();
                // Показываем подсказку о даркнете при первом запуске
                if (!localStorage.getItem('darknetTutorialShown')) {
                    showNotification("Даркнет доступен в телефоне. Рискованно, но прибыльно!");
                    localStorage.setItem('darknetTutorialShown', 'true');
                }
            }, 500);
        }, 5000);
    }
    delete inventory['mixer_machine'];
    delete inventory['light'];
});
//____________________________________________________________________LOAD

//__________________________________________________MAP________________________________________________________


//__________________________________________________MAP________________________________________________________