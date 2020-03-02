async function connectToDB(node, OrbitDB) {

    // Create OrbitDB instance
    const orbitdb = await OrbitDB.createInstance(node);

    // Connect to the previously created users_db1
    const db = await orbitdb.open('/orbitdb/zdpuB2Gu6EgrD86FzKMYpKbaj8TdH9q4RgyEBKmawBeWtRVXT/users_db1');
    // Load locally persisted data
    await db.load();

    console.log('Successfully connected to DB at address: ' + db.address.toString());

    return db;
}

async function createDB(node, OrbitDB) {

    // TODO: error handling
    const orbitdb = await OrbitDB.createInstance(node);

    const options = {
        // Give write access to everyone
        accessController: {
            write: ['*'],
        },
        indexBy: 'peerID',
        pin: true
    };

    const db = await orbitdb.docs('users_db', options);

    return db;
}

module.exports.connectToDB = connectToDB
module.exports.createDB = createDB