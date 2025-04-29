const _preloaderStart = Date.now();

// Глобальные переменные
let playerMoney = parseInt(localStorage.getItem('playerMoney')) || 100000;
let shishCount = parseInt(localStorage.getItem('shishCount')) || 0;
let inventory = JSON.parse(localStorage.getItem('inventory')) || {};
let inventoryItems; 

// === Активные бафы для растений ===
let growthBoostActive = false;    // Ускорение роста шишек
let yieldBoostActive = false;     // Больше шишек за сбор
let rareHarvestActive = false;    // Шанс редкого урожая
let superFoodActive = false;      // Шанс редких шишек

const activeBuffs = {};

let selectedProduct = null;
let quantity = 1; // глобальная переменная для количества
// Обновляем отображение денег
const moneyDisplay = document.querySelector('.money');

document.addEventListener('touchstart', function (e) {
    if (e.touches.length > 1) {
        e.preventDefault(); // Отменяет действие зума
    }
}, { passive: false });

function updateMoneyDisplay() {
    if (moneyDisplay) {
        // Плавное изменение значения денег с анимацией
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

function activateBuff(buffId, duration, iconPath) {
    const buffContainer = document.getElementById('buff-status-container');

    if (!buffContainer) return console.error('buff-status-container not found');

    if (activeBuffs[buffId]) {
        clearInterval(activeBuffs[buffId].interval);
    }

    const endTime = Date.now() + duration * 1000;

    // Создаём элемент бафа с иконкой и таймером
    const buffElement = document.createElement('div');
    buffElement.className = 'buff-item';
    buffElement.id = `buff-${buffId}`;
    buffElement.innerHTML = `
        <img src="${iconPath}" alt="icon" class="buff-icon">
        <div class="buff-timer">00:00</div>
    `;
    buffContainer.appendChild(buffElement);

    // Обновление таймера каждую секунду
    function updateTimer() {
        const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
        const secs = String(remaining % 60).padStart(2, '0');
        buffElement.querySelector('.buff-timer').textContent = `${mins}:${secs}`;

        if (remaining <= 0) {
            clearInterval(activeBuffs[buffId].interval);
            delete activeBuffs[buffId];
            buffElement.remove();
            deactivateBuff(buffId);
        }
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    activeBuffs[buffId] = { interval };
}

function updateInventory() {
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
        if (typeof data === 'object' && data !== null && 'count' in data) {
            itemCountElement.textContent = `x${data.count}`;
        } else {
            itemCountElement.textContent = 'x0';
        }

        itemElement.appendChild(itemImage);
        itemElement.appendChild(itemCountElement);
        inventoryItems.appendChild(itemElement);

        itemElement.addEventListener('click', () => {
            openItemActions(id, event.currentTarget);
        });

        itemCount++;
    }

    while (itemCount < 15) {
        const itemElement = document.createElement('div');
        itemElement.classList.add('inventory-item');
        inventoryItems.appendChild(itemElement);
        itemCount++;
    }
}

function getItemImage(id) {
    switch (id) {
        case 'shishka': return 'bud.png';
        case 'fertilizer': return 'fertilizer.png';
        case 'zip': return 'zip.png';
        case 'zip_shishka': return 'zip_shishka.png';
        case 'plant_food': return 'plant_food.png';
        case 'pot': return 'pot.png';
        case 'light': return 'light.png';
        case 'booster': return 'booster.png';
        case 'rare_fertilizer': return 'rare_fertilizer.png';
        case 'super_food': return 'super_food.png';
        default: return 'bud.png';
    }
}

function openItemActions(itemId, targetElement) {
    const item = inventory[itemId];
    if (!item) return;

    let actions = [];

    if (item.type === 'fertilizer') {
        actions.push({ label: 'Применить', action: () => applyFertilizer(itemId) });
    }

    if (item.type === 'plant_food') {
        actions.push({ label: 'Применить', action: () => applyPlantFood(itemId) });
    }

    if (item.type === 'booster') {
        actions.push({ label: 'Применить', action: () => applyBooster(itemId) });
    }

    if (item.type === 'rare_fertilizer') {
        actions.push({ label: 'Применить', action: () => applyRareFertilizer(itemId) });
    }

    if (item.type === 'super_food') {
        actions.push({ label: 'Применить', action: () => applySuperFood(itemId) });
    }

    if (item.type === 'zip' && inventory['shishka']?.count >= 5) {
        actions.push({ label: 'Расфасовать', action: () => packShishki(itemId) });
        actions.push({ label: 'Расфасовать все', action: () => packAllShishki(itemId) });
    }

    showActionMenu(actions, targetElement);
}

function deactivateBuff(buffId) {
    switch (buffId) {
        case 'growthBoost':
            growthBoostActive = false;
            break;
        case 'yieldBoost':
            yieldBoostActive = false;
            break;
        case 'rareHarvest':
            rareHarvestActive = false;
            break;
        case 'superFood':
            superFoodActive = false;
            break;
    }

    console.log(`Баф "${buffId}" деактивирован.`);
}


function applyFertilizer(itemId) {
    if (Object.keys(activeBuffs).length > 0) {
        alert('Нельзя активировать несколько бафов одновременно!');
        return;
    }
    alert('Удобрение применено! Немного ускоряет рост кустов.');
    decreaseItem(itemId, 1);
    growthBoostActive = true;
    activateBuff('growthBoost', 120, 'fertilizer.png');
}

function applyPlantFood(itemId) {
    if (Object.keys(activeBuffs).length > 0) {
        alert('Нельзя активировать несколько бафов одновременно!');
        return;
    }
    alert('Еда для куста применена! Повышена урожайность.');
    yieldBoostActive = true;
    decreaseItem(itemId, 1);
    activateBuff('yieldBoost', 60, 'plant_food.png');
}

function applyRareFertilizer(itemId) {
    if (Object.keys(activeBuffs).length > 0) {
        alert('Нельзя активировать несколько бафов одновременно!');
        return;
    }
    alert('Редкий удобритель использован! Возможность двойного урожая.');
    rareHarvestActive = true;
    decreaseItem(itemId, 1);
    activateBuff('rareHarvest', 120, 'rare_fertilizer.png');
}

function applySuperFood(itemId) {
    if (Object.keys(activeBuffs).length > 0) {
        alert('Нельзя активировать несколько бафов одновременно!');
        return;
    }
    alert('Супер-питание применено! Шанс получить редкие шишки.');
    superFoodActive = true;
    decreaseItem(itemId, 1);
    activateBuff('superFood', 30, 'super_food.png');
}


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
        alert('Не хватает шишек или zip пакетов!');
    }
}

