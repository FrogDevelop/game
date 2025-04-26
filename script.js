document.addEventListener('DOMContentLoaded', () => {
    // === Все твои текущие переменные остаются без изменений ===
    const inventoryBtn = document.getElementById('inventar_button');
    const inventoryModal = document.getElementById('inventory-modal');
    const closeModalBtn = document.getElementById('close-inventory');
    const inventoryItems = document.querySelector('.inventory-items');

    const shopButton = document.getElementById('shop_button');
    const shopModal = document.getElementById('shop-modal');
    const closeShopButton = document.getElementById('close-shop-button');
    const shopItemsContainer = document.querySelector('.shop-items');

    const buds = document.querySelectorAll('.bud');

    // Новые элементы для product модалки:
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

    let selectedProduct = null;

    let playerMoney = parseInt(localStorage.getItem('playerMoney')) || 1000;
    let shishCount = parseInt(localStorage.getItem('shishCount')) || 0;
    let inventory = JSON.parse(localStorage.getItem('inventory')) || {};

    // Обновляем отображение денег
    const moneyDisplay = document.querySelector('.money');
    
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

    // Обновленная структура shopItems
    const shopItems = [
        {
            id: 'zip', name: 'Зип пакет', price: 100, type: 'zip', image: 'zip.png',
            description: 'Плотный пакет для хранения шишек.', benefit: 'Позволяет расфасовать шишки.', quantitySelectable: true
        },
        {
            id: 'fertilizer', name: 'Удобрение', price: 200, type: 'fertilizer', image: 'fertilizer.png',
            description: 'Органическое удобрение для ускорения роста кустов.', benefit: 'Ускоряет рост растения.', quantitySelectable: true
        },
        {
            id: 'plant_food', name: 'Еда для куста', price: 100, type: 'plant_food', image: 'plant_food.png',
            description: 'Специальное питание для растения.', benefit: 'Повышает урожайность.', quantitySelectable: true
        },
        {
            id: 'light', name: 'Лампа для роста', price: 300, type: 'light', image: 'light.png',
            description: 'Дополнительный свет для ускоренного роста.', benefit: 'Увеличивает скорость роста.', quantitySelectable: false
        }
    ];

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
    
        if (item.type === 'zip' && inventory['shishka']?.count >= 5) {
            actions.push({ label: 'Расфасовать', action: () => packShishki(itemId) });
            actions.push({ label: 'Расфасовать все', action: () => packAllShishki(itemId) });
        }
    
        if (item.type === 'packed_product') {
            actions.push({ label: 'Продать', action: () => sellZip(itemId) });
        }
    
        showActionMenu(actions, targetElement);
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
    

    function applyFertilizer(itemId) {
        alert('Удобрение применено!');
        decreaseItem(itemId, 1);
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

    function sellZip(itemId) {
        if (inventory[itemId]?.count >= 1) {
            playerMoney += 300;
            decreaseItem(itemId, 1);
            localStorage.setItem('playerMoney', playerMoney);
            updateInventory();

            updateMoneyDisplay(); 
        }
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

    function showActionMenu(actions, targetElement) {
        const actionMenu = document.getElementById('action-menu');
        actionMenu.innerHTML = ''; // Очищаем старые кнопки
    
        if (actions.length === 0) {
            actionMenu.classList.add('hidden');
            return;
        }
    
        actions.forEach(action => {
            const button = document.createElement('button');
            button.className = 'action-button';
            button.textContent = action.label;
            button.addEventListener('click', () => {
                action.action();
                hideActionMenu();
            });
            actionMenu.appendChild(button);
        });
    
        const rect = targetElement.getBoundingClientRect();
    
        // Новое позиционирование — меню справа от элемента
        actionMenu.style.top = `${rect.top + window.scrollY + rect.height / 2 - actionMenu.offsetHeight / 2}px`; 
        actionMenu.style.left = `${rect.right + window.scrollX + 10}px`; // немного отступим вправо
    
        // Чтобы корректно рассчитать offsetHeight, сначала показать элемент невидимым
        actionMenu.classList.add('hidden');
        actionMenu.style.display = 'block'; // временно включаем отображение
    
        // После того как браузер прочитал размеры:
        requestAnimationFrame(() => {
            actionMenu.style.top = `${rect.top + window.scrollY + rect.height / 2 - actionMenu.offsetHeight / 2}px`;
            actionMenu.style.left = `${rect.right + window.scrollX + 10}px`;
            actionMenu.classList.remove('hidden');
            actionMenu.style.display = ''; // убираем фикс
        });
    }
    
    
    // Скрытие меню при клике вне его
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
    
            shishCount++;
            if (!inventory['shishka']) {
                inventory['shishka'] = { count: 0, type: 'product', name: 'Шишка' };
            }
            inventory['shishka'].count++;
    
            localStorage.setItem('shishCount', shishCount);
            saveInventory();
            updateInventory(); // <<< добавили
    
            setTimeout(() => {
                showBud(bud);
            }, 5000);
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
        leafContainer.style.left = `${offsetX}px`;  // Используем корректное значение с шаблонной строкой
        leafContainer.style.top = `${offsetY}px`;   // Используем корректное значение с шаблонной строкой
    
        for (let i = 0; i < 4; i++) {
            const leaf = document.createElement('div');
            leaf.className = 'leaf';
            leaf.style.setProperty('--x', `${Math.random() * 40 - 20}px`);  // Исправлено на шаблонную строку
            leaf.style.setProperty('--y', `${Math.random() * -40}px`);     // Исправлено на шаблонную строку
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
    }

    function closeShop() {
        shopModal.classList.remove('open');
        updateMoneyDisplay(); 
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
            quantityInput.value = 1;
        } else {
            quantityContainer.style.display = 'none';
        }

        productModal.classList.add('open');
        updateMoneyDisplay(); 
    }

    function closeProductModal() {
        productModal.classList.remove('open');
        updateMoneyDisplay(); 
    }

    function confirmPurchase() {
        if (!selectedProduct) return;

        const quantity = selectedProduct.quantitySelectable ? parseInt(quantityInput.value) || 1 : 1;
        const totalPrice = selectedProduct.price * quantity;

        if (playerMoney >= totalPrice) {
            playerMoney -= totalPrice;

            if (!inventory[selectedProduct.id]) {
                inventory[selectedProduct.id] = { count: 0, type: selectedProduct.type, name: selectedProduct.name };
            }
            inventory[selectedProduct.id].count += quantity;

            saveInventory();
            localStorage.setItem('playerMoney', playerMoney);

            closeProductModal();
            closeShop();
        } else {
            alert('Недостаточно средств!');
        }
        updateMoneyDisplay(); 
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

    let quantity = 1; 

    increaseButton.addEventListener("click", function() {
        quantity++;
        updateQuantity();
    });

    // Уменьшаем количество
    decreaseButton.addEventListener("click", function() {
        if (quantity > 1) {
            quantity--;
            updateQuantity();
        }
    });

    // Обновляем значение в поле
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