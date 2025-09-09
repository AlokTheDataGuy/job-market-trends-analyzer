# final_cleanup.py
from database import get_database

def final_database_cleanup():
    print("🧹 Starting final database cleanup...")
    
    db_manager = get_database()
    skills_collection = db_manager.skills_trends
    
    # Drop ALL existing indexes except _id
    print("Dropping all existing indexes...")
    try:
        skills_collection.drop_indexes()
        print("✅ All indexes dropped")
    except Exception as e:
        print(f"⚠️ Error dropping indexes: {e}")
    
    # Clear the collection completely
    deleted = skills_collection.delete_many({})
    print(f"🗑️ Deleted {deleted.deleted_count} existing skill documents")
    
    # The database.py will automatically create the correct indexes when we reconnect
    print("✅ Database cleanup complete!")
    print("📝 Next step: Run your analytics - the correct indexes will be created automatically")

if __name__ == "__main__":
    final_database_cleanup()
