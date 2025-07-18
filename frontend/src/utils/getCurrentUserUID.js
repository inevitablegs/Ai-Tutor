// utils/getCurrentUserUID.js
import { getAuth, onAuthStateChanged } from "firebase/auth";

export const getCurrentUserUID = () => {
  return new Promise((resolve, reject) => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe(); // Stop listening after first result
        if (user) {
          resolve(user.uid);
        } else {
          reject("No user is currently signed in.");
        }
      },
      (error) => {
        reject(error);
      }
    );
  });
};
