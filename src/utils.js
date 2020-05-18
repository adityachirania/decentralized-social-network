
async function updateDB(node, db) {
    
    // Getting our peerID
    const nodeDetails = await Promise.resolve(node.id());
    const myPeerId = nodeDetails.id;

    // Get new root folder hash
    const new_root_hash = await node.files.stat('/root_folder');

    let record = await db.get(myPeerId);
    record.root_hash = new_root_hash.hash;

    console.log('New root folder hash is: ' + new_root_hash.hash);

    // Update the DB.
    db.put(record)
    .then(() => db.get(myPeerId))
    .then((value) => {
        console.log('The DB has been updated with the new root folder hash');
    });

    console.log(record);

}


async function addDataToPublicProfile(node, db, filename, filedata) {

    await node.files.mkdir('/root_folder/public').catch((err) => {
        // Do nothing
    });


    let flag = false;
    await node.files.write('/root_folder/public/' + filename, Buffer.from(filedata), { create: true }).catch((err) => {
        alert('Could not create file in public profile! Error: ' + err);
        flag = true;
    });

    if (flag) return;

    console.log('Added file to your public profile successfully!');

    // Update root folder hash in DB
    await updateDB(node, db);

}


// Creation of directory for the given friend and the Hello message.
async function createFriendDirectory(node, db, friend_peerID) {

    /**
     * Does two things:
     * 1. Adds the IPFS address of the peer to the bootstrap list
     * 2. Creates a folder for the friend and adds the hello message
     */

    // TODO: Improve error handling

    // Get friend's p2p-circuit address from DB
    const profile = await db.get(friend_peerID)

    if (!(profile && profile.length)) 
    {   
        console.log('Could not find friend\'s details in DB. Cannot add friend!');
        return false;
    }
    
    const friend_address = profile['0']['address']

    // First add friend to bootstrap list
    const res = await node.bootstrap.add(friend_address)
    console.log('Added friend to bootstrap list!');

    // Next create the folder for the friend and add hello message.
    const directory = '/root_folder/' + friend_peerID;

    let flag = false;
    await node.files.mkdir(directory).catch((err) => {
        console.log("Directory for this friend has already been created!");
        flag = true;
    });

    if(flag) return false;

    /** TODO: create a shared-secret key, which is then encrypted with the friend's public key.
        Place this final output in the hello_message constant declared below. For now, it is 
        hardcoded to be the friend's peerID.
    */

    // Getting the friend's public key from the DB
    // console.log(profile['0']['public_key']);

    const hello_message = friend_peerID; // Replace peerID with shared-secret

    // TODO: encrypt above with friend's public key that we obtained
    // For now storing unencrypted message
    const final_message = hello_message;
    const file_path = '/root_folder/' + friend_peerID + '/hello.txt';

    flag = false;
    await node.files.write(file_path, final_message, { create: true }).catch((err) => {
        // This error should never be encountered
        console.log('Unable to write hello message to file! Cannot add friend.');
        console.log(err)
        flag = true;
    });

    if (flag) return false;

    // Now add friend multiaddr to our /root_folder/friends_list.txt
    const friendsListPath = '/root_folder/friends_list.txt';

    let str = (await node.files.read(friendsListPath)).toString('utf8');
    str = str + '/p2p-circuit/ipfs/' + friend_peerID + '\n';

    await node.files.rm('/root_folder/friends_list.txt');  // Not reqd
    await node.files.write('/root_folder/friends_list.txt', Buffer.from(str));
    console.log('Successfully updated friends list file!');

    // Update root folder hash in the DB
    await updateDB(node, db);
    
    return true;
}

// Search in a peer's directory for your records. Run the create_friend_directory first,
// so that the peer has been added to your bootstrap list and you are connected to them.
async function searchPeerDirectory(node, db, peer_peerID, multiaddr) {

    // Check if the peer is already a friend.
    let peer_address = '/p2p-circuit/ipfs/' + peer_peerID;
    const bootstrap_list = await node.bootstrap.list()
    for (var p2p_circuit_addr in bootstrap_list) {

        if (p2p_circuit_addr == peer_address) {
            console.log('This peer is already your friend!');
            return false;
        }
    }

    // Getting our peerID
    const nodeDetails = await Promise.resolve(node.id());
    const myPeerId = nodeDetails.id;

    // Querying database for this peer's root folder hash
    const profile = await db.get(peer_peerID)

    if (!(profile && profile.length)) 
    {   
        console.log('Could not find friend\'s details in orbit DB. Cannot add friend!');
        return false;
    }

    // First add friend to bootstrap list
    const friend_address = profile['0']['address']

    await node.bootstrap.add(friend_address)
    console.log ("Added friend to bootstrap list!");

    const root_hash = profile['0']['root_hash']

    // Full IPFS path of the hello message
    const helloMessagePath = '/ipfs/' + root_hash + '/' + myPeerId + '/hello.txt';

    // Read the contents of the Hello message, if it exists.
    let flag = false;
    
    const secretMessage = (await node.files.read(helloMessagePath)).toString('utf8')
        .catch((err) => {
            console.log('Either\n1. the peer node isn\'t online')
            console.log('2. Peer node is online but you are not connected to them')
            console.log('3. Peer node has not set up their root folder')
            console.log('4. The peer node has not created the directory for you')
            flag = true;
        });

    if (flag) {
        const addr = multiaddr(friend_address);
        await ipfs.bootstrap.rm (addr);
        console.log ("Removed friend from bootstrap list!");
        return false;
    }
    
    // The secretMessage should contain the shared-secret encrypted with my public key.
    // TODO: decrypt this secret message using my private key. Then store this shared-secret
    // in the keystore

    console.log(secretMessage);
    
    await updateDB(node, db);

    return true;
}

async function writePersonalPost (node, db, friend_peer_id, friend_post_content, friend_post_filename) {

    await node.files.mkdir('/root_folder/' + friend_peer_id).catch((err) => {
        console.log("Directory for this friend has already been created!");
    });

    await node.files.mkdir('/root_folder/' + friend_peer_id + '/personal_post');

    // Write the post. TODO: move to utils
    let flag = false;
    const file_path = '/root_folder/' + friend_peer_id + '/personal_post/' + friend_post_filename + '.txt';
    await node.files.write(file_path, Buffer.from(friend_post_content), { create: true }).catch((err) => {

        alert('Unable to create personal post to friend!' + err);
        flag = true;

    });

    if (flag) return;

    // Update root folder hash in the DB
    await updateDB(node, db);

    alert("Personal post has been written");

}

module.exports.updateDB = updateDB;
module.exports.addDataToPublicProfile = addDataToPublicProfile;
module.exports.createFriendDirectory = createFriendDirectory;
module.exports.searchPeerDirectory = searchPeerDirectory;
module.exports.writePersonalPost = writePersonalPost;