const fs = require('fs');

const NHOST_URL = "https://enujaixwndxgwbvogcom.hasura.ap-southeast-1.nhost.run/v1/graphql";
const ADMIN_SECRET = "z9C3QmbOb@dXd+:VJ5Q7R*D,^rb@SyM&";

async function testQuery(query) {
    const res = await fetch(NHOST_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-hasura-admin-secret": ADMIN_SECRET,
        },
        body: JSON.stringify({ query }),
    });
    return await res.json();
}

async function run() {
    console.log("Testing relationship names...");
    
    // Testing multiple common naming patterns in Hasura
    const queries = [
        "query { decks(limit:1) { my_vocabularies_aggregate { aggregate { count } } } }",
        "query { decks(limit:1) { vocabularies_aggregate { aggregate { count } } } }",
        "query { decks(limit:1) { my_vocabulary_aggregate { aggregate { count } } } }",
        "query { decks(limit:1) { my_vocabularies { id } } }",
        "query { __type(name: \"decks\") { name fields { name } } }"
    ];

    for (const q of queries) {
        console.log(`\nTesting: ${q}`);
        const result = await testQuery(q);
        if (result.errors) {
            console.log("❌ Error:", result.errors[0].message);
            // If it's the __type query, show fields to help debug
            if (q.includes("__type")) {
                 console.log(JSON.stringify(result, null, 2));
            }
        } else {
            console.log("✅ Success!");
            console.log(JSON.stringify(result.data, null, 2));
            break;
        }
    }
}

run();