function showActionMenu(actions, targetElement) {
    const actionMenu = document.getElementById('action-menu');
    actionMenu.innerHTML = ''; 

    if (actions.length === 0) {
        actionMenu.classList.add('hidden');
        return;
    }

    // создаём кнопки
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

    const rect = targetElement.getBoundingClientRect();

    actionMenu.style.visibility = 'hidden';
    actionMenu.style.display = 'block';
    actionMenu.classList.remove('hidden');

    const menuWidth  = actionMenu.offsetWidth;
    const menuHeight = actionMenu.offsetHeight;
    const viewportWidth  = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = rect.top + window.scrollY + (rect.height / 2) - (menuHeight / 2);
    top = Math.max(10, Math.min(top, window.scrollY + viewportHeight - menuHeight - 10));

    const spaceRight = viewportWidth - (rect.right + 10);
    const spaceLeft  = rect.left - 10;

    let left;
    if (spaceRight >= menuWidth) {

        left = rect.right + 10 + window.scrollX;
    } else if (spaceLeft >= menuWidth) {

        left = rect.left - menuWidth - 10 + window.scrollX;
    } else {

        left = window.scrollX + viewportWidth - menuWidth - 10;
    }

    // окончательно позиционируем и показываем
    actionMenu.style.top        = `${top}px`;
    actionMenu.style.left       = `${left}px`;
    actionMenu.style.visibility = '';      
    actionMenu.style.display    = '';      
    actionMenu.classList.remove('hidden');
}


