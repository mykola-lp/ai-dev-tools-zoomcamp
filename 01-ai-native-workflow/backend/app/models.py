import enum
from datetime import date, datetime, timezone
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


class AssignmentStatus(str, enum.Enum):
    pending = "pending"
    done = "done"
    overdue = "overdue"


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(primary_key=True)
    chore_id: Mapped[int] = mapped_column(ForeignKey("chores.id"))
    assignee_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    due_date: Mapped[date] = mapped_column()
    status: Mapped[AssignmentStatus] = mapped_column(
        Enum(AssignmentStatus, native_enum=False, length=20),
        default=AssignmentStatus.pending,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )
    on_board: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

    chore: Mapped["Chore"] = relationship()
    assignee: Mapped["User"] = relationship()