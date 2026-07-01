export const signInWithEmailAndPassword = jest.fn();
export const createUserWithEmailAndPassword = jest.fn();
export const signInWithCredential = jest.fn();
export const signOut = jest.fn();
export const onAuthStateChanged = jest.fn(() => jest.fn());
export const GoogleAuthProvider = { credential: jest.fn() };
export const getAuth = jest.fn(() => ({}));