function packAllShishki(zipId) {
    const shishkaItem = inventory['shishka'];
    const zipItem = inventory[zipId];

    if (!shishkaItem || !zipItem) {
        alert('Нет шишек или zip пакетов!');
        return;
    }

    const availableShishki = shishkaItem.count;
    const availableZips = zipItem.count;

    const maxPackable = Math.min(Math.floor(availableShishki / 5), availableZips);

    if (maxPackable === 0) {
        alert('Не хватает шишек или zip пакетов для расфасовки!');
        return;
    }

    // Уменьшаем количество шишек и пакетов
    decreaseItem('shishka', maxPackable * 5);
    decreaseItem(zipId, maxPackable);

    // Добавляем расфасованные zip с шишкой
    if (!inventory['zip_shishka']) {
        inventory['zip_shishka'] = { count: 0, type: 'packed_product', name: 'Zip с шишкой' };
    }
    inventory['zip_shishka'].count += maxPackable;

    saveInventory();
    updateInventory();
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

document.addEventListener('click', (event) => {
    const actionMenu = document.getElementById('action-menu');
    if (!actionMenu.contains(event.target) && !event.target.closest('.inventory-item')) {
        hideActionMenu();
    }
});

function hideActionMenu() {
    const actionMenu = document.getElementById('action-menu');
    actionMenu.classList.add('hidden');
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

    const productModal = document.getElementById('product-modal');
    const closeProductModalBtn = document.getElementById('close-product-modal');
    const productIcon = document.getElementById('product-icon');
    const productName = document.getElementById('product-name');
    const productDescription = document.getElementById('product-description');
    const productBenefit = document.getElementById('product-benefit');
    const productPrice = document.getElementById('product-price');
    const quantityContainer = document.getElementById('quantity-container');
    const quantityInput = document.getElementById('quantity');
    const confirmBuyButton = document.getElementById('confirm-buy');

    document.getElementById('darknet_button').addEventListener('click', openMessenger);

    function resetQuantity() {
        quantity = 1;
        if (quantityInput) quantityInput.value = 1;
    }

    const shopItems = [
        {
            id: 'zip', 
            name: 'Зип пакет', 
            price: 5, 
            type: 'zip', 
            image: 'zip.png',
            description: 'Плотный пакет для хранения шишек.', 
            benefit: 'Позволяет расфасовать шишки.', 
            quantitySelectable: true
        },
        {
            id: 'fertilizer', 
            name: 'Удобрение', 
            price: 500, 
            type: 'fertilizer', 
            image: 'fertilizer.png',
            description: 'Органическое удобрение для ускорения роста кустов.', 
            benefit: 'Ускоряет рост растения.', 
            quantitySelectable: true
        },
        {
            id: 'plant_food', 
            name: 'Еда для куста', 
            price: 400, 
            type: 'plant_food', 
            image: 'plant_food.png',
            description: 'Специальное питание для растения.', 
            benefit: 'Повышает урожайность.', 
            quantitySelectable: true
        },
        {
            id: 'super_food', 
            name: 'Супер-питание', 
            price: 3000, 
            type: 'super_food', 
            image: 'super_food.png', 
            description: 'Легендарная добавка для растений.', 
            benefit: 'Шанс получить редкие шишки.', 
            quantitySelectable: true
        },
        {
            id: 'rare_fertilizer', 
            name: 'Редкий удобритель', 
            price: 300, 
            type: 'rare_fertilizer', 
            image: 'rare_fertilizer.png', 
            description: 'Эксклюзивный продукт для максимального эффекта.', 
            benefit: 'Шанс на двойной урожай.', 
            quantitySelectable: true
        }
    ];

    function showBud(bud) {
        createLeaves(bud);
        bud.style.opacity = 1;
        bud.style.transform = 'scale(1)';
        
        setTimeout(() => {
            bud.classList.add('active');
        }, 50);
    }

    function hideBud(bud) {
        if (!bud.classList.contains('active') || bud.classList.contains('collecting')) return;
    
        createLeaves(bud);
    
        bud.classList.add('collecting');
    
        setTimeout(() => {
            bud.classList.remove('collecting');
            bud.style.transform = 'scale(0)';
            bud.style.opacity = '0';
    
            let harvestedCount = 1;
    
            if (yieldBoostActive) {
                harvestedCount += 1;
            }
    
            // Баф на редкий урожай
            if (rareHarvestActive && Math.random() < 0.5) { 
                harvestedCount += 1;
            }
    
    
            if (!inventory['shishka']) {
                inventory['shishka'] = { count: 0, type: 'product', name: 'Шишка' };
            }
            inventory['shishka'].count += harvestedCount;
    
            localStorage.setItem('shishCount', shishCount);
            saveInventory();
            updateInventory(); 
    
            setTimeout(() => {
                showBud(bud);
            }, growthBoostActive ? 1000 : 5000); 
        }, 1000);
    }
    
    

    buds.forEach(bud => {
        showBud(bud);
        bud.addEventListener('click', () => {
            if (!bud.classList.contains('active') || bud.classList.contains('collecting')) return;
            hideBud(bud);
        });
    });

    if (inventoryBtn) {
        inventoryBtn.addEventListener('click', () => {
            inventoryModal.classList.add('open');
            updateInventory();
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            inventoryModal.classList.remove('open');
        });
    }

    function createLeaves(bud) {
        const leafContainer = document.createElement('div');
        leafContainer.className = 'leaves';
    
        const budRect = bud.getBoundingClientRect();
        const parentRect = bud.parentElement.getBoundingClientRect();
    
        const offsetX = budRect.left - parentRect.left;
        const offsetY = budRect.top - parentRect.top;
    
        leafContainer.style.position = 'absolute';
        leafContainer.style.left = `${offsetX}px`;  
        leafContainer.style.top = `${offsetY}px`;   
    
        for (let i = 0; i < 4; i++) {
            const leaf = document.createElement('div');
            leaf.className = 'leaf';
            leaf.style.setProperty('--x', `${Math.random() * 40 - 20}px`); 
            leaf.style.setProperty('--y', `${Math.random() * -40}px`);     
            leafContainer.appendChild(leaf);
        }
    
        bud.parentElement.appendChild(leafContainer);
    
        setTimeout(() => {
            leafContainer.remove();
        }, 500);
    }

    updateMoneyDisplay();

     // === МАГАЗИН ===
     function showShop() {
        shopModal.classList.add('open');
        renderShopItems();
        updateMoneyDisplay(); 

        resetQuantity();
    }

    function closeShop() {
        shopModal.classList.remove('open');
        updateMoneyDisplay(); 
        quantity = 1;
        if (quantityInput) quantityInput.value = 1;
    }

    function renderShopItems() {
        shopItemsContainer.innerHTML = '';

        shopItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.classList.add('inventory-item');
            itemElement.style.cursor = 'pointer';

            const itemImage = document.createElement('img');
            itemImage.src = item.image;
            itemElement.appendChild(itemImage);

            const itemName = document.createElement('div');
            itemName.style.color = 'white';
            itemName.style.fontSize = '14px';
            itemName.style.marginTop = '5px';
            itemName.textContent = item.name;
            itemElement.appendChild(itemName);

            shopItemsContainer.appendChild(itemElement);

            itemElement.addEventListener('click', () => {
                openProductModal(item);
            });
        });
        updateMoneyDisplay(); 
    }

    function openProductModal(item) {
        selectedProduct = item;

        productIcon.src = item.image;
        productName.textContent = item.name;
        productDescription.textContent = item.description;
        productBenefit.textContent = `Что дает: ${item.benefit}`;
        productPrice.textContent = `Цена: ${item.price} $`;

        if (item.quantitySelectable) {
            quantityContainer.style.display = 'block';
            resetQuantity();
        } else {
            quantityContainer.style.display = 'none';
        }

        productModal.classList.add('open');
        updateMoneyDisplay(); 
        quantity = 1;
        if (quantityInput) quantityInput.value = 1;
    }

    function closeProductModal() {
        productModal.classList.remove('open');
        updateMoneyDisplay(); 
        quantity = 1;
        if (quantityInput) quantityInput.value = 1;
    }

    function confirmPurchase() {
        if (!selectedProduct) return;
    
        const quantityValue = selectedProduct.quantitySelectable ? parseInt(quantityInput.value) || 1 : 1;
        const totalPrice = selectedProduct.price * quantityValue;
    
        if (playerMoney >= totalPrice) {
            playerMoney -= totalPrice;
    
            if (!inventory[selectedProduct.id]) {
                inventory[selectedProduct.id] = { count: 0, type: selectedProduct.type, name: selectedProduct.name };
            }
            inventory[selectedProduct.id].count += quantityValue;
    
            saveInventory();
            localStorage.setItem('playerMoney', playerMoney);
    
            closeProductModal();
            closeShop();
        } else {
            alert('Недостаточно средств!');
        }
        updateMoneyDisplay(); 
    
        // После покупки сбрасываем количество
        quantity = 1;
        if (quantityInput) quantityInput.value = 1;
    }

    if (shopButton) {
        shopButton.addEventListener('click', showShop);
    }

    if (closeShopButton) {
        closeShopButton.addEventListener('click', closeShop);
    }

    if (closeProductModalBtn) {
        closeProductModalBtn.addEventListener('click', closeProductModal);
    }

    if (confirmBuyButton) {
        confirmBuyButton.addEventListener('click', confirmPurchase);
    }

});

