import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Visibility(str, enum.Enum):
    private = "private"
    unlisted = "unlisted"
    public = "public"


class Recipe(Base):
    __tablename__ = "recipes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    source_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str | None] = mapped_column(Text)
    servings: Mapped[int | None] = mapped_column(Integer)
    total_time_min: Mapped[int | None] = mapped_column(Integer)
    cuisine: Mapped[str | None] = mapped_column(String(100))
    kcal_per_serving: Mapped[int | None] = mapped_column(Integer)
    visibility: Mapped[Visibility] = mapped_column(
        Enum(Visibility, name="visibility"), default=Visibility.private, nullable=False
    )
    tips: Mapped[list[str] | None] = mapped_column(JSON)
    llm_provider: Mapped[str | None] = mapped_column(String(50))
    llm_model: Mapped[str | None] = mapped_column(String(100))
    llm_input_tokens: Mapped[int | None] = mapped_column(Integer)
    llm_output_tokens: Mapped[int | None] = mapped_column(Integer)
    transcribe_seconds: Mapped[float | None] = mapped_column(Float)
    cost_usd: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    ingredients: Mapped[list["Ingredient"]] = relationship(
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="Ingredient.position",
    )
    steps: Mapped[list["Step"]] = relationship(
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="Step.position",
    )


class Ingredient(Base):
    __tablename__ = "ingredients"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    recipe_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("recipes.id", ondelete="CASCADE"), index=True, nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity: Mapped[str | None] = mapped_column(String(50))
    unit: Mapped[str | None] = mapped_column(String(50))
    item: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)

    recipe: Mapped[Recipe] = relationship(back_populates="ingredients")


class Step(Base):
    __tablename__ = "steps"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    recipe_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("recipes.id", ondelete="CASCADE"), index=True, nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    duration_seconds: Mapped[int | None] = mapped_column(Integer)

    recipe: Mapped[Recipe] = relationship(back_populates="steps")


class SavedRecipe(Base):
    __tablename__ = "saved_recipes"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    recipe_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("recipes.id", ondelete="CASCADE"), primary_key=True
    )
    saved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class RecipeTranslation(Base):
    __tablename__ = "recipe_translations"

    recipe_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("recipes.id", ondelete="CASCADE"), primary_key=True
    )
    language: Mapped[str] = mapped_column(String(5), primary_key=True)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    llm_model: Mapped[str | None] = mapped_column(String(100))
    llm_input_tokens: Mapped[int | None] = mapped_column(Integer)
    llm_output_tokens: Mapped[int | None] = mapped_column(Integer)
    cost_usd: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ShareToken(Base):
    __tablename__ = "share_tokens"

    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    recipe_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("recipes.id", ondelete="CASCADE"), index=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
