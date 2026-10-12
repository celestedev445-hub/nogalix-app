"""Clients HTTP sortants (IA, offres d'emploi, Google, paiements…).

Charger les certificats TLS coûte 0,5 à 0,9 s ; fait à chaque `httpx.AsyncClient()`, cela
bloquait tout le serveur pendant ce temps. Le contexte est donc créé une seule fois par
processus (au démarrage) et partagé par tous les clients.
"""

from __future__ import annotations

import ssl
from functools import lru_cache
from typing import Any

import certifi
import httpx


@lru_cache(maxsize=1)
def tls_context() -> ssl.SSLContext:
    return ssl.create_default_context(cafile=certifi.where())


def async_client(**kwargs: Any) -> httpx.AsyncClient:
    kwargs.setdefault("verify", tls_context())
    return httpx.AsyncClient(**kwargs)


def sync_client(**kwargs: Any) -> httpx.Client:
    kwargs.setdefault("verify", tls_context())
    return httpx.Client(**kwargs)


def warm_up() -> None:
    """À appeler au démarrage : aucune requête ne paie le chargement des certificats."""
    httpx.Client(verify=tls_context()).close()
