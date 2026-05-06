
const NHOST_URL = "https://tin-voca.nhost.run/v1/graphql";
const ADMIN_SECRET = "8f192b67f139589d89269d04260a931c";

async function check() {
  const q = `query { __type(name: "my_vocabulary") { name fields { name } } }`;
  const res = await fetch(NHOST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hasura-admin-secret': ADMIN_SECRET },
    body: JSON.stringify({ query: q })
  });
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}
check();
