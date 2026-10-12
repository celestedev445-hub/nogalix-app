from fastapi import APIRouter

from app.modules.plans.catalog import template_is_premium

router = APIRouter(prefix="/templates", tags=["templates"])

# Templates de rendu vivent dans le frontend pour la réactivité.
# Ce endpoint optionnel expose seulement des métadonnées (ids) si besoin futur.
# Le flag premium est dérivé de PREMIUM_TEMPLATE_IDS (plans/catalog.py),
# lui-même aligné sur frontend/src/lib/templatePreviews.ts (premium: true).
_TEMPLATES = [
    {"id": "atlas", "name": "Atlas", "category": "moderne"},
    {"id": "ndame", "name": "Ndame", "category": "moderne"},
    {"id": "simple-colonne", "name": "Simple colonne", "category": "minimaliste"},
    {"id": "ndiaye", "name": "Ndiaye", "category": "classique"},
    {"id": "elongou-editorial", "name": "Elongou Editorial", "category": "creatif"},
    {"id": "deux-colonnes", "name": "Deux colonnes", "category": "moderne"},
    {"id": "bongue", "name": "Bongue", "category": "moderne"},
    {"id": "bongue-sidebar", "name": "Bongue Sidebar", "category": "moderne"},
    {"id": "ngo-yellow", "name": "Ngo Yellow", "category": "creatif"},
    {"id": "mbarga", "name": "Mbarga", "category": "premium"},
    {"id": "photo-haut", "name": "Photo haut", "category": "creatif"},
    {"id": "elongou-typo", "name": "Elongou Typo", "category": "creatif"},
    {"id": "kouame-photo", "name": "Kouame Photo", "category": "moderne"},
    {"id": "amina-pastel", "name": "Amina Pastel", "category": "creatif"},
    {"id": "classique", "name": "Classique", "category": "classique"},
    {"id": "mvondo", "name": "Mvondo", "category": "moderne"},
    {"id": "enzo-dark", "name": "Enzo Dark", "category": "premium"},
    {"id": "amina-minimal", "name": "Amina Minimal", "category": "minimaliste"},
    {"id": "voundi-dark", "name": "Voundi Dark", "category": "premium"},
    {"id": "voundi-editorial", "name": "Voundi Editorial", "category": "creatif"},
    {"id": "ndjock", "name": "Ndjock", "category": "moderne"},
    {"id": "lateral", "name": "Latéral", "category": "moderne"},
    {"id": "essomba", "name": "Essomba", "category": "premium"},
    {"id": "ngo-clean", "name": "Ngo Clean", "category": "minimaliste"},
]

CATALOG = [{**item, "premium": template_is_premium(item["id"])} for item in _TEMPLATES]


@router.get("")
def index():
    return {"data": CATALOG}
