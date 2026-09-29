import enum
from datetime import datetime, timezone
from importlib import import_module

from sqlalchemy import DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

_sqlalchemy = import_module("sqlalchemy")
_sqlalchemy_orm = import_module("sqlalchemy.orm")

DateTime = _sqlalchemy.DateTime
Enum = _sqlalchemy.Enum
String = _sqlalchemy.String
Mapped = _sqlalchemy_orm.Mapped
mapped_column = _sqlalchemy_orm.mapped_column

from app.db import Base


class Role(str, enum.Enum):
    admin = "admin"
    member = "member"


class UserStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(100))
    role: Mapped[Role] = mapped_column(
        Enum(Role, native_enum=False, length=20), default=Role.member
    )
    status: Mapped[UserStatus] = mapped_column(
        Enum(UserStatus, native_enum=False, length=20), default=UserStatus.pending
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )


class ChorePeriod(str, enum.Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"


class ChoreStatus(str, enum.Enum):
    proposed = "proposed"
    active = "active"


class Chore(Base):
    __tablename__ = "chores"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(String(1000), default=None)
    period: Mapped[ChorePeriod] = mapped_column(
        Enum(ChorePeriod, native_enum=False, length=20)
    )
    weight: Mapped[int] = mapped_column()
    status: Mapped[ChoreStatus] = mapped_column(
        Enum(ChoreStatus, native_enum=False, length=20), default=ChoreStatus.proposed
    )
    proposed_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

    proposed_by: Mapped["User"] = relationship()