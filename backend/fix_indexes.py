# fix_indexes.py
from database import get_database

def fix_indexes_and_clear_skills():
    db_manager = get_database()
    skills_collection = db_manager.skills_trends

    print("Current Indexes:")
    for index in skills_collection.list_indexes():
        print(index)

    # Drop ALL existing indexes except _id
    try:
        # Get all index names except _id_
        index_names = [idx['name'] for idx in skills_collection.list_indexes() if idx['name'] != '_id_']
        for idx_name in index_names:
            skills_collection.drop_index(idx_name)
            print(f"Dropped index: {idx_name}")
    except Exception as e:
        print(f"Error dropping indexes: {e}")

    # Create the correct compound unique index
    skills_collection.create_index(
        [("skill_name", 1), ("category", 1)],
        unique=True,
        name="skill_name_category_unique"
    )
    print("✅ Created compound unique index (skill_name + category)")

    # Clear existing documents to avoid conflict
    deleted = skills_collection.delete_many({})
    print(f"🧹 Deleted {deleted.deleted_count} documents from skills_trends collection")

    print("🎉 Database indexes fixed successfully!")

if __name__ == '__main__':
    fix_indexes_and_clear_skills()
