// Utility script to clear all forms from the database
// Run this with: npx tsx server/clear-forms.ts

import "dotenv/config";
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.DATABASE_NAME || "event_registration";

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI environment variable is required");
  process.exit(1);
}

async function clearForms() {
  const client = new MongoClient(MONGODB_URI!);
  
  try {
    console.log("🔄 Connecting to MongoDB...");
    await client.connect();
    const db = client.db(DATABASE_NAME);
    
    console.log("🗑️  Deleting all forms...");
    const result = await db.collection("event_forms").deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} form(s)`);
    
    console.log("✅ All forms cleared successfully!");
  } catch (error) {
    console.error("❌ Error clearing forms:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("🔌 Database connection closed");
  }
}

clearForms();
