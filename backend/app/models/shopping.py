import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class ShoppingListItem(Base):
    __tablename__ = "shopping_list_items"
    __table_args__ = (
        UniqueConstraint("user_id", "item_normalized", name="uq_shopping_user_item"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    item: Mapped[str] = mapped_column(String(255), nullable=False)
    item_normalized: Mapped[str] = mapped_column(String(255), nullable=False)
    recipe_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("recipes.id", ondelete="SET NULL")
    )
    checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


def normalize(item: str) -> str:
    return " ".join(item.lower().split())
