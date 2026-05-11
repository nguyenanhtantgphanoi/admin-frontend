#!/usr/bin/env node

const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI is not defined in .env file');
  process.exit(1);
}

async function migrateUpdatedAtField() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    const collection = db.collection('lich-cong-giao');

    const docsWithoutUpdatedAt = await collection.countDocuments({
      updatedAt: { $exists: false }
    });

    console.log(`📊 Found ${docsWithoutUpdatedAt} documents without updatedAt field`);

    if (docsWithoutUpdatedAt === 0) {
      console.log('✅ All documents already have updatedAt field');
      await client.close();
      return;
    }

    const now = new Date();
    const result = await collection.updateMany(
      { updatedAt: { $exists: false } },
      { $set: { updatedAt: now } }
    );

    console.log(`\n📝 Update Results:`);
    console.log(`   - Matched:  ${result.matchedCount} documents`);
    console.log(`   - Modified: ${result.modifiedCount} documents`);
    console.log(`   - Timestamp used: ${now.toISOString()}`);

    if (result.modifiedCount > 0) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log('\n⚠️  No documents were modified');
    }
  } catch (error) {
    console.error('❌ Error during migration:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

migrateUpdatedAtField();
