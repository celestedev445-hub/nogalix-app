"""Suppression des fichiers d'un utilisateur (compte supprimé par lui-même ou par un admin)."""

import logging
import shutil
from pathlib import Path

logger = logging.getLogger(__name__)

_STORAGE = Path(__file__).resolve().parents[3] / "storage"


def purge_user_files(user_id: int) -> None:
    uid = str(int(user_id))
    for folder in (_STORAGE / "imports" / uid, _STORAGE / "documents" / uid):
        try:
            shutil.rmtree(folder, ignore_errors=True)
        except OSError:
            logger.exception("Nettoyage impossible : %s", folder)
