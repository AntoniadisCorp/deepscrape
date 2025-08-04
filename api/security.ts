import serviceAccount from "functions/src/credentials.json"
import * as admin from "firebase-admin"


// if (process.env["PRODUCTION"] === "true") {


//     const dbName = serviceAccount.dbName
//     // Initialize Firebase
//     admin.initializeApp(serviceAccount.firebaseConfig)

//     const db = admin.firestore()
//     db.settings({ databaseId: dbName })

//     const auth = admin.auth()
// }


// export { auth, db, dbName }