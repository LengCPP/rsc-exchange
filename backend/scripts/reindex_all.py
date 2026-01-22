import logging
from sqlmodel import Session, select
from app.core.db import engine
from app.models import Item, Community, ItemType
from app.search import sync_item_to_search, sync_community_to_search

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def reindex_all() -> None:
    with Session(engine) as session:
        # Reindex Items (including Books)
        logger.info("Reindexing items...")
        items = session.exec(select(Item)).all()
        for item in items:
            sync_item_to_search(item)
        logger.info(f"Reindexed {len(items)} items.")

        # Reindex Communities
        logger.info("Reindexing communities...")
        communities = session.exec(select(Community)).all()
        for community in communities:
            sync_community_to_search(community)
        logger.info(f"Reindexed {len(communities)} communities.")

    logger.info("Reindexing complete.")

if __name__ == "__main__":
    reindex_all()