import enum
from datetime import datetime, timezone
from importlib import import_module

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