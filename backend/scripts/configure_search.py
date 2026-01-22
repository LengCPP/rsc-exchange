import meilisearch
from app.core.config import settings

def configure_meilisearch():
    client = meilisearch.Client(settings.MEILI_URL, settings.MEILI_MASTER_KEY)
    
    # Configure Items index
    print("Configuring 'items' index...")
    items_index = client.index("items")
    items_index.update_settings({
        "searchableAttributes": [
            "title",
            "author",
            "description",
            "item_type"
        ],
        "typoTolerance": {
            "enabled": True,
            "minWordSizeForTypos": {
                "oneTypo": 4,
                "twoTypos": 8
            }
        },
        "rankingRules": [
            "words",
            "typo",
            "proximity",
            "attribute",
            "sort",
            "exactness"
        ]
    })
    
    # Configure Communities index
    print("Configuring 'communities' index...")
    communities_index = client.index("communities")
    communities_index.update_settings({
        "searchableAttributes": [
            "name",
            "description"
        ],
        "typoTolerance": {
            "enabled": True,
            "minWordSizeForTypos": {
                "oneTypo": 4,
                "twoTypos": 8
            }
        }
    })
    
    print("Meilisearch configuration complete.")

if __name__ == "__main__":
    configure_meilisearch()
