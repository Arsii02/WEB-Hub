const API_URL = 'http://127.0.0.1:8000/api/board-games';

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

const state = {
    items: [],
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


async function loadGames() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error('Ошибка загрузки игр');
        }

        state.items = await response.json();
        render();
    } catch (error) {
        gamesList.textContent = 'Не удалось загрузить игры с сервера.';
    }
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

    const gameStatus = document.createElement('span');
    gameStatus.textContent = statuses[item.status];

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'edit-button';
    editButton.textContent = 'Изменить рейтинг';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'delete-button';
    deleteButton.textContent = 'Удалить';

    info.append(rating, gameStatus);
    actions.append(editButton, deleteButton);
    content.append(title, description, info, actions);
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


searchInput.addEventListener('input', (event) => {
    state.searchQuery = event.target.value;
    render();
});

genreSelect.addEventListener('change', (event) => {
    state.selectedCategory = event.target.value;
    render();
});

sortSelect.addEventListener('change', (event) => {
    state.sortBy = event.target.value;
    render();
});


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


addGameForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const fields = addGameForm.querySelectorAll('input, select, textarea');
    let valid = true;

    fields.forEach((field) => {
        const error = document.getElementById(`${field.id}Error`);

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
        name: formData.get('name').trim(),
        category: formData.get('category'),
        rating: Number(formData.get('rating')),
        description: formData.get('description').trim(),
        status: formData.get('status')
    };

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newGame)
    });

    if (!response.ok) {
        alert('Не удалось добавить игру.');
        return;
    }

    await loadGames();
    closeModal();
});


async function updateRating(id) {
    const game = state.items.find((item) => item.id === id);
    const value = prompt('Введите новый рейтинг от 1 до 10:', game.rating);

    if (value === null) {
        return;
    }

    const rating = Number(value.replace(',', '.'));

    if (Number.isNaN(rating) || rating < 1 || rating > 10) {
        alert('Рейтинг должен быть от 1 до 10.');
        return;
    }

    const response = await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rating })
    });

    if (!response.ok) {
        alert('Не удалось изменить рейтинг.');
        return;
    }

    await loadGames();
}


async function deleteGame(id) {
    const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
    });

    if (response.status !== 204) {
        alert('Не удалось удалить игру.');
        return;
    }

    await loadGames();
}


gamesList.addEventListener('click', async (event) => {
    const editButton = event.target.closest('.edit-button');
    const deleteButton = event.target.closest('.delete-button');

    if (editButton !== null) {
        const card = editButton.closest('.card');
        await updateRating(Number(card.dataset.id));
    }

    if (deleteButton !== null) {
        const card = deleteButton.closest('.card');
        await deleteGame(Number(card.dataset.id));
    }
});


loadGames();
