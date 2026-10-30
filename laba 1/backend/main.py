from pathlib import Path
import sqlite3
from typing import Literal

from fastapi import FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# -----------------------------
# БАЗА ДАННЫХ
# -----------------------------

DB_PATH = Path(__file__).parent / "board_games.db"


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_database():
    with get_connection() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS board_games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL
                    CHECK (category IN (
                        'strategy',
                        'family',
                        'party',
                        'detective',
                        'economic'
                    )),
                rating REAL NOT NULL
                    CHECK (rating >= 1 AND rating <= 10),
                description TEXT NOT NULL,
                status TEXT NOT NULL
                    CHECK (status IN (
                        'available',
                        'unavailable'
                    ))
            )
        """)

        count = db.execute(
            "SELECT COUNT(*) FROM board_games"
        ).fetchone()[0]

        if count == 0:
            games = [
                (
                    "Каркассон",
                    "strategy",
                    8.1,
                    "Стратегическая игра о строительстве средневековой местности.",
                    "available"
                ),
                (
                    "Колонизаторы",
                    "strategy",
                    8.0,
                    "Игра о развитии поселений, торговле и ресурсах.",
                    "available"
                ),
                (
                    "Клуэдо",
                    "detective",
                    7.2,
                    "Детективная игра, в которой нужно раскрыть преступление.",
                    "available"
                ),
                (
                    "Монополия",
                    "economic",
                    6.8,
                    "Классическая игра про недвижимость и капитал.",
                    "available"
                ),
                (
                    "Имаджинариум",
                    "party",
                    7.5,
                    "Игра на воображение и ассоциации для компании.",
                    "unavailable"
                ),
                (
                    "Ticket to Ride",
                    "family",
                    8.3,
                    "Игра о строительстве железнодорожных маршрутов.",
                    "available"
                )
            ]

            db.executemany("""
                INSERT INTO board_games
                (name, category, rating, description, status)
                VALUES (?, ?, ?, ?, ?)
            """, games)

        db.commit()


# -----------------------------
# СХЕМЫ ДАННЫХ
# -----------------------------

Category = Literal[
    "strategy",
    "family",
    "party",
    "detective",
    "economic"
]

GameStatus = Literal[
    "available",
    "unavailable"
]


class BoardGameCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    category: Category
    rating: float = Field(ge=1, le=10)
    description: str = Field(min_length=10, max_length=1000)
    status: GameStatus


class BoardGameUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    category: Category | None = None
    rating: float | None = Field(default=None, ge=1, le=10)
    description: str | None = Field(default=None, min_length=10, max_length=1000)
    status: GameStatus | None = None


class BoardGame(BoardGameCreate):
    id: int


# -----------------------------
# FASTAPI
# -----------------------------

app = FastAPI(
    title="Мир настольных игр API",
    version="1.0.0",
    description="REST API для каталога настольных игр"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_methods=["*"],
    allow_headers=["*"]
)

init_database()


# -----------------------------
# GET — ПОЛУЧИТЬ ВСЕ ИГРЫ
# -----------------------------

@app.get("/api/board-games", response_model=list[BoardGame])
def get_games():
    with get_connection() as db:
        rows = db.execute(
            "SELECT * FROM board_games ORDER BY id"
        ).fetchall()

    return [dict(row) for row in rows]


# -----------------------------
# POST — ДОБАВИТЬ ИГРУ
# -----------------------------

@app.post(
    "/api/board-games",
    response_model=BoardGame,
    status_code=status.HTTP_201_CREATED
)
def create_game(game: BoardGameCreate):
    with get_connection() as db:
        cursor = db.execute("""
            INSERT INTO board_games
            (name, category, rating, description, status)
            VALUES (?, ?, ?, ?, ?)
        """, (
            game.name,
            game.category,
            game.rating,
            game.description,
            game.status
        ))

        db.commit()
        game_id = cursor.lastrowid

        row = db.execute(
            "SELECT * FROM board_games WHERE id = ?",
            (game_id,)
        ).fetchone()

    return dict(row)


# -----------------------------
# GET — ПОЛУЧИТЬ ИГРУ ПО ID
# -----------------------------

@app.get("/api/board-games/{game_id}", response_model=BoardGame)
def get_game(game_id: int):
    with get_connection() as db:
        row = db.execute(
            "SELECT * FROM board_games WHERE id = ?",
            (game_id,)
        ).fetchone()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Игра не найдена"
        )

    return dict(row)


# -----------------------------
# PATCH — ИЗМЕНИТЬ ИГРУ
# -----------------------------

@app.patch("/api/board-games/{game_id}", response_model=BoardGame)
def update_game(game_id: int, game: BoardGameUpdate):
    data = game.model_dump(exclude_unset=True)

    if not data:
        raise HTTPException(
            status_code=400,
            detail="Нет данных для обновления"
        )

    with get_connection() as db:
        old_game = db.execute(
            "SELECT * FROM board_games WHERE id = ?",
            (game_id,)
        ).fetchone()

        if old_game is None:
            raise HTTPException(
                status_code=404,
                detail="Игра не найдена"
            )

        fields = []
        values = []

        for key, value in data.items():
            fields.append(f"{key} = ?")
            values.append(value)

        values.append(game_id)

        db.execute(
            f"UPDATE board_games SET {', '.join(fields)} WHERE id = ?",
            values
        )

        db.commit()

        row = db.execute(
            "SELECT * FROM board_games WHERE id = ?",
            (game_id,)
        ).fetchone()

    return dict(row)


# -----------------------------
# DELETE — УДАЛИТЬ ИГРУ
# -----------------------------

@app.delete(
    "/api/board-games/{game_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_game(game_id: int):
    with get_connection() as db:
        row = db.execute(
            "SELECT id FROM board_games WHERE id = ?",
            (game_id,)
        ).fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="Игра не найдена"
            )

        db.execute(
            "DELETE FROM board_games WHERE id = ?",
            (game_id,)
        )

        db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