document.addEventListener("DOMContentLoaded", function() {
    const quantityInput = document.getElementById("quantity");
    const increaseButton = document.getElementById("increase-quantity");
    const decreaseButton = document.getElementById("decrease-quantity");

    increaseButton.addEventListener("click", function() {
        quantity++;
        updateQuantity();
    });

    decreaseButton.addEventListener("click", function() {
        if (quantity > 1) {
            quantity--;
            updateQuantity();
        }
    });

    function updateQuantity() {
        quantityInput.value = quantity;
    }
});

document.addEventListener("DOMContentLoaded", function() {
    // Получаем все кнопки на странице
    const allButtons = document.querySelectorAll('button');

    allButtons.forEach(button => {
        button.addEventListener("mousedown", () => {
            button.style.transform = "scale(0.95)";
        });

        button.addEventListener("mouseup", () => {
            button.style.transform = "scale(1)";
        });

        // Поддержка для мобильных устройств
        button.addEventListener("touchstart", () => {
            button.style.transform = "scale(0.95)";
        });

        button.addEventListener("touchend", () => {
            button.style.transform = "scale(1)";
        });
    });

    // Для кнопок с увеличением/уменьшением количества
    const increaseButton = document.getElementById("increase-quantity");
    const decreaseButton = document.getElementById("decrease-quantity");

    increaseButton.addEventListener("mousedown", function() {
        increaseButton.style.transform = "scale(0.95)";
    });

    decreaseButton.addEventListener("mousedown", function() {
        decreaseButton.style.transform = "scale(0.95)";
    });

    increaseButton.addEventListener("mouseup", function() {
        increaseButton.style.transform = "scale(1)";
    });

    decreaseButton.addEventListener("mouseup", function() {
        decreaseButton.style.transform = "scale(1)";
    });

    // Поддержка для мобильных устройств
    increaseButton.addEventListener("touchstart", function() {
        increaseButton.style.transform = "scale(0.95)";
    });

    decreaseButton.addEventListener("touchstart", function() {
        decreaseButton.style.transform = "scale(0.95)";
    });

    increaseButton.addEventListener("touchend", function() {
        increaseButton.style.transform = "scale(1)";
    });

    decreaseButton.addEventListener("touchend", function() {
        decreaseButton.style.transform = "scale(1)";
    });
});

