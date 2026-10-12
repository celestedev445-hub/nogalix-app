"""Promeut (ou crée) un compte administrateur.

Usage :
    python scripts/create_admin.py admin@exemple.com            # promeut un compte existant
    python scripts/create_admin.py admin@exemple.com --create   # crée le compte (mot de passe demandé)
"""

import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.modules import models_registry  # noqa: E402,F401
from app.modules.users.models import User  # noqa: E402


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        print(__doc__)
        return 1
    email = args[0].strip().lower()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            if "--create" not in sys.argv:
                print(f"Aucun compte {email}. Relancez avec --create pour le créer.")
                return 1
            password = getpass.getpass("Mot de passe (8 caractères min.) : ")
            if len(password) < 8:
                print("Mot de passe trop court.")
                return 1
            user = User(name=email.split("@")[0], email=email, password_hash=hash_password(password))
            db.add(user)
        user.role = "admin"
        user.status = "active"
        db.commit()
        print(f"{email} est administrateur.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
