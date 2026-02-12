<script lang="ts">
    import { onMount } from "svelte";
    import { pb, currentUser } from "$lib/pb";
    import { goto } from "$app/navigation";

    let rooms: any[] = [];
    let newRoomName = "";
    let isCreating = false;

    onMount(async () => {
        if (!pb.authStore.isValid) {
            goto("/signin");
            return;
        }

        await fetchRooms();
    });

    async function fetchRooms() {
        try {
            const records = await pb.collection("chatrooms").getList(1, 50, {
                sort: "-created",
                expand: "owner",
            });
            rooms = records.items;
        } catch (e) {
            console.error("Error fetching rooms:", e);
        }
    }

    async function createRoom() {
        if (!newRoomName.trim()) return;
        isCreating = true;

        try {
            const data = {
                name: newRoomName,
                owner: $currentUser?.id,
                // members: [$currentUser?.id] // Optional: add creator to members immediately
            };

            const record = await pb.collection("chatrooms").create(data);
            newRoomName = "";
            await fetchRooms(); // Refresh list
        } catch (e) {
            console.error("Error creating room:", e);
            alert("Failed to create room");
        } finally {
            isCreating = false;
        }
    }

    function logout() {
        pb.authStore.clear();
        goto("/signin");
    }
</script>

<div class="container">
    <header>
        <h1>Chat Rooms</h1>
        <div class="user-controls">
            <span>Welcome, {$currentUser?.username || $currentUser?.email}</span
            >
            <button class="secondary" on:click={logout}>Logout</button>
        </div>
    </header>

    <div class="create-room">
        <h2>Create New Room</h2>
        <div class="input-group">
            <input
                type="text"
                placeholder="Room Name"
                bind:value={newRoomName}
                on:keydown={(e) => e.key === "Enter" && createRoom()}
            />
            <button
                on:click={createRoom}
                disabled={isCreating || !newRoomName.trim()}
            >
                {isCreating ? "Creating..." : "Create"}
            </button>
        </div>
    </div>

    <div class="room-list">
        <h2>Available Rooms</h2>
        {#if rooms.length === 0}
            <p class="empty">No rooms created yet.</p>
        {:else}
            <div class="grid">
                {#each rooms as room}
                    <a href="/room/{room.id}" class="card">
                        <h3>{room.name}</h3>
                        <p class="meta">
                            Created by: {room.expand?.owner?.username ||
                                "Unknown"}
                        </p>
                        <p class="id">ID: {room.id}</p>
                    </a>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            Helvetica, Arial, sans-serif;
    }

    header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        border-bottom: 1px solid #eee;
        padding-bottom: 1rem;
    }

    h1 {
        margin: 0;
    }

    .user-controls {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    button {
        padding: 0.5rem 1rem;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    button.secondary {
        background-color: #6c757d;
    }

    button:disabled {
        background-color: #ccc;
    }

    .create-room {
        background: #f8f9fa;
        padding: 1.5rem;
        border-radius: 8px;
        margin-bottom: 2rem;
    }

    .input-group {
        display: flex;
        gap: 0.5rem;
        max-width: 500px;
    }

    input {
        flex: 1;
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 4px;
    }

    .room-list .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 1rem;
    }

    .card {
        display: block;
        padding: 1rem;
        border: 1px solid #ddd;
        border-radius: 8px;
        text-decoration: none;
        color: inherit;
        transition:
            transform 0.2s,
            box-shadow 0.2s;
        background: white;
    }

    .card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        border-color: #007bff;
    }

    .card h3 {
        margin: 0 0 0.5rem 0;
        color: #007bff;
    }

    .meta {
        font-size: 0.85rem;
        color: #666;
        margin: 0;
    }

    .id {
        font-size: 0.75rem;
        color: #999;
        margin-top: 0.5rem;
        font-family: monospace;
    }

    .empty {
        color: #777;
        font-style: italic;
    }
</style>
