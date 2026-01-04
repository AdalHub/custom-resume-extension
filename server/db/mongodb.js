const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'proofresume';

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not set in environment variables');
}

let client = null;
let db = null;

/**
 * Connect to MongoDB Atlas
 * @returns {Promise<MongoClient>}
 */
async function connectToMongoDB() {
  if (client) {
    return client;
  }

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(MONGODB_DB);
    console.log('Connected to MongoDB Atlas');
    return client;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

/**
 * Get database instance
 * @returns {Promise<Db>}
 */
async function getDatabase() {
  if (!db) {
    await connectToMongoDB();
  }
  return db;
}

/**
 * Get collections
 */
async function getCollections() {
  const database = await getDatabase();
  return {
    users: database.collection('users'),
    generations: database.collection('generations'),
  };
}

/**
 * Close MongoDB connection
 */
async function closeConnection() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
}

// Create indexes on startup
async function createIndexes() {
  try {
    const { generations, users } = await getCollections();
    
    // Indexes for generations collection
    await generations.createIndex({ userId: 1, createdAt: -1 });
    await generations.createIndex({ createdAt: -1 });
    await generations.createIndex({ _id: 1 });
    
    // Indexes for users collection
    await users.createIndex({ userId: 1 }, { unique: true });
    
    console.log('MongoDB indexes created');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}

module.exports = {
  connectToMongoDB,
  getDatabase,
  getCollections,
  closeConnection,
  createIndexes,
};



