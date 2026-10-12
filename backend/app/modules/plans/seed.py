import threading

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.plans.catalog import (
    capabilities_for_tier,
    default_plans,
    features_for_tier,
    tier_for_level,
    tier_for_slug,
)
from app.modules.plans.models import Plan, PlanFeature, PlanLimitation


# Mémo process : l'inspection des plans par défaut n'a lieu qu'une fois par processus.
_defaults_ready = False
_defaults_lock = threading.Lock()


def seed_plan_children(plan: Plan, *, clear: bool = False, refresh_features: bool = False) -> None:
    tier = tier_for_slug(plan.slug) if plan.slug else tier_for_level(plan.level)
    if clear:
        plan.limitations.clear()
        plan.features.clear()

    by_key = {item.key: item for item in plan.limitations}
    for cap in capabilities_for_tier(tier):
        row = by_key.get(cap["key"])
        if row:
            row.limitation_type = cap["limitation_type"]
            row.value = int(cap["value"])
            row.description = cap.get("description")
            continue
        plan.limitations.append(
            PlanLimitation(
                key=cap["key"],
                limitation_type=cap["limitation_type"],
                value=int(cap["value"]),
                description=cap.get("description"),
            )
        )

    wanted_features = features_for_tier(tier)
    current_names = [item.name for item in plan.features]
    wanted_names = [item["name"] for item in wanted_features]
    if refresh_features or not plan.features or current_names != wanted_names:
        plan.features.clear()
        for feature in wanted_features:
            plan.features.append(
                PlanFeature(
                    name=feature["name"],
                    description=feature.get("description"),
                    is_enabled=bool(feature.get("is_enabled", True)),
                    sort_order=int(feature.get("sort_order", 0)),
                )
            )


def ensure_default_plans(db: Session) -> list[Plan]:
    """Crée les plans par défaut manquants (insert-only).

    Ne réécrit jamais un plan existant : description, limitations et features
    modifiées par un admin sont conservées. Exécuté une seule fois par processus.
    """
    global _defaults_ready
    if _defaults_ready:
        return []
    with _defaults_lock:
        if _defaults_ready:
            return []
        created: list[Plan] = []
        existing = {slug for (slug,) in db.query(Plan.slug).all()}
        for item in default_plans():
            if item["slug"] in existing:
                continue
            plan = Plan(
                slug=item["slug"],
                name=item["name"],
                description=item.get("description"),
                tagline=item.get("tagline"),
                price=int(item["price"]),
                duration_months=int(item.get("duration_months", 1)),
                level=int(item.get("level", 1)),
                is_active=bool(item.get("is_active", True)),
                highlighted=bool(item.get("highlighted", False)),
                popular=bool(item.get("popular", False)),
                cta=item.get("cta") or "Choisir",
            )
            db.add(plan)
            db.flush()
            seed_plan_children(plan, refresh_features=True)
            created.append(plan)
        if created:
            try:
                db.commit()
            except IntegrityError:
                # Un autre worker a inséré le même slug en parallèle.
                db.rollback()
                created = []
        _defaults_ready = True
        return created


def get_default_free_plan(db: Session) -> Plan | None:
    ensure_default_plans(db)
    return db.query(Plan).filter(Plan.slug == "gratuit", Plan.is_active.is_(True)).first()
