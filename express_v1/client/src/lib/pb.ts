
import PocketBase from 'pocketbase';
import { writable } from 'svelte/store';

// Assuming PocketBase is running locally on the default port
export const pb = new PocketBase('http://127.0.0.1:8090');

// Create a reactive store for the current user
export const currentUser = writable(pb.authStore.record);

// Subscribe to auth changes to update the store
pb.authStore.onChange((auth) => {
    console.log('authStore changed', auth);
    currentUser.set(pb.authStore.model);
});
