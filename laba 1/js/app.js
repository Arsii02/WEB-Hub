const STORAGE_KEY = 'board-games';

const categories = {
    strategy: 'Стратегия',
    family: 'Семейная',
    party: 'Для компании',
    detective: 'Детектив',
    economic: 'Экономическая'
};

const statuses = {
    available: 'В наличии',
    unavailable: 'Нет в наличии'
};

const defaultItems = [
    {
        id: '1',
        name: 'Каркассон',
        category: 'strategy',
        rating: 8.1,
        description: 'Стратегическая игра о строительстве средневековой местности.',
        status: 'available'
    },
    {
        id: '2',
        name: 'Колонизаторы',
        category: 'strategy',
        rating: 8.0,
        description: 'Игра о развитии поселений, торговле и ресурсах.',
        status: 'available'
    },
    {
        id: '3',
        name: 'Клуэдо',
        category: 'detective',
        rating: 7.2,
        description: 'Детективная игра, в которой нужно раскрыть преступление.',
        status: 'available'
    },
    {
        id: '4',
        name: 'Монополия',
        category: 'economic',
        rating: 6.8,
        description: 'Классическая игра про недвижимость и капитал.',
        status: 'available'
    },
    {
        id: '5',
        name: 'Имаджинариум',
        category: 'party',
        rating: 7.5,
        description: 'Игра на воображение и ассоциации для компании.',
        status: 'unavailable'
    },
    {
        id: '6',
        name: 'Ticket to Ride',
        category: 'family',
        rating: 8.3,
        description: 'Игра о строительстве железнодорожных маршрутов.',
        status: 'available'
    }
];

const savedItems = localStorage.getItem(STORAGE_KEY);

const state = {
    items: savedItems ? JSON.parse(savedItems) : defaultItems,
    searchQuery: '',
    selectedCategory: 'all',
    sortBy: 'name-asc'
};

const gamesList = document.getElementById('gamesList');
const searchInput = document.getElementById('game-name');
const genreSelect = document.getElementById('genre');
const sortSelect = document.getElementById('sort');

const modal = document.getElementById('gameModal');
const openModalButton = document.getElementById('openModalButton');
const closeModalButton = document.getElementById('closeModalButton');
const cancelModalButton = document.getElementById('cancelModalButton');
const modalBackdrop = document.getElementById('modalBackdrop');
const addGameForm = document.getElementById('addGameForm');


function saveItems() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state.items)
    );
}


function getVisibleItems() {
    const query = state.searchQuery.toLowerCase();

    const filtered = state.items.filter((item) => {
        const matchesSearch =
            item.name.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query);

        const matchesCategory =
            state.selectedCategory === 'all' ||
            item.category === state.selectedCategory;

        return matchesSearch && matchesCategory;
    });

    const sorted = [...filtered];

    sorted.sort((a, b) => {
        if (state.sortBy === 'name-asc') {
            return a.name.localeCompare(b.name, 'ru');
        }

        if (state.sortBy === 'name-desc') {
            return b.name.localeCompare(a.name, 'ru');
        }

        if (state.sortBy === 'rating-desc') {
            return b.rating - a.rating;
        }

        return a.rating - b.rating;
    });

    return sorted;
}


function createCard(item) {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.id = item.id;

    const cover = document.createElement('div');
    cover.className = 'card-cover';

    const category = document.createElement('span');
    category.textContent = categories[item.category];

    cover.append(category);

    const content = document.createElement('div');
    content.className = 'card-content';

    const title = document.createElement('h3');
    title.textContent = item.name;

    const description = document.createElement('p');
    description.textContent = item.description;

    const info = document.createElement('div');
    info.className = 'card-info';

    const rating = document.createElement('span');
    rating.textContent = `Рейтинг: ${item.rating}`;

    const status = document.createElement('span');
    status.textContent = statuses[item.status];

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'delete-button';
    deleteButton.textContent = 'Удалить';

    info.append(rating, status);
    content.append(title, description, info, deleteButton);
    card.append(cover, content);

    return card;
}


function render() {
    gamesList.replaceChildren();

    const items = getVisibleItems();

    if (items.length === 0) {
        const message = document.createElement('p');
        message.className = 'no-results';
        message.textContent = 'Игры не найдены.';
        gamesList.append(message);
        return;
    }

    items.forEach((item) => {
        gamesList.append(createCard(item));
    });
}


/* Поиск */

searchInput.addEventListener('input', (event) => {
    state.searchQuery = event.target.value;
    render();
});


/* Фильтр */

genreSelect.addEventListener('change', (event) => {
    state.selectedCategory = event.target.value;
    render();
});


/* Сортировка */

sortSelect.addEventListener('change', (event) => {
    state.sortBy = event.target.value;
    render();
});


/* Модальное окно */

function openModal() {
    addGameForm.reset();
    modal.classList.add('open');
}

function closeModal() {
    modal.classList.remove('open');
}

openModalButton.addEventListener('click', openModal);
closeModalButton.addEventListener('click', closeModal);
cancelModalButton.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', closeModal);

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeModal();
    }
});


/* Валидация и добавление */

addGameForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const fields = addGameForm.querySelectorAll(
        'input, select, textarea'
    );

    let valid = true;

    fields.forEach((field) => {
        const error =
            document.getElementById(`${field.id}Error`);

        if (!field.validity.valid) {
            error.textContent = 'Проверьте правильность заполнения.';
            valid = false;
        } else {
            error.textContent = '';
        }
    });

    if (!valid) {
        return;
    }

    const formData = new FormData(addGameForm);

    const newGame = {
        id: String(Date.now()),
        name: formData.get('name').trim(),
        category: formData.get('category'),
        rating: Number(formData.get('rating')),
        description: formData.get('description').trim(),
        status: formData.get('status')
    };

    state.items = [...state.items, newGame];

    saveItems();
    render();
    closeModal();
});


/* Удаление через Event Delegation */

gamesList.addEventListener('click', (event) => {
    const button = event.target.closest('.delete-button');

    if (button === null) {
        return;
    }

    const card = button.closest('.card');
    const id = card.dataset.id;

    state.items = state.items.filter(
        (item) => item.id !== id
    );

    saveItems();
    render();
});


render();