import bcrypt


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    encoded = password.encode("utf-8")
    if len(encoded) > 72:  # bcrypt limit; such a password can never match
        return False
    return bcrypt.checkpw(encoded, password_hash.encode("utf-8"))