document.getElementById('close-shop-button').addEventListener('click', function() {
    // Закрыть окно магазина
    const shopModal = document.getElementById('shop-modal');
    if (shopModal.classList.contains('open')) {
        shopModal.classList.remove('open');
    }

    // Закрыть окно с товаром, если оно открыто
    const productModal = document.getElementById('product-modal');
    if (productModal.classList.contains('open')) {
        productModal.classList.remove('open');
    }

    // Закрыть все другие модальные окна, если они открыты (например, инвентарь)
    const inventoryModal = document.getElementById('inventory-modal');
    if (inventoryModal.classList.contains('open')) {
        inventoryModal.classList.remove('open');
    }
});


//____________________________________________________________________________________________ ДАРКНЕТ

// === Messenger ===

const messengerModal = document.getElementById('messenger-modal');
const closeMessengerBtn = document.getElementById('close-messenger');
const chatList = document.getElementById('chat-list');
const chatWindow = document.getElementById('chat-window');
const messages = document.getElementById('messages');
const replyButtons = document.getElementById('reply-buttons');
const uncleRedji = document.getElementById('uncle-redji');

function openMessenger() {
    messengerModal.classList.add('open');
    chatWindow.classList.add('hidden');
    chatList.classList.remove('hidden');
}

function closeMessenger() {
    messengerModal.classList.remove('open');
}

