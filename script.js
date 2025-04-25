const buds = document.querySelectorAll('.bud');
const counter = document.querySelector('.amount');
let shishCount = 0;

function showBud(bud) {
    createLeaves(bud); // Листики появляются перед шишкой

    bud.style.opacity = 1;
    bud.style.transform = 'scale(1)';
    
    setTimeout(() => {
        bud.classList.add('active');
    }, 50); 
}

function hideBud(bud) {
    if (!bud.classList.contains('active') || bud.classList.contains('collecting')) return;  // Если шишка уже собирается или не активна, выходим

    createLeaves(bud); // Листики появляются перед исчезновением шишки
    
    shishCount++;  // Обновляем счетчик сразу
    counter.textContent = `${shishCount} MRHA`;  // Обновляем счетчик

    bud.classList.add('collecting');  // Начинаем анимацию сбора

    // После того как анимация пройдет, скрываем шишку
    setTimeout(() => {
        bud.classList.remove('collecting'); 
        bud.style.transform = 'scale(0)';  
        bud.style.opacity = '0';           

        // Перезагружаем шишку после задержки
        setTimeout(() => {
            showBud(bud); 
        }, 5000);  
    }, 1000);  // Время анимации сбора
}

buds.forEach(bud => {
    showBud(bud);  // Начальная отрисовка шишки

    bud.addEventListener('click', () => {
        if (!bud.classList.contains('active') || bud.classList.contains('collecting')) return;  // Если шишка не активна или уже собирается, не кликаем

        hideBud(bud);  // Прячем шишку после клика
    });
});

// Функция для создания листиков
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

    // Генерация листиков
    for (let i = 0; i < 4; i++) {
        const leaf = document.createElement('div');
        leaf.className = 'leaf';
        leaf.style.setProperty('--x', `${Math.random() * 40 - 20}px`);
        leaf.style.setProperty('--y', `${Math.random() * -40}px`);
        leafContainer.appendChild(leaf);
    }

    // Добавляем контейнер с листиками в родительский элемент
    bud.parentElement.appendChild(leafContainer);

    // Удаляем контейнер с листиками после завершения анимации
    setTimeout(() => {
        leafContainer.remove();
    }, 500); // Листики исчезают через 500ms
}
