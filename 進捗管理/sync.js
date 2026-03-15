const config = window.FLOWLOG_FIREBASE ?? {};

async function createSyncClient() {
  if (!config.enabled || !config.firebaseConfig?.projectId || !config.appId) {
    return createDisabledClient();
  }

  const [{ initializeApp }, { getFirestore, doc, getDoc, setDoc, onSnapshot, serverTimestamp }] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"),
  ]);

  const app = initializeApp(config.firebaseConfig);
  const db = getFirestore(app);
  const docRef = doc(db, "flowlogWorkspaces", config.appId);

  return {
    enabled: true,
    async load() {
      const snapshot = await getDoc(docRef);
      return snapshot.exists() ? snapshot.data().state ?? null : null;
    },
    async save(state) {
      await setDoc(docRef, {
        state,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    },
    subscribe(callback) {
      return onSnapshot(docRef, (snapshot) => {
        if (!snapshot.exists()) return;
        callback(snapshot.data().state ?? null);
      });
    },
  };
}

function createDisabledClient() {
  return {
    enabled: false,
    async load() {
      return null;
    },
    async save() {
      return null;
    },
    subscribe() {
      return () => {};
    },
  };
}

window.FlowlogSyncReady = createSyncClient()
  .then((client) => {
    window.FlowlogSync = client;
    return client;
  })
  .catch(() => {
    const fallback = createDisabledClient();
    window.FlowlogSync = fallback;
    return fallback;
  });