closeMessengerBtn.addEventListener('click', closeMessenger);

// Открытие чата с Дядей Реджи
uncleRedji.addEventListener('click', () => {
    chatList.classList.add('hidden');
    chatWindow.classList.remove('hidden');
    startChatWithUncle();
});

function startChatWithUncle() {
    messages.innerHTML = '';
    replyButtons.innerHTML = '';

    addMessage("user", "Привет, Дядя Реджи!");
    setTimeout(() => {
        addMessage("bot", "Здарова, чем могу помочь?");
        setReplyOptions([
            { text: "Хочу продать стаф", action: startSelling }
        ]);
    }, 1000);
}

function addMessage(sender, text) {
    const msg = document.createElement('div');
    msg.classList.add('message');
    if (sender === "user") msg.classList.add('user');
    msg.innerText = text;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
}

function setReplyOptions(options) {
    replyButtons.innerHTML = '';
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.innerText = opt.text;
        btn.addEventListener('click', opt.action);
        replyButtons.appendChild(btn);
    });
}

function startSelling() {
    addMessage("user", "Хочу продать стаф.");
    replyButtons.innerHTML = '';

    setTimeout(() => {
        addMessage("bot", "Сколько у тебя пакетиков?");
        setReplyOptions([
            { text: "5 пакетов", action: () => offerPrice(5) },
            { text: "10 пакетов", action: () => offerPrice(10) },
            { text: "Продать всё", action: () => offerPrice('all') }
        ]);
    }, 1000);
}

function offerPrice(amount) {
    const totalZips = inventory['zip_shishka']?.count || 0;
    const packCount = amount === 'all' ? totalZips : amount;
    addMessage("user", `У меня ${packCount} пакетов.`);
    replyButtons.innerHTML = '';

    // Расчет цены
    let count = 0;
    if (amount === 'all') {
        count = inventory['zip_shishka']?.count || 0;
    } else {
        count = amount;
    }

    if (count === 0) {
        setTimeout(() => {
            addMessage("bot", "У тебя нет пакетиков!");
        }, 1000);
        return;
    }

    const pricePerPack = Math.floor(Math.random() * (30 - 15 + 1)) + 15;
    const totalPrice = pricePerPack * count;

    setTimeout(() => {
        addMessage("bot", `Готов взять ${count} пакетов за ${totalPrice}$. Согласен?`);
        setReplyOptions([
            { text: "Да", action: () => confirmDeal(count, totalPrice) },
            { text: "Нет", action: cancelDeal }
        ]);
    }, 1000);
}

function confirmDeal(count, totalPrice) {
    addMessage("user", "Да, забирай!");
    replyButtons.innerHTML = '';

    // Списание пакетов и добавление денег
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

    setTimeout(() => {
        addMessage("bot", "Отлично, бабки перевёл.");
    }, 1000);
}

function cancelDeal() {
    addMessage("user", "Нет, передумал.");
    replyButtons.innerHTML = '';
    setTimeout(() => {
        addMessage("bot", "Ну окей, обращайся.");
    }, 1000);
}


window.addEventListener('load', () => {
    const loader = document.getElementById('loading-screen');
    // ждем ещё полсекунды, чтобы дать анимации завершиться
    setTimeout(() => loader.classList.add('loaded'), 5000);
    // полностью удаляем из DOM
    setTimeout(() => loader.remove(), 5000);
  });

