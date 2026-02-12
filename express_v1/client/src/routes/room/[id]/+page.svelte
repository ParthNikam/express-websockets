<script lang="ts">
    import { page } from "$app/stores";
    import { onMount, onDestroy } from "svelte";
    import { pb, currentUser } from "$lib/pb";
    import { goto } from "$app/navigation";

    let socket: WebSocket;
    let messages: {
        sender: string;
        senderId: string;
        content: string;
        timestamp: Date;
    }[] = [];
    let composedMessage = "";
    let roomId = "";
    let roomName = "";

    $: roomId = $page.params.id;

    // Check if user is logged in
    $: if (!$currentUser) {
        goto("/signin");
    }

    onMount(() => {
        let cleanup: (() => void) | undefined;

        const init = async () => {
            if (!$currentUser) return; // Wait for redirect if not logged in

            // 1. Fetch Room Details
            try {
                const room = await pb.collection("chatrooms").getOne(roomId);
                roomName = room.name;
            } catch (e) {
                console.error("Error fetching room:", e);
            }

            // 2. Fetch Message History
            try {
                const history = await pb
                    .collection("all_messages")
                    .getList(1, 50, {
                        filter: `roomId = "${roomId}"`,
                        sort: "created",
                        expand: "senderId",
                    });

                messages = history.items.map((m) => ({
                    sender:
                        m.expand?.senderId?.username ||
                        m.expand?.senderId?.email ||
                        "Unknown",
                    senderId: m.senderId, // Store sender ID
                    content: m.message,
                    timestamp: new Date(m.created),
                }));
            } catch (e) {
                console.error("Error fetching history:", e);
            }

            // 3. Connect to WebSocket server
            socket = new WebSocket("ws://localhost:8080");

            socket.onopen = () => {
                console.log("Connected to WebSocket server");
                // Join the room
                if ($currentUser) {
                    socket.send(
                        JSON.stringify({
                            type: "join",
                            roomId: roomId,
                            userId: $currentUser.id,
                            username:
                                $currentUser.username || $currentUser.email,
                        }),
                    );
                }
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log("data", data);
                    if (data.type === "message") {
                        messages = [
                            ...messages,
                            {
                                sender: data.sender || "Unknown",
                                senderId: data.senderId, // Use senderId from WS
                                content: data.content,
                                timestamp: new Date(),
                            },
                        ];
                    } else if (data.type === "system") {
                        messages = [
                            ...messages,
                            {
                                sender: "System",
                                senderId: "system",
                                content: data.content,
                                timestamp: new Date(),
                            },
                        ];
                    }
                } catch (e) {
                    console.error("Error parsing message:", e);
                }
            };

            socket.onclose = () => {
                console.log("Disconnected from WebSocket server");
            };

            cleanup = () => {
                if (socket) {
                    socket.close();
                }
            };
        };

        if ($currentUser) {
            // Only init if logged in, though the redirect inside script should handle it, this is safe
            init();
        }

        return () => {
            if (cleanup) cleanup();
        };
    });

    onDestroy(() => {
        // managed by onMount cleanup mainly, but safe to keep
    });
    // ... (sendMessage function remains largely the same but ensure correct logic if needed) ...
    // skipping sendMessage as logic is fine, will just replace this block.

    // Correcting the message display logic in template
    // Check line 199 and CSS line 334

    // Since I can't easily jump to the template part without context, I'll assume the replacement tool can handle the large block or I'll split it.
    // I'll update the script logic first.

    // wait, I must replace the whole block or target specifically.
    // Let's do the script variable declaration and onMount logic first.

    async function sendMessage() {
        if (
            !composedMessage.trim() ||
            !socket ||
            socket.readyState !== WebSocket.OPEN ||
            !$currentUser
        )
            return;

        const content = composedMessage;
        composedMessage = ""; // Clear early or on success

        try {
            // 1. Save to PocketBase (Authenticated)
            await pb.collection("all_messages").create({
                message: content,
                roomId: roomId,
                senderId: $currentUser.id,
            });

            // 2. Broadcast via WebSocket
            const messagePayload = {
                type: "message",
                roomId: roomId,
                content: content,
                senderId: $currentUser.id,
                senderName: $currentUser.username || $currentUser.email,
            };

            socket.send(JSON.stringify(messagePayload));
        } catch (e) {
            console.error("Error sending message:", e);
            alert("Failed to send message. Please try again.");
            composedMessage = content;
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }
</script>

<div class="chat-container">
    <header class="chat-header">
        <h2>{roomName || "Room: " + roomId}</h2>
        <div class="user-info">
            <span
                >Logged in as: {$currentUser?.username ||
                    $currentUser?.email}</span
            >
            <button
                class="logout-btn"
                on:click={() => {
                    pb.authStore.clear();
                    goto("/signin");
                }}>Logout</button
            >
            <a href="/" class="back-btn">Back to Rooms</a>
        </div>
    </header>

    <div class="messages-area">
        {#each messages as msg}
            <div
                class={`message ${msg.senderId === $currentUser?.id ? "sent" : "received"}`}
            >
                <div class="message-content">
                    <span class="sender">{msg.sender}</span>
                    <p>{msg.content}</p>
                    <span class="timestamp"
                        >{msg.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}</span
                    >
                </div>
            </div>
        {/each}
        {#if messages.length === 0}
            <div class="empty-state">
                No messages yet. Start the conversation!
            </div>
        {/if}
    </div>

    <div class="input-area">
        <textarea
            bind:value={composedMessage}
            placeholder="Type a message..."
            on:keydown={handleKeydown}
        ></textarea>
        <button on:click={sendMessage} disabled={!composedMessage.trim()}
            >Send</button
        >
    </div>
</div>

<style>
    /* ... (Same styles as before, maybe add back-btn style) ... */
    .chat-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        max-width: 800px;
        margin: 0 auto;
        background-color: #f9f9f9;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            Helvetica, Arial, sans-serif;
    }

    .chat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background-color: #fff;
        border-bottom: 1px solid #ddd;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .chat-header h2 {
        margin: 0;
        font-size: 1.25rem;
    }

    .user-info {
        display: flex;
        align-items: center;
        gap: 1rem;
        font-size: 0.9rem;
        color: #666;
    }

    .logout-btn,
    .back-btn {
        background: none;
        border: 1px solid #ddd;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.8rem;
        text-decoration: none;
        color: inherit;
    }

    .logout-btn:hover,
    .back-btn:hover {
        background-color: #f0f0f0;
    }

    .messages-area {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .message {
        display: flex;
        max-width: 70%;
    }

    .message.sent {
        align-self: flex-end;
    }

    .message.received {
        align-self: flex-start;
    }

    .message-content {
        padding: 0.75rem;
        border-radius: 8px;
        position: relative;
        word-wrap: break-word;
    }

    .message.sent .message-content {
        background-color: #007bff;
        color: white;
        border-bottom-right-radius: 2px;
    }

    .message.received .message-content {
        background-color: #fff;
        border: 1px solid #eee;
        border-bottom-left-radius: 2px;
    }

    .sender {
        font-size: 0.75rem;
        opacity: 0.8;
        display: block;
        margin-bottom: 0.25rem;
        font-weight: bold;
    }

    .timestamp {
        font-size: 0.7rem;
        opacity: 0.7;
        display: block;
        text-align: right;
        margin-top: 0.25rem;
    }

    .empty-state {
        text-align: center;
        color: #aaa;
        margin-top: 2rem;
    }

    .input-area {
        padding: 1rem;
        background-color: #fff;
        border-top: 1px solid #ddd;
        display: flex;
        gap: 0.5rem;
    }

    textarea {
        flex: 1;
        padding: 0.75rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        resize: none;
        height: 50px;
        font-family: inherit;
    }

    button {
        padding: 0 1.5rem;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
    }

    button:disabled {
        background-color: #ccc;
        cursor: not-allowed;
    }

    button:hover:not(:disabled) {
        background-color: #0056b3;
    }
</style>
