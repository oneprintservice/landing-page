/* OnePrint shared Firebase bootstrap. Loaded before page logic. */
(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyBcyS36JnJNGZPdSxd_g9UmCq4BJRiG2rA",
    authDomain: "oneprintservice-db.firebaseapp.com",
    databaseURL: "https://oneprintservice-db-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "oneprintservice-db",
    storageBucket: "oneprintservice-db.firebasestorage.app",
    messagingSenderId: "330853999249",
    appId: "1:330853999249:web:4503ed115d2694d9cb5530"
  };
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  window.auth = firebase.auth();
  window.db = firebase.database();
  window.onePrintFirebaseConfig = firebaseConfig;
})();